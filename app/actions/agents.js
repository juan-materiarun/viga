'use server';

import { chromium } from 'playwright';
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Función auxiliar para conectar el navegador según el entorno
async function getBrowserInstance() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  if (isProd) {
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
    if (!BROWSERLESS_TOKEN) throw new Error("Falta BROWSERLESS_TOKEN en variables de entorno");
    // Conectamos a la nube
    return await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`);
  } else {
    // Usamos tu PC (con ventana visible)
    return await chromium.launch({ headless: false });
  }
}

// --- FUNCIÓN 1: EL ARQUITECTO ---
export async function getMissionPlan(url) {
  let browser;
  try {
    browser = await getBrowserInstance();
    const page = await browser.newPage();
    
    // Navegación con timeout prudente para Vercel
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
    
    const pageContext = await page.evaluate(() => {
      const guideTexts = Array.from(document.querySelectorAll('h1, h2, p, label, span'))
        .map(el => el.innerText.trim()).filter(t => t.length > 5).slice(0, 10).join(' | ');
      const elements = Array.from(document.querySelectorAll('button, a, input'))
        .map(el => ({ 
          tag: el.tagName, 
          text: (el.innerText || el.placeholder || el.name || '').substring(0, 30) 
        })).slice(0, 25);
      return { guideTexts, elements };
    });

    const architectResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Sos un Senior QA Lead. Generá 3 misiones (happy, negative, edge) en JSON." },
        { role: "user", content: `Contexto: ${pageContext.guideTexts}. Elementos: ${JSON.stringify(pageContext.elements)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    await browser.close();
    return { 
      success: true, 
      plan: JSON.parse(architectResponse.choices[0].message.content).tests,
      pageContext 
    };
  } catch (e) {
    if (browser) await browser.close();
    console.error("Error en Arquitecto:", e.message);
    return { success: false, error: e.message };
  }
}

// --- FUNCIÓN 2: EL ESTRATEGA ---
export async function executeSingleTest(url, test, pageContext) {
  let browser;
  try {
    browser = await getBrowserInstance();
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });

    const strategyResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Sos el Estratega. Decidí la acción (click, type_and_enter, spam_click, back_and_forth)." },
        { role: "user", content: `Objetivo: ${test.objective}. Elementos: ${JSON.stringify(pageContext.elements)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const strat = JSON.parse(strategyResponse.choices[0].message.content);
    let status = "success";
    let errorSnapshot = null;

    try {
      if (strat.action === "type_and_enter") {
        await page.fill('input', strat.value || "test@viga.ai");
        await page.keyboard.press('Enter');
      } else if (strat.action === "spam_click") {
        for(let i=0; i<3; i++) await page.click(`text="${strat.selector}"`, { delay: 100 });
      } else {
        // Selector robusto basado en texto
        await page.click(`text="${strat.selector}"`, { timeout: 7000 });
      }
      await page.waitForTimeout(2000);
    } catch (e) {
      status = "failed";
      console.log("Fallo en ejecución táctica:", e.message);
    }

    await browser.close();
    return { ...test, status, evidence: errorSnapshot, decidedValue: strat.value };
  } catch (e) {
    if (browser) await browser.close();
    return { ...test, status: "failed", error: e.message };
  }
}
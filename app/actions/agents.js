'use server';

import { chromium } from 'playwright';
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// --- FUNCIÓN 1: EL ARQUITECTO (Solo planea las misiones) ---
export async function getMissionPlan(url) {
  let browser;
  try {
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
    browser = await chromium.launch({ headless: true }); // Headless para velocidad en el scan
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const pageContext = await page.evaluate(() => {
      const guideTexts = Array.from(document.querySelectorAll('h1, h2, p, label, span'))
        .map(el => el.innerText.trim()).filter(t => t.length > 10).slice(0, 10).join(' | ');
      const elements = Array.from(document.querySelectorAll('button, a, input'))
        .map(el => ({ tag: el.tagName, text: (el.innerText || el.placeholder || '').substring(0, 30) }))
        .slice(0, 25);
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
      pageContext // Lo devolvemos para pasárselo al ejecutor
    };
  } catch (e) {
    if (browser) await browser.close();
    return { success: false, error: e.message };
  }
}

// --- FUNCIÓN 2: EL ESTRATEGA (Ejecuta un SOLO test) ---
export async function executeSingleTest(url, test, pageContext) {
  let browser;
  try {
    const isProd = process.env.NODE_ENV === 'production';
    
    // Si estás en Vercel, conectamos a Browserless. Si no, local.
    if (isProd) {
      const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
      browser = await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`);
    } else {
      browser = await chromium.launch({ headless: false });
    }

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle' });

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
        await page.click(`text="${strat.selector}"`, { timeout: 5000 });
      }
      await page.waitForTimeout(2000);
    } catch (e) {
      status = "failed";
      const fileName = `error-${Date.now()}.png`;
      errorSnapshot = `missions/errors/${fileName}`;
      await page.screenshot({ path: `public/${errorSnapshot}` });
    }

    await browser.close();
    return { ...test, status, evidence: errorSnapshot, decidedValue: strat.value };
  } catch (e) {
    if (browser) await browser.close();
    return { ...test, status: "failed", error: e.message };
  }
}
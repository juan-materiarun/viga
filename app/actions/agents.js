'use server';

import { chromium } from 'playwright';
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Helper para conexión de navegador (Local o Nube)
async function getBrowserInstance() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  
  if (isProd) {
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
    if (!BROWSERLESS_TOKEN) throw new Error("Missing BROWSERLESS_TOKEN");
    return await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`);
  } else {
    // En local abre ventana para que veas qué hace
    return await chromium.launch({ headless: false });
  }
}

// --- FUNCIÓN 1: EL ARQUITECTO (Estructura Blindada) ---
export async function getMissionPlan(url) {
  let browser;
  try {
    browser = await getBrowserInstance();
    const page = await browser.newPage();
    
    // Mercado Libre y similares tardan en cargar, damos 30s
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    
    const pageContext = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('h1, h2, label, span'))
        .map(el => el.innerText.trim()).filter(t => t.length > 5).slice(0, 10).join(' | ');
      const elements = Array.from(document.querySelectorAll('button, a, input'))
        .map(el => ({ 
          tag: el.tagName, 
          text: (el.innerText || el.placeholder || el.name || '').substring(0, 30) 
        })).slice(0, 25);
      return { texts, elements };
    });

    const architectResponse = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: `Sos un Senior QA Lead. Tu salida DEBE ser un JSON ESTRICTO.
          Estructura:
          {
            "tests": [
              {
                "id": "1",
                "title": "Nombre de la misión",
                "objective": "Qué probar exactamente",
                "type": "happy"
              }
            ]
          }
          Tipos: happy, negative, edge. No incluyas pasos detallados ni explicaciones.` 
        },
        { 
          role: "user", 
          content: `Contexto: ${pageContext.texts}. Elementos: ${JSON.stringify(pageContext.elements)}` 
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    await browser.close();
    const parsed = JSON.parse(architectResponse.choices[0].message.content);
    
    return { 
      success: true, 
      plan: parsed.tests || [],
      pageContext 
    };
  } catch (e) {
    if (browser) await browser.close();
    console.error("Arquitecto Error:", e.message);
    return { success: false, error: e.message };
  }
}

// --- FUNCIÓN 2: EL ESTRATEGA (Ejecutor Atómico) ---
export async function executeSingleTest(url, test, pageContext) {
  let browser;
  try {
    browser = await getBrowserInstance();
    const page = await browser.newPage();
    
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    const strategyResponse = await groq.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "Sos el Estratega QA. Decidí la mejor acción (click, type_and_enter) y el selector basado en texto. Devolvé JSON: {\"action\": \"...\", \"selector\": \"...\", \"value\": \"...\", \"reasoning\": \"...\"}" 
        },
        { 
          role: "user", 
          content: `Objetivo: ${test.objective}. Elementos disponibles: ${JSON.stringify(pageContext.elements)}` 
        }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const strat = JSON.parse(strategyResponse.choices[0].message.content);
    let status = "success";

    try {
      if (strat.action === "type_and_enter") {
        // Buscamos inputs de búsqueda o genéricos
        const selector = strat.selector.toLowerCase();
        await page.fill(`input`, strat.value || "iPhone");
        await page.keyboard.press('Enter');
      } else {
        // Clic por texto (muy efectivo en Playwright)
        await page.click(`text="${strat.selector}"`, { timeout: 8000 });
      }
      
      // Esperamos un poco para ver el resultado
      await page.waitForTimeout(3000);
    } catch (e) {
      status = "failed";
      console.log("Error táctico:", e.message);
    }

    await browser.close();
    return { 
      ...test, 
      status, 
      reasoning: strat.reasoning, 
      decidedValue: strat.value || strat.selector 
    };
  } catch (e) {
    if (browser) await browser.close();
    return { ...test, status: "failed", error: e.message };
  }
}
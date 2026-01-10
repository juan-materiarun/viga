'use server';

import { chromium } from 'playwright';
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Asegura que la URL sea válida para Playwright
const fixUrl = (url) => {
  if (!url) return url;
  let clean = url.trim();
  return clean.startsWith('http') ? clean : `https://${clean}`;
};

async function getBrowserInstance() {
  const isProd = process.env.NODE_ENV === 'production' || process.env.VERCEL;
  if (isProd) {
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN;
    return await chromium.connectOverCDP(`wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`);
  }
  return await chromium.launch({ headless: false });
}

// --- FASE 1: ARQUITECTO ---
export async function getMissionPlan(url) {
  const targetUrl = fixUrl(url);
  let browser;
  try {
    browser = await getBrowserInstance();
    // Identidad humana para evitar bloqueos
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' });
    const page = await context.newPage();
    
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });
    
    const pageContext = await page.evaluate(() => {
      const texts = Array.from(document.querySelectorAll('h1, h2, label, span, button, a'))
        .map(el => el.innerText.trim()).filter(t => t.length > 2).slice(0, 30).join(' | ');
      const elements = Array.from(document.querySelectorAll('button, a, input'))
        .map(el => ({ 
          tag: el.tagName, 
          text: (el.innerText || el.placeholder || el.name || '').trim().substring(0, 40) 
        })).filter(e => e.text.length > 0).slice(0, 40);
      return { texts, elements };
    });

    const architectResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Sos un Senior QA Lead. Generá JSON: { \"tests\": [{ \"id\": \"1\", \"title\": \"...\", \"objective\": \"...\", \"type\": \"happy\" }] }" },
        { role: "user", content: `Contexto: ${pageContext.texts}. Elementos: ${JSON.stringify(pageContext.elements)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    await browser.close();
    return { success: true, plan: JSON.parse(architectResponse.choices[0].message.content).tests, pageContext };
  } catch (e) {
    if (browser) await browser.close();
    return { success: false, error: e.message };
  }
}

// --- FASE 2: ESTRATEGA (Con Self-Healing) ---
export async function executeSingleTest(url, test, pageContext) {
  const targetUrl = fixUrl(url);
  let browser;
  try {
    browser = await getBrowserInstance();
    const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' });
    const page = await context.newPage();
    
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 30000 });

    const strategyResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Sos el Estratega. Decidí acción (click, type_and_enter), selector (solo el texto), y value. JSON: {\"action\": \"...\", \"selector\": \"...\", \"value\": \"...\"}" },
        { role: "user", content: `Objetivo: ${test.objective}. Elementos: ${JSON.stringify(pageContext.elements)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const strat = JSON.parse(strategyResponse.choices[0].message.content);
    let status = "success";

    try {
      // 🟢 SELF-HEALING 1: Auto-cerrar popups de cookies
      const popups = ['Aceptar', 'Accept', 'Entendido', 'Cerrar', 'OK'];
      for (const p of popups) {
        const btn = page.getByText(p, { exact: false }).first();
        if (await btn.isVisible()) await btn.click().catch(() => {});
      }

      if (strat.action === "type_and_enter") {
        await page.fill('input', strat.value || "test");
        await page.keyboard.press('Enter');
      } else {
        // 🟢 SELF-HEALING 2: Búsqueda difusa (insensible a mayúsculas/espacios)
        const target = page.getByText(strat.selector, { exact: false }).first();
        await target.click({ timeout: 10000 });
      }
      await page.waitForTimeout(3000);
    } catch (e) {
      status = "failed";
      console.log("Auto-healing falló:", e.message);
    }

    await browser.close();
    return { ...test, status, decidedValue: strat.value || strat.selector };
  } catch (e) {
    if (browser) await browser.close();
    return { ...test, status: "failed", error: e.message };
  }
}
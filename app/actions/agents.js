'use server';

import { chromium } from 'playwright';
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function executeVigaMission(url) {
  let browser;
  try {
    console.log(`🚀 VIGA: Iniciando Mission Control en ${url}`);
    
    // Lanzamos navegador visible para ver a los agentes actuar en tu RTX 3050
    browser = await chromium.launch({ headless: false }); 
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await context.newPage();

    // --- FASE 1: RECONOCIMIENTO (SCANNING) ---
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    
    const domSummary = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('button, a, input, [role="button"]'))
        .map(el => ({
          tag: el.tagName,
          text: (el.innerText || el.placeholder || el.name || '').substring(0, 30),
          id: el.id,
          type: el.type || 'interactive'
        })).slice(0, 20);
    });

    // --- FASE 2: IA ARQUITECTO (DISEÑO DE MISIONES) ---
    const architectResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Sos el Arquitecto de VIGA Mission Control. Analizá los elementos y creá 3 misiones de prueba críticas para el flujo de usuario. Respondé SOLO JSON." },
        { role: "user", content: `URL: ${url}. Elementos: ${JSON.stringify(domSummary)}. Respondé: {"tests": [{"id": 1, "name": "...", "objective": "..."}]}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const missionPlan = JSON.parse(architectResponse.choices[0].message.content).tests;
    const executionResults = [];

    // --- FASE 3: EJECUCIÓN TÁCTICA Y EVIDENCIA ---
    for (const test of missionPlan) {
      console.log(`🛠️ Ejecutando Misión: ${test.name}`);
      
      const strategy = await groq.chat.completions.create({
        messages: [
          { role: "system", content: "Sos el Estratega de VIGA. Decidí qué botón o link cliquear para cumplir el objetivo." },
          { role: "user", content: `Objetivo: ${test.objective}. Elementos: ${JSON.stringify(domSummary)}. Respondé JSON: {"selector": "texto_exacto_del_elemento"}` }
        ],
        model: "llama-3.3-70b-versatile",
        response_format: { type: "json_object" },
      });

      const { selector } = JSON.parse(strategy.choices[0].message.content);

      let status = "success";
      let errorSnapshot = null;

      try {
        // Ejecución proactiva
        await page.click(`text="${selector}"`, { timeout: 5000 });
        await page.waitForTimeout(2000); 
      } catch (e) {
        status = "failed";
        // CAPTURA DE EVIDENCIA DE ERROR
        const fileName = `error-${test.id}-${Date.now()}.png`;
        errorSnapshot = `missions/errors/${fileName}`;
        await page.screenshot({ path: `public/${errorSnapshot}`, fullPage: true });
      }

      executionResults.push({
        id: test.id,
        title: test.name,
        status: status,
        detail: test.objective,
        evidence: errorSnapshot
      });
    }

    await browser.close();

    return {
      success: true,
      rawTests: executionResults
    };

  } catch (error) {
    if (browser) await browser.close();
    console.error("❌ Misión Abortada:", error);
    return { success: false, error: error.message };
  }
}
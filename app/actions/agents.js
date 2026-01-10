'use server';

import { chromium } from 'playwright';
import Groq from "groq-sdk";
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

// --- UTILIDADES ---
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
  return await chromium.launch({ 
    headless: false, 
    args: ['--start-maximized', '--window-size=1920,1080'] 
  });
}

// --- PERSISTENCIA ---
export async function createMissionRecord(url) {
  const { data, error } = await supabase
    .from('missions')
    .insert([{ url: fixUrl(url), status: 'running' }])
    .select().single();
  return data?.id;
}

export async function saveTestResult(missionId, result) {
  await supabase.from('test_results').insert([{
    mission_id: missionId,
    agent_type: result.agentType,
    title: result.title,
    objective: result.objective,
    status: result.status,
    reasoning: result.reasoning,
    decided_value: result.decidedValue,
    dna: result.dna,
    action: result.actionTaken?.action || 'click'
  }]);
}

export async function updateMissionStatus(missionId, status) {
  await supabase.from('missions').update({ status }).eq('id', missionId);
}

// --- FASE 1: DISCOVERY & E2E PLANNING ---
export async function getMissionPlan(url) {
  const targetUrl = fixUrl(url);
  let browser;
  try {
    browser = await getBrowserInstance();
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
    
    // EXPLORACIÓN: Scrolleo para disparar eventos y descubrir elementos ocultos
    await page.evaluate(async () => {
      window.scrollTo(0, document.body.scrollHeight / 2);
      await new Promise(r => setTimeout(r, 1000));
      window.scrollTo(0, 0);
    });

    const pageContext = await page.evaluate(() => {
      // Función para generar un selector más robusto que un tag pelado
      const getBestSelector = (el) => {
        if (el.id) return `#${el.id}`;
        if (el.name) return `[name="${el.name}"]`;
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        if (el.tagName === 'A' && el.getAttribute('href')) return `a[href="${el.getAttribute('href')}"]`;
        return null;
      };

      const items = Array.from(document.querySelectorAll('button, a, input, [role="button"], select'))
        .filter(el => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map(el => ({ 
          tag: el.tagName, 
          text: (el.innerText || el.placeholder || '').trim().substring(0, 40),
          suggestedSelector: getBestSelector(el),
          type: el.type || 'action'
        }));
      return { title: document.title, elements: items.slice(0, 80) }; // Mapeamos hasta 80 puntos
    });

    const architectResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `Eres VIGA-ENGINE (E2E Specialist). 
          Tu meta es el MAXIMUM COVERAGE de la interfaz. 
          Genera una lista exhaustiva de casos de prueba (mínimo 10) que cubran:
          1. 'ux': Navegación, menús y links.
          2. 'functional': Formularios, botones de envío y lógica de negocio.
          3. 'access': Interactivos críticos y estructura.
          
          Responde JSON: {"tests": [{"title", "objective", "agentType"}]}` 
        },
        { role: "user", content: `URL: ${targetUrl}. Interactivos detectados: ${JSON.stringify(pageContext.elements)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    await browser.close();
    const plan = JSON.parse(architectResponse.choices[0].message.content).tests;
    return { success: true, plan, pageContext };
  } catch (e) {
    if (browser) await browser.close();
    return { success: false, error: e.message };
  }
}

// --- FASE 2: EJECUCIÓN E2E CON PERSISTENCIA DE ADN ---
export async function executeSingleTest(url, test, pageContext) {
  const targetUrl = fixUrl(url);
  let browser;
  try {
    browser = await getBrowserInstance();
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto(targetUrl, { waitUntil: 'networkidle' });

    // Limpieza de Overlays para que no bloqueen los clicks del E2E
    await page.evaluate(() => {
      ['cookie', 'modal', 'banner', 'overlay'].forEach(term => {
        document.querySelectorAll(`[class*="${term}"], [id*="${term}"]`).forEach(el => el.remove());
      });
    });

    const strategyResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `Eres el Agente E2E de VIGA especializado en ${test.agentType}. 
          Tu objetivo es cumplir: ${test.objective}. 
          Analiza el mapa del DOM y decide el selector CSS exacto. 
          JSON: {"thinking": "...", "action": "click|type", "selector": "...", "value": "..."}` 
        },
        { role: "user", content: `Mapa del DOM: ${JSON.stringify(pageContext.elements)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const strat = JSON.parse(strategyResponse.choices[0].message.content);

    // CAPTURA DE ADN (Crucial para que el usuario pueda guardarlo en su Suite)
    let capturedDNA = null;
    try {
      capturedDNA = await page.$eval(strat.selector, el => ({
        tagName: el.tagName,
        fullHtml: el.outerHTML,
        id: el.id,
        className: el.className,
        text: el.innerText,
        attributes: Array.from(el.attributes).reduce((acc, attr) => ({...acc, [attr.name]: attr.value}), {})
      }));
    } catch (e) { console.warn("DNA extraction failed for selector:", strat.selector); }

    // ACCIÓN E2E
    if (strat.action === "type") {
      await page.fill(strat.selector, strat.value || "VIGA E2E Test");
      await page.keyboard.press('Enter');
    } else {
      await page.click(strat.selector, { timeout: 10000 });
    }

    await page.waitForTimeout(3000); 
    await browser.close();
    
    return { 
      ...test, 
      status: "success", 
      reasoning: strat.thinking, 
      decidedValue: strat.value || strat.selector,
      dna: capturedDNA,
      actionTaken: strat 
    };

  } catch (e) {
    if (browser) await browser.close();
    return { ...test, status: "failed", error: e.message };
  }
}
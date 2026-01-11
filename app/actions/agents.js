'use server';

import { chromium } from 'playwright';
import Groq from "groq-sdk";
import { createClient } from '@supabase/supabase-js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
);

// Helper para limpiar URLs
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
    headless: true, 
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] 
  });
}

// --- EXPORTACIONES ---

export async function createMissionRecord(url) {
  const { data } = await supabase
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

export async function getMissionPlan(url) {
  const targetUrl = fixUrl(url);
  let browser;
  try {
    browser = await getBrowserInstance();
    const context = await browser.newContext({ 
      viewport: { width: 1280, height: 800 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();
    
    await page.route('**/*.{png,jpg,jpeg,gif,svg,css,woff2}', (route) => route.abort());
    await page.goto(targetUrl, { waitUntil: 'commit', timeout: 35000 });
    await page.waitForTimeout(3000); 

    const pageContext = await page.evaluate(() => {
      const getSelector = (el) => {
        if (el.id) return `#${el.id}`;
        if (el.getAttribute('data-testid')) return `[data-testid="${el.getAttribute('data-testid')}"]`;
        const text = el.innerText?.trim();
        if (text && text.length < 25) return `text="${text}"`;
        return null;
      };

      return {
        title: document.title,
        elements: Array.from(document.querySelectorAll('button, a, input, [role="button"]'))
          .filter(el => {
            const r = el.getBoundingClientRect();
            return r.width > 0 && r.height > 0;
          })
          .slice(0, 40)
          .map(el => ({ 
            tag: el.tagName, 
            text: (el.innerText || el.placeholder || '').trim().substring(0, 40),
            suggestedSelector: getSelector(el),
          }))
      };
    });

    const architectResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: "Eres VIGA-ENGINE. Genera un plan de 6 tests JSON: {\"tests\": [{\"title\", \"objective\", \"agentType\"}]}" },
        { role: "user", content: `Analiza: ${targetUrl}. Elementos: ${JSON.stringify(pageContext.elements)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const plan = JSON.parse(architectResponse.choices[0].message.content).tests;
    return { success: true, plan, pageContext };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    if (browser) await browser.close();
  }
}

export async function executeSingleTest(url, test, pageContext) {
  const targetUrl = fixUrl(url);
  let browser;
  try {
    browser = await getBrowserInstance();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.route('**/*.{png,jpg,jpeg,gif,svg,css,woff2}', (route) => route.abort());
    await page.goto(targetUrl, { waitUntil: 'commit', timeout: 30000 });
    await page.waitForTimeout(2000); 

    const strategyResponse = await groq.chat.completions.create({
      messages: [
        { role: "system", content: `Agente QA: ${test.agentType}. Objetivo: ${test.objective}. Responde JSON: {"thinking", "action", "selector", "value"}` },
        { role: "user", content: `Contexto: ${JSON.stringify(pageContext.elements)}` }
      ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const strat = JSON.parse(strategyResponse.choices[0].message.content);
    let capturedDNA = null;

    try {
      const locator = page.locator(strat.selector).first();
      await locator.waitFor({ timeout: 6000 });
      
      capturedDNA = await locator.evaluate((el) => ({
        tagName: el.tagName,
        fullHtml: el.outerHTML,
        text: el.innerText
      }));

      if (strat.action === "type") {
        await locator.fill(strat.value || "VIGA Test");
      } else {
        await locator.click();
      }
    } catch (e) { 
      return { ...test, status: "failed", reasoning: `Elemento no hallado: ${strat.selector}`, success: false };
    }

    return { 
      ...test, 
      status: "success", 
      reasoning: strat.thinking, 
      decidedValue: strat.value || strat.selector,
      dna: capturedDNA,
      actionTaken: strat,
      success: true
    };
  } catch (e) {
    return { ...test, status: "failed", reasoning: e.message, success: false };
  } finally {
    if (browser) await browser.close();
  }
}
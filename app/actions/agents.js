'use server';

import { chromium } from 'playwright';
import Groq from "groq-sdk";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- PROMPTS ---
const getSystemPrompt = (type, mode, goal) => {
  return `Eres un AGENTE DE PRUEBAS especializado en ${type.toUpperCase()}. 
  OBJETIVO ACTUAL: "${goal}".
  Si el elemento es un input o buscador, USA 'type'. Si es un botón clave, USA 'click'.
  RESPUESTA JSON ESTRICTA: {"caseTitle": "string", "action": "click|type|none", "reason": "string", "finished": boolean}`;
};

// --- UTILIDADES ---
async function getWebSnapshot(page) {
  return await page.evaluate(() => ({
    url: window.location.href,
    text: document.body.innerText.substring(0, 1000),
  }));
}

async function uploadEvidenteToStorage(page, suiteId, stepName) {
  try {
    const buffer = await page.screenshot({ fullPage: false });
    const fileName = `${suiteId}/${Date.now()}-${stepName.replace(/\s+/g, '_')}.png`;
    const { error } = await supabase.storage.from('viga-evidence').upload(fileName, buffer, { contentType: 'image/png' });
    if (error) throw error;
    const { data: publicUrl } = supabase.storage.from('viga-evidence').getPublicUrl(fileName);
    return publicUrl.publicUrl;
  } catch (err) { return null; }
}

async function reportStep(suiteId, name, action, status, agent, screenshotUrl = null) {
  await supabase.from('test_steps').insert([{
    suite_id: suiteId,
    action_type: agent,
    selector: name,
    expected_result: action,
    status: status,
    screenshot_url: screenshotUrl,
    error_message: status === 'failed' ? action : null
  }]);
}

// --- FASE 1: SCOUT (DEEP SCAN) ---
async function runScoutMapping(page, suiteId) {
  await page.mouse.wheel(0, 500);
  await page.waitForTimeout(1000);
  await page.mouse.wheel(0, -500);
  await page.waitForTimeout(2000);

  const elements = await page.evaluate(() => {
    const interactive = 'a, button, input, [role="button"], select, textarea, [type="search"], .nav-search-input';
    return Array.from(document.querySelectorAll(interactive))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.width > 0 && window.getComputedStyle(el).display !== 'none';
      })
      .map((el, index) => ({
        selector: el.id ? `#${el.id}` : 
                  el.getAttribute('name') ? `${el.tagName.toLowerCase()}[name="${el.getAttribute('name')}"]` :
                  el.tagName.toLowerCase() + (el.className ? '.' + el.className.trim().split(/\s+/)[0] : ''),
        text: (el.innerText || el.getAttribute('aria-label') || el.placeholder || el.value || 'Elemento').trim().substring(0, 50),
        tag_name: el.tagName,
        area: el.closest('header') || el.closest('nav') ? 'header' : 'main',
        index: index
      }));
  });

  if (elements.length > 0) {
    await supabase.from('discovered_elements').delete().eq('suite_id', suiteId);
    await supabase.from('discovered_elements').insert(elements.map(el => ({
      suite_id: suiteId, selector: el.selector, tag_name: el.tag_name,
      status: 'pending', priority: false, text: el.text, area: el.area, step_order: el.index
    })));
  }
  await reportStep(suiteId, "SISTEMA 🛰️", `Encontrados ${elements.length} elementos.`, 'success', 'system');
}

// --- FASE 2: ESTRATEGA ---
async function generateTargetedPlan(suiteId, goal, apiKey) {
  const { data: elements } = await supabase.from('discovered_elements').select('*').eq('suite_id', suiteId);
  if (!elements?.length) return;

  // Priorización manual antes de la IA para asegurar que el buscador entre en los 80 permitidos
  const prioritized = elements.sort((a, b) => {
    const k = ['search', 'buscar', 'input', 'q'];
    const score = (el) => k.reduce((s, word) => s + (el.selector.toLowerCase().includes(word) ? 10 : 0), 0);
    return score(b) - score(a);
  }).slice(0, 80);

  const systemPrompt = `Eres el GENERAL DE ESTRATEGIA. Objetivo: "${goal}". 
  Responde JSON con los IDs de elementos para atacar: {"selectedIds": [number]}`;

  try {
    const plan = await callAI({ systemPrompt, userContent: JSON.stringify(prioritized), apiKey });
    if (plan.selectedIds?.length > 0) {
      await supabase.from('discovered_elements').update({ priority: true }).in('id', plan.selectedIds);
      await reportStep(suiteId, "SISTEMA 🧠", "Estrategia trazada.", 'success', 'system');
    }
  } catch (e) { console.error(e); }
}

// --- FASE 3: ENJAMBRE ---
async function startAgent(type, page, suiteId, mode, goal, apiKey) {
  let actionsCount = 0;
  let missionAccomplished = false;

  while (actionsCount < 8) {
    const { data: suite } = await supabase.from('test_suites').select('status').eq('id', suiteId).maybeSingle();
    if (suite?.status === 'success') { missionAccomplished = true; break; }

    const { data: element } = await supabase.from('discovered_elements')
      .select('*').eq('suite_id', suiteId).eq('status', 'pending')
      .order('priority', { ascending: false }).limit(1).maybeSingle();

    if (!element) break;
    await supabase.from('discovered_elements').update({ status: 'testing' }).eq('id', element.id);

    try {
      const decision = await callAI({
        systemPrompt: getSystemPrompt(type, mode, goal),
        userContent: `ELEMENTO: ${JSON.stringify(element)}\nOBJETIVO: ${goal}`,
        apiKey
      });

      if (decision.action !== 'none') {
        const preState = await getWebSnapshot(page);
        const locator = page.locator(element.selector).nth(element.step_order || 0);
        
        if (decision.action === 'type' || element.tag_name === 'INPUT') {
          const val = goal.match(/'([^']+)'/)?.[1] || "AUDI";
          await locator.click({ timeout: 5000 });
          await locator.fill(val);
          await page.keyboard.press('Enter');
        } else {
          await locator.click({ timeout: 5000, force: true });
        }
        
        await page.waitForTimeout(4000); 
        const postState = await getWebSnapshot(page);
        const postImg = await uploadEvidenteToStorage(page, suiteId, `POST_${type}_${actionsCount}`);

        const validation = await callAI({
          systemPrompt: `Auditor QA. Objetivo: "${goal}". ¿Se logró? JSON: {"accomplished": boolean, "reason": "string"}`,
          userContent: `PRE: ${JSON.stringify(preState)}\nPOST: ${JSON.stringify(postState)}`,
          apiKey, model: "llama-3.1-8b-instant"
        });

        await reportStep(suiteId, `${decision.caseTitle}`, validation.reason, 'success', type, postImg);

        if (mode === 'strike' && validation.accomplished) {
          await supabase.from('test_suites').update({ status: 'success' }).eq('id', suiteId);
          await reportStep(suiteId, "🎯 OBJETIVO LOGRADO", goal, 'success', 'system', postImg);
          missionAccomplished = true;
          break;
        }
      }
      await supabase.from('discovered_elements').update({ status: 'tested' }).eq('id', element.id);
    } catch (err) {
      await reportStep(suiteId, `Error en ${type}`, err.message, 'failed', type);
    }
    actionsCount++;
  }
  return missionAccomplished;
}

// --- ORQUESTADOR ---
export async function runChaosEvolution(url, suiteId, config = {}) {
  const { mode = 'chaos', goal = '', apiKeys = [] } = config;
  let browser = null;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    
    await reportStep(suiteId, "SISTEMA 🛠️", "Navegador listo.", 'success', 'system');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    await runScoutMapping(page, suiteId);
    
    // PAUSA DE SEGURIDAD PARA DB
    await new Promise(r => setTimeout(r, 2000));

    if (mode === 'strike') {
      await generateTargetedPlan(suiteId, goal, apiKeys[0]);
    }

    // Ejecución secuencial para evitar colisiones
    const uxResult = await startAgent('ux', page, suiteId, mode, goal, apiKeys[0]);
    if (!uxResult) {
      await startAgent('functional', page, suiteId, mode, goal, apiKeys[1] || apiKeys[0]);
    }

    const { data: finalSuite } = await supabase.from('test_suites').select('status').eq('id', suiteId).maybeSingle();
    if (mode === 'strike' && finalSuite?.status !== 'success') {
      await reportStep(suiteId, "❌ PRUEBA FALLIDA", "El objetivo no se cumplió.", 'failed', 'system');
      await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId);
    }

  } catch (e) {
    await reportStep(suiteId, "ERROR CRÍTICO 💥", e.message, 'failed', 'system');
    await supabase.from('test_suites').update({ status: 'error' }).eq('id', suiteId);
  } finally {
    if (browser) await browser.close();
  }
}

async function callAI({ systemPrompt, userContent, apiKey, model = "llama-3.3-70b-versatile" }) {
  const client = new Groq({ apiKey: apiKey || process.env.GROQ_API_KEY });
  const response = await client.chat.completions.create({
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
    model, response_format: { type: "json_object" }, temperature: 0
  });
  return JSON.parse(response.choices[0].message.content);
}
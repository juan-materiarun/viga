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
  Si el elemento actual tiene relación directa con el objetivo, ejecuta 'click'.
  Si crees que NO tiene relación, indica "action": "none" y explica por qué de forma breve.
  RESPUESTA JSON ESTRICTA: {"caseTitle": "string", "action": "click|type|none", "reason": "string", "finished": boolean}`;
};

// --- UTILIDADES DE ESTADO Y EVIDENCIA ---

async function getWebSnapshot(page) {
  return await page.evaluate(() => {
    return {
      url: window.location.href,
      text: document.body.innerText.substring(0, 1000),
      htmlClasses: document.documentElement.className + " " + document.body.className,
    };
  });
}

async function uploadEvidenteToStorage(page, suiteId, stepName) {
  try {
    const buffer = await page.screenshot({ fullPage: false });
    const fileName = `${suiteId}/${Date.now()}-${stepName.replace(/\s+/g, '_')}.png`;

    const { data, error } = await supabase.storage
      .from('viga-evidence')
      .upload(fileName, buffer, { contentType: 'image/png' });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage.from('viga-evidence').getPublicUrl(fileName);
    return publicUrl.publicUrl;
  } catch (err) {
    console.error("[DEBUG] 💥 Fallo en evidencia:", err.message);
    return null;
  }
}

// --- REPORTE (Sincronizado con tus columnas) ---
async function reportStep(suiteId, name, action, status, agent, screenshotUrl = null) {
  const { error } = await supabase
    .from('test_steps')
    .insert([{
      suite_id: suiteId,
      action_type: agent,
      selector: name,
      expected_result: action,
      status: status,
      screenshot_url: screenshotUrl,
      error_message: status === 'failed' ? action : null
    }]);

  if (error) console.error("🚨 Error real en insert:", error.message);
}

// --- FASE 1: SCOUT ---
async function runScoutMapping(page, suiteId) {
  console.log(`[DEBUG] 🛰️ Mapeando superficie...`);
  
  const elements = await page.evaluate(() => {
    const interactive = 'a, button, input, [role="button"], .theme-toggle, .mode-toggle, select, textarea';
    return Array.from(document.querySelectorAll(interactive))
      .filter(el => {
        const r = el.getBoundingClientRect();
        return r.height > 0 && r.width > 0;
      })
      .map(el => {
        let area = 'main';
        if (el.closest('header') || el.closest('nav')) area = 'header';
        else if (el.closest('footer')) area = 'footer';

        return {
          selector: el.id ? `#${el.id}` : el.tagName.toLowerCase() + (el.className ? '.' + el.className.split(' ')[0] : ''),
          text: (el.innerText || el.getAttribute('aria-label') || '').trim().substring(0, 50),
          tag_name: el.tagName,
          area: area
        };
      });
  });

  if (elements.length > 0) {
    const rows = elements.map(el => ({
      suite_id: suiteId,
      selector: el.selector,
      tag_name: el.tag_name,
      status: 'pending',
      priority: false,
      text: el.text,
      area: el.area
    }));
    await supabase.from('discovered_elements').insert(rows);
  }

  await reportStep(suiteId, "SISTEMA 🛰️", `¡Mapeo listo! Encontré ${elements.length} puntos de interés.`, 'success', 'system');
  return elements;
}

// --- FASE 2: ESTRATEGA ---
async function generateTargetedPlan(suiteId, goal, apiKey) {
  const { data: elements } = await supabase.from('discovered_elements').select('*').eq('suite_id', suiteId);
  if (!elements?.length) return { selectedIds: [], keywords: [] };

  const systemPrompt = `Eres el Estratega VIGA. Selecciona los IDs que ayuden a: "${goal}". Responde JSON: {"selectedIds": [number], "keywords": ["string"]}`;
  
  try {
    const plan = await callAI({ systemPrompt, userContent: JSON.stringify(elements.slice(0, 60)), apiKey });
    if (plan.selectedIds?.length > 0) {
      await supabase.from('discovered_elements').update({ priority: true }).in('id', plan.selectedIds);
    }
    return plan;
  } catch (e) {
    return { selectedIds: [], keywords: [] };
  }
}

// --- FASE 3: ENJAMBRE (CON BLOQUEO Y LIMPIEZA) ---
async function startAgent(type, page, suiteId, mode, goal, keywords, apiKey) {
  let actionsCount = 0;
  let missionAccomplished = false;
  const maxActions = mode === 'strike' ? 6 : 10;

  while (actionsCount < maxActions) {
    // 1. BLOQUEO ATÓMICO: Buscamos uno pendiente y lo marcamos como 'testing' inmediatamente
    const { data: element } = await supabase.from('discovered_elements')
      .select('*')
      .eq('suite_id', suiteId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!element) break;

    // Marcamos como 'testing' para que el otro agente no lo elija
    await supabase.from('discovered_elements').update({ status: 'testing' }).eq('id', element.id);

    try {
      // Usamos el 70b para DECIDIR (inteligencia pesada)
      const decision = await callAI({
        systemPrompt: getSystemPrompt(type, mode, goal),
        userContent: `ELEMENTO: ${JSON.stringify(element)}\nOBJETIVO: ${goal}`,
        apiKey,
        model: "llama-3.3-70b-versatile"
      });

      if (decision.action !== 'none') {
        // Ejecutar acción
        const preScreenshot = await uploadEvidenteToStorage(page, suiteId, `PRE_${type}_A${actionsCount}`);
        const preState = await getWebSnapshot(page);

        if (decision.action === 'type' || element.tag_name === 'INPUT') {
          await page.fill(element.selector, "VIGA_STRIKE_DATA");
        } else {
          await page.locator(element.selector).scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
          await page.click(element.selector, { timeout: 5000 });
        }
        
        await page.waitForTimeout(2000); 

        const postScreenshot = await uploadEvidenteToStorage(page, suiteId, `POST_${type}_A${actionsCount}`);
        const postState = await getWebSnapshot(page);

        // OPTIMIZACIÓN: Usamos 8b para VALIDAR (más rápido, menos rate limit)
        const validation = await callAI({
          systemPrompt: `Eres Auditor QA. Objetivo: "${goal}". Responde JSON: {"accomplished": boolean, "reason": "string"}`,
          userContent: `ANTERIOR: ${JSON.stringify(preState)}\nACTUAL: ${JSON.stringify(postState)}`,
          apiKey,
          model: "llama-3.1-8b-instant"
        });

        const emoji = validation.accomplished ? "✅" : "⚠️";
        await reportStep(suiteId, `${decision.caseTitle} ${emoji}`, validation.reason, validation.accomplished ? 'success' : 'warning', type, postScreenshot);

        if (mode === 'strike' && (decision.finished || validation.accomplished)) {
          await reportStep(suiteId, "🎯 ¡OBJETIVO LOGRADO!", `¡Misión cumplida! La IA confirma que ${goal} funciona OK. 🚀`, 'success', type, postScreenshot);
          missionAccomplished = true;
          break;
        }
      }

      // Finalizar elemento
      await supabase.from('discovered_elements').update({ status: 'tested' }).eq('id', element.id);

    } catch (err) {
      // MANEJO HUMANO DE ERRORES (GROQ RATE LIMIT)
      const isRateLimit = err.message.includes('429') || err.message.includes('rate_limit');
      const userMessage = isRateLimit 
        ? "⚠️ Sensores saturados: El agente está esperando una ventana de cómputo para reintentar..." 
        : `Interferencia en el proceso: ${err.message}`;

      const errorImg = await uploadEvidenteToStorage(page, suiteId, `ERROR_${type}`);
      await reportStep(suiteId, `¡Ups! Falló algo 💥`, userMessage, 'failed', type, errorImg);
      
      if (isRateLimit) await new Promise(r => setTimeout(r, 5000)); // Pausa de seguridad
    }
    actionsCount++;
  }
  return missionAccomplished;
}

// --- FASE 4: AUDITORÍA ---
async function generateFinalAudit(suiteId) {
  const { data: steps } = await supabase.from('test_steps').select('*').eq('suite_id', suiteId).order('created_at', { ascending: true });
  
  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await client.chat.completions.create({
      messages: [{ role: "system", content: "Genera un resumen ejecutivo muy breve del testing realizado." }, { role: "user", content: JSON.stringify(steps?.slice(-10)) }],
      model: "llama-3.1-8b-instant",
    });
    
    await supabase.from('test_suites').update({ 
      status: 'completed', 
      report_data: { final_audit: response.choices[0].message.content } 
    }).eq('id', suiteId);
  } catch (e) {
    await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);
  }
}

// --- UTILIDADES ---
async function callAI({ systemPrompt, userContent, apiKey, model = "llama-3.3-70b-versatile" }) {
  const client = new Groq({ apiKey: apiKey || process.env.GROQ_API_KEY });
  const response = await client.chat.completions.create({
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
    model: model,
    response_format: { type: "json_object" },
    temperature: 0,
  });
  return JSON.parse(response.choices[0].message.content);
}

// --- ORQUESTADOR ---
export async function runChaosEvolution(url, suiteId, config = {}) {
  const { mode = 'chaos', goal = '', apiKeys = [] } = config;
  let browser = null;

  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await reportStep(suiteId, "SISTEMA 🛠️", "Iniciando motores... Navegador listo.", 'success', 'system');
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    await runScoutMapping(page, suiteId);
    if (mode === 'scout') return;

    let keywords = [];
    if (mode === 'strike') {
      const plan = await generateTargetedPlan(suiteId, goal, apiKeys[0]);
      keywords = plan.keywords || [];
    }

    // EJECUCIÓN PARALELA
    const agents = [
      startAgent('ux', page, suiteId, mode, goal, keywords, apiKeys[0]),
      startAgent('functional', page, suiteId, mode, goal, keywords, apiKeys[1] || apiKeys[0])
    ];

    const results = await Promise.all(agents);
    const success = results.some(r => r === true);

    if (mode === 'strike') {
      const veredict = success ? "✅ PRUEBA EXITOSA" : "❌ PRUEBA FALLIDA";
      await reportStep(suiteId, veredict, `Misión terminada para: ${goal}`, success ? 'success' : 'failed', 'system');
    }

    await generateFinalAudit(suiteId);

  } catch (e) {
    await reportStep(suiteId, "ERROR CRÍTICO 💥", e.message, 'failed', 'system');
    await supabase.from('test_suites').update({ status: 'error' }).eq('id', suiteId);
  } finally {
    if (browser) await browser.close();
  }
}
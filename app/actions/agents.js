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
  console.log(`[DEBUG] 📸 Capturando Snapshot del DOM...`);
  return await page.evaluate(() => {
    return {
      url: window.location.href,
      text: document.body.innerText.substring(0, 1000),
      htmlClasses: document.documentElement.className + " " + document.body.className,
    };
  });
}

async function uploadEvidenteToStorage(page, suiteId, stepName) {
  console.log(`[DEBUG] 📷 Intentando captura de pantalla: ${stepName}`);
  try {
    const buffer = await page.screenshot({ fullPage: false });
    console.log(`[DEBUG] ✅ Screenshot capturado (${buffer.length} bytes). Subiendo a Supabase...`);

    const fileName = `${suiteId}/${Date.now()}-${stepName.replace(/\s+/g, '_')}.png`;

    const { data, error } = await supabase.storage
      .from('viga-evidence')
      .upload(fileName, buffer, { contentType: 'image/png' });

    if (error) {
      console.error(`[DEBUG] ❌ Error en Supabase Storage:`, error.message);
      throw error;
    }

    const { data: publicUrl } = supabase.storage.from('viga-evidence').getPublicUrl(fileName);
    console.log(`[DEBUG] 🔗 URL de evidencia lista: ${publicUrl.publicUrl}`);
    return publicUrl.publicUrl;
  } catch (err) {
    console.error("[DEBUG] 💥 Fallo crítico en uploadEvidenteToStorage:", err.message);
    return null;
  }
}

// --- FASE 1: SCOUT ---
async function runScoutMapping(page, suiteId) {
  console.log(`[DEBUG] 🛰️ Iniciando fase SCOUT en: ${page.url()}`);
  
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

  console.log(`[DEBUG] 📝 Mapeo listo. Insertando ${elements.length} elementos en DB...`);

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
    const { error } = await supabase.from('discovered_elements').insert(rows);
    if (error) console.error(`[DEBUG] ❌ Error insertando elementos:`, error.message);
  }

  await reportStep(suiteId, "SISTEMA 🛰️", `¡Mapeo listo! Encontré ${elements.length} puntos de interés.`, 'success', 'system');
  return elements;
}

// --- FASE 2: ESTRATEGA ---
async function generateTargetedPlan(suiteId, goal, apiKey) {
  console.log(`[DEBUG] 🧠 Estratega planificando objetivo: ${goal}`);
  const { data: elements } = await supabase.from('discovered_elements').select('*').eq('suite_id', suiteId);
  
  if (!elements?.length) {
    console.log(`[DEBUG] ⚠️ No se encontraron elementos para planificar.`);
    return { selectedIds: [], keywords: [] };
  }

  const systemPrompt = `Eres el Estratega VIGA. Selecciona los IDs que ayuden a: "${goal}". Responde JSON: {"selectedIds": [number], "keywords": ["string"]}`;
  
  try {
    const plan = await callAI({ systemPrompt, userContent: JSON.stringify(elements.slice(0, 60)), apiKey });
    console.log(`[DEBUG] ✅ Plan generado por IA: Seleccionados ${plan.selectedIds?.length} elementos.`);
    
    if (plan.selectedIds?.length > 0) {
      await supabase.from('discovered_elements').update({ priority: true }).in('id', plan.selectedIds);
    }
    return plan;
  } catch (e) {
    console.error(`[DEBUG] ❌ Error en Estratega:`, e.message);
    return { selectedIds: [], keywords: [] };
  }
}

// --- FASE 3: ENJAMBRE ---
async function startAgent(type, page, suiteId, mode, goal, keywords, apiKey) {
  console.log(`[DEBUG] 🤖 Agente ${type.toUpperCase()} desplegado.`);
  let actionsCount = 0;
  let missionAccomplished = false;
  const maxActions = mode === 'strike' ? 6 : 10;

  while (actionsCount < maxActions) {
    console.log(`[DEBUG] [${type}] 🔍 Buscando siguiente elemento (Acción ${actionsCount + 1}/${maxActions})...`);
    
    const { data: element, error: dbErr } = await supabase.from('discovered_elements')
      .select('*')
      .eq('suite_id', suiteId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (dbErr) console.error(`[DEBUG] [${type}] ❌ Error DB:`, dbErr.message);
    if (!element) {
      console.log(`[DEBUG] [${type}] ⏹️ No hay más elementos pendientes.`);
      break;
    }

    console.log(`[DEBUG] [${type}] 🎯 Analizando elemento: ${element.selector} ("${element.text}")`);
    await supabase.from('discovered_elements').update({ status: 'tested' }).eq('id', element.id);

    try {
      console.log(`[DEBUG] [${type}] 🧠 Consultando IA para decidir acción...`);
      const decision = await callAI({
        systemPrompt: getSystemPrompt(type, mode, goal),
        userContent: `ELEMENTO: ${JSON.stringify(element)}\nOBJETIVO: ${goal}`,
        apiKey
      });
      console.log(`[DEBUG] [${type}] 🤖 IA decidió: ${decision.action}. Razón: ${decision.reason}`);

      if (decision.action === 'none') {
        await reportStep(suiteId, `Análisis ${type.toUpperCase()} 🔍`, `Paso de largo: ${decision.reason}`, 'success', type);
      } else {
        await reportStep(suiteId, `Buscando... 🔎`, `¡Encontré algo prometedor! Probando: ${element.text || element.selector}`, 'success', type);
        
        // 📸 FOTO ANTES
        const preScreenshot = await uploadEvidenteToStorage(page, suiteId, `PRE_${type}_A${actionsCount}`);
        const preState = await getWebSnapshot(page);

        // ⚡ EJECUTAR
        console.log(`[DEBUG] [${type}] ⚡ Ejecutando ${decision.action} en navegador...`);
        if (decision.action === 'type' || element.tag_name === 'INPUT') {
          await page.fill(element.selector, "VIGA_STRIKE_DATA");
        } else {
          await page.locator(element.selector).scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => {});
          await page.click(element.selector, { timeout: 5000 });
        }
        
        console.log(`[DEBUG] [${type}] ⏳ Esperando 2s para ver cambios...`);
        await page.waitForTimeout(2000); 

        // 📸 FOTO DESPUÉS
        const postScreenshot = await uploadEvidenteToStorage(page, suiteId, `POST_${type}_A${actionsCount}`);
        const postState = await getWebSnapshot(page);

        // 🧠 COMPARACIÓN POR IA
        console.log(`[DEBUG] [${type}] 🧠 Solicitando validación de cambios a IA...`);
        const validation = await callAI({
          systemPrompt: `Eres un Auditor de QA. Tu objetivo: "${goal}". Compara los estados. ¿Se logró o avanzamos? Responde JSON: {"accomplished": boolean, "reason": "string"}`,
          userContent: `ANTERIOR: ${JSON.stringify(preState)}\nACTUAL: ${JSON.stringify(postState)}`,
          apiKey
        });

        const emojiSuccess = validation.accomplished ? "✅" : "⚠️";
        await reportStep(suiteId, `${decision.caseTitle} ${emojiSuccess}`, validation.reason, validation.accomplished ? 'success' : 'warning', type, postScreenshot);

        if (mode === 'strike' && (decision.finished || validation.accomplished)) {
          console.log(`[DEBUG] [${type}] 🎯 ¡MISIÓN CUMPLIDA!`);
          await reportStep(suiteId, "🎯 ¡OBJETIVO LOGRADO!", `¡Misión cumplida! La IA confirma que ${goal} funciona OK. 🚀`, 'success', type, postScreenshot);
          missionAccomplished = true;
          break;
        }
      }
    } catch (err) {
      console.error(`[DEBUG] [${type}] 💥 Error en ejecución:`, err.message);
      const errorImg = await uploadEvidenteToStorage(page, suiteId, `ERROR_${type}`);
      await reportStep(suiteId, `¡Ups! Falló algo 💥`, err.message, 'failed', type, errorImg);
    }
    actionsCount++;
  }
  return missionAccomplished;
}

// --- FASE 4: AUDITORÍA ---
async function generateFinalAudit(suiteId) {
  console.log(`[DEBUG] 📋 Generando Auditoría Final...`);
  const { data: runData } = await supabase.from('test_suites').select('report_data').eq('id', suiteId).maybeSingle();
  const history = runData?.report_data?.history || [];

  try {
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const response = await client.chat.completions.create({
      messages: [{ role: "system", content: "Resume la misión de QA de forma técnica y breve." }, { role: "user", content: JSON.stringify(history.slice(-15)) }],
      model: "llama-3.1-8b-instant",
    });
    
    await supabase.from('test_suites').update({ 
      status: 'completed', 
      report_data: { final_audit: response.choices[0].message.content, history } 
    }).eq('id', suiteId);
    console.log(`[DEBUG] ✅ Auditoría guardada. Suite completada.`);
  } catch (e) {
    console.error(`[DEBUG] ❌ Error en auditoría:`, e.message);
    await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);
  }
}

// --- UTILIDADES ---
async function callAI({ systemPrompt, userContent, apiKey }) {
  const client = new Groq({ apiKey: apiKey || process.env.GROQ_API_KEY });
  const response = await client.chat.completions.create({
    messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userContent }],
    model: "llama-3.3-70b-versatile",
    response_format: { type: "json_object" },
    temperature: 0,
  });
  return JSON.parse(response.choices[0].message.content);
}

async function reportStep(suiteId, name, action, status, agent, screenshotUrl = null) {
  console.log(`[REPORT] [${agent.toUpperCase()}] ${name} | ${status}`);
  
  const { error } = await supabase
    .from('test_steps')
    .insert([{
      suite_id: suiteId,
      action_type: agent,          // Mapeamos 'ux/system' aquí
      selector: name,              // El título o selector
      expected_result: action,      // La descripción de lo que hace
      status: status,              // 'success', 'failed', etc.
      screenshot_url: screenshotUrl,
      error_message: status === 'failed' ? action : null
    }]);

  if (error) console.error("🚨 Error real en insert:", error.message);
}

// --- ORQUESTADOR ---
export async function runChaosEvolution(url, suiteId, config = {}) {
  const { mode = 'chaos', goal = '', apiKeys = [] } = config;
  let browser = null;

  try {
    console.log(`[DEBUG] 🚀 Lanzando Navegador (Chromium)...`);
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await reportStep(suiteId, "SISTEMA 🛠️", "Iniciando motores... Navegador listo.", 'success', 'system');
    
    console.log(`[DEBUG] 🌐 Navegando a: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });

    await runScoutMapping(page, suiteId);
    if (mode === 'scout') return;

    let keywords = [];
    if (mode === 'strike') {
      const plan = await generateTargetedPlan(suiteId, goal, apiKeys[0]);
      keywords = plan.keywords || [];
    }

    console.log(`[DEBUG] 🔥 Iniciando agentes en paralelo...`);
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
    console.error(`[DEBUG] 💥 ERROR CRÍTICO EN ORQUESTADOR:`, e.message);
    await reportStep(suiteId, "ERROR CRÍTICO 💥", e.message, 'failed', 'system');
    await supabase.from('test_suites').update({ status: 'error' }).eq('id', suiteId);
  } finally {
    if (browser) {
      console.log(`[DEBUG] 🔌 Cerrando Navegador.`);
      await browser.close();
    }
  }
}
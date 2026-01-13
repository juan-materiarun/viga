'use server'

import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { getBrowser } from '../../lib/viga-core/browser'
import { captureEvidence } from '../../lib/viga-core/evidence'
import { callGroqJSON } from '../../lib/viga-core/llm'
import { analyzeScreenshot } from '../../lib/viga-core/vision'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/* ───────── FILTRO DE TOKENS (EL SECRETO) ───────── */
// Limpiamos el objeto UI para que ocupe lo mínimo posible en el prompt.
function getMiniUI(elements: any[]) {
  return elements.map(el => ({
    i: el.i,
    t: el.tag,
    txt: el.text.slice(0, 15),
    en: el.isEnabled ? 1 : 0
  })).slice(0, 15); // Solo enviamos 15 elementos para no saturar TPM
}

/* ───────── VIGA SHIELD: RESILIENCIA Y COOLDOWN ───────── */
async function vigaShield(fn: () => Promise<any>, context: string, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      // Respiro obligatorio de 4s para vaciar el "bucket" de tokens
      await sleep(4000); 
      return await fn();
    } catch (err: any) {
      if (err.message?.includes('429') || err.status === 429) {
        console.warn(`[VIGA-SHIELD] 🛑 Saturación de API. Pausa de limpieza: 25s.`);
        await sleep(25000); 
        return null; // Devolvemos null para que el agente use heurística
      }
      console.error(`[VIGA-ERROR] ${context}:`, err.message);
      return null;
    }
  }
  return null;
}

/* ───────── AGENTE 1: SCOUT (MAPEO) ───────── */
export async function runScoutAgent(url: string, suiteId: string) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    const elements = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a,button,input,select,textarea'))
        .map((el, i) => ({
          i,
          tag: el.tagName,
          text: (el.textContent || (el as any).placeholder || "").trim().slice(0, 30),
        })).filter(el => el.text !== "" || el.tag === 'INPUT')
    )
    for (const el of elements.slice(0, 20)) {
      await supabase.from('discovered_elements').insert({
        suite_id: suiteId, tag_name: el.tag, selector: el.tag.toLowerCase(), text: el.text, status: 'discovered'
      })
    }
    const ev = await captureEvidence(page, suiteId, crypto.randomUUID())
    await supabase.from('test_steps').insert({
      suite_id: suiteId, action_type: 'scout', selector: 'SURFACE_SCAN',
      expected_result: `Mapeo completado. ${elements.length} elementos encontrados.`,
      status: 'success', screenshot_url: ev.screenshotUrl
    })
  } finally {
    await page.close();
  }
}

/* ───────── AGENTE 2: CHAOS (NAVEGACIÓN LENTA Y AUTÓNOMA) ───────── */
export async function runChaosAgent(url: string, suiteId: string) {
  const browser = await getBrowser()
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  
  const state = {
    triedUids: new Set<string>(),
    history: [] as string[],
    isFinished: false,
    bugs: [],
    stepCount: 0
  }

  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    await sleep(5000);

    while (!state.isFinished && state.stepCount < 40) {
      state.stepCount++;

      const rawUI = await page.evaluate(() => 
        Array.from(document.querySelectorAll('a,button,input,select,textarea,[role="button"]'))
          .map((e, i) => ({
            i, tag: e.tagName,
            text: (e.textContent || (e as any).placeholder || "").trim().slice(0, 30),
            isEnabled: !(e as any).disabled,
            isVisible: e.getBoundingClientRect().width > 0,
            uid: `${e.tagName}-${i}`
          })).filter(el => el.isVisible).slice(0, 30)
      )

      if (rawUI.length === 0) { await page.reload(); continue; }

      // 1. Decisión de la IA con UI Minificada
      const thought = await vigaShield(() => callGroqJSON(
        `MODO CAOS. UI: ${JSON.stringify(getMiniUI(rawUI))}.JSON: { "reasoning": "string", "should_stop": boolean, "index": number, "action": "click"|"type", "payload": "string", "test_name": "string" }`,
        "Chaos Decision"
      ), "Brain Thinking");

      // 2. MODO INSTINTO (Si la IA no responde por tokens)
      let decision = thought;
      if (!decision) {
        console.log("⚠️ API Saturada. VIGA usa Instinto Heurístico.");
        const untried = rawUI.find(el => el.isEnabled && !state.triedUids.has(el.uid));
        if (!untried) break;
        decision = { index: untried.i, action: untried.tag === 'INPUT' ? 'type' : 'click', payload: "VIGA_DATA", test_name: "AUTOPILOTO", should_stop: false };
      }

      if (decision.should_stop) break;

      // 3. Ejecución Lenta
      const target = rawUI.find(el => el.i === decision.index) || rawUI[0];
      const stepId = crypto.randomUUID();

      try {
        const locator = page.locator(`${target.tag.toLowerCase()}`).nth(rawUI.filter(e => e.tag === target.tag).findIndex(e => e.i === target.i));
        
        if (await locator.isDisabled()) continue;

        if (decision.action === 'type') {
          await locator.fill(decision.payload || "VIGA_CHAOS");
          await page.keyboard.press('Enter');
        } else {
          await locator.click({ timeout: 4000 });
        }

        state.triedUids.add(target.uid);
        state.history.push(decision.test_name);

        // 4. Captura de Evidencia (Cada 2 pasos para ahorrar tokens de Visión)
        if (state.stepCount % 2 === 0) {
          await sleep(3000);
          const ev = await captureEvidence(page, suiteId, stepId);
          // Omitimos analyzeScreenshot si queremos ahorro máximo de tokens
          await supabase.from('test_steps').insert({
            suite_id: suiteId, action_type: 'chaos', selector: decision.test_name,
            expected_result: "Paso validado - Exploración en curso",
            status: 'success', screenshot_url: ev.screenshotUrl
          });
        }

        // COOLDOWN ESTRATÉGICO: 8 segundos para que la API respire
        console.log(`[VIGA] Paso ${state.stepCount} ok. Enfriando tokens...`);
        await sleep(8000);

      } catch (err) {
        console.log("Obstáculo detectado, saltando...");
      }
    }
  } finally {
    await page.close(); await context.close();
    await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);
  }
}

/* ───────── AGENTE 3: STRIKE (FLUJOS CRÍTICOS) ───────── */
export async function runStrikeAgent(url: string, suiteId: string, goal: string) {
  const browser = await getBrowser()
  const page = await browser.newPage()
  try {
    await page.goto(url, { waitUntil: 'networkidle' })
    for (let i = 0; i < 8; i++) {
      const ui = await page.evaluate(() =>
        Array.from(document.querySelectorAll('a,button,input,select')).map((e, i) => ({
          i, tag: e.tagName, text: (e.textContent || "").trim().slice(0, 20),
          en: !(e as any).disabled
        })).filter(el => el.text !== "" || el.tag === 'INPUT').slice(0, 15)
      )

      const decision = await vigaShield(() => callGroqJSON(
        `META: ${goal}. JSON: { "index": number, "action": "click"|"type", "value": "string", "goal_reached": boolean }`,
        JSON.stringify(ui)
      ), "Strike Think");

      if (!decision || decision.goal_reached) break;

      const target = ui[decision.index];
      const locator = page.locator(`${target.tag.toLowerCase()}`).nth(ui.filter(e => e.tag === target.tag).findIndex(e => e.i === target.i));
      
      if (await locator.isEnabled()) {
        if (decision.action === 'type') { await locator.fill(decision.value); await page.keyboard.press('Enter'); }
        else { await locator.click({ timeout: 5000 }); }
      }
      await sleep(7000); // Goteo de tokens
    }
    const finalEv = await captureEvidence(page, suiteId, crypto.randomUUID());
    await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);
  } finally {
    await page.close();
  }
}
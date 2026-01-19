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

/* ───────── CONFIGURACIÓN DE ROTACIÓN ───────── */
const GROQ_KEYS = [
  process.env.GROQ_API_KEY_1,
  process.env.GROQ_API_KEY_2,
  process.env.GROQ_API_KEY_3
].filter(Boolean) as string[];

let keyCounter = 0;
function getRotatedKey() {
  if (GROQ_KEYS.length === 0) return process.env.GROQ_API_KEY || "";
  const key = GROQ_KEYS[keyCounter % GROQ_KEYS.length];
  keyCounter++;
  return key;
}

/* ───────── TELEMETRÍA ───────── */
async function vigaLog(suiteId: string, message: string, level: 'info' | 'success' | 'warning' | 'error' = 'info') {
  const shortId = suiteId.slice(-4);
  console.log(`[${shortId}] ${message}`);
  await supabase.from('agent_logs').insert({
    suite_id: suiteId,
    message: `[${shortId}] ${message}`,
    level
  });
}

/* ───────── UTILIDADES DE ADN (Súper Sensible) ───────── */
async function getPageDNA(page: any) {
  return await page.evaluate(() => {
    const body = document.body;
    const style = window.getComputedStyle(body);
    const visibleText = body.innerText.slice(0, 1500);

    return {
      bg: style.backgroundColor,
      lang: document.documentElement.lang || "unknown",
      domSize: body.innerHTML.length,
      url: window.location.href,
      textHash: visibleText.length + visibleText.slice(0, 40) + visibleText.slice(-40), // Huella única de texto
      themeData: document.documentElement.className + body.className,
      hasLoader: !!document.querySelector('.loader, .spinner, .loading, [aria-busy="true"]') ||
        body.innerHTML.toLowerCase().includes('cargando')
    };
  });
}

function getCleanUrl(url: string) {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace('www.', '') + u.pathname.replace(/\/$/, "");
  } catch (e) { return url.toLowerCase().replace(/\/$/, ""); }
}

function generateSemanticId(el: any) {
  if (!el) return `unknown-${crypto.randomUUID().slice(0, 8)}`;
  const tag = (el.tag || el.tagName || 'node').toLowerCase();
  const text = (el.text || el.textContent || '').replace(/[0-9]/g, '').toLowerCase().trim();
  const raw = `${tag}-${text}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

async function getActiveElements(page: any) {
  return await page.evaluate(() => {
    const forbidden = ['.viga-monitor', '.chaos-terminal', '#control-panel', '.navbar-viga'];
    return Array.from(document.querySelectorAll('a,button,input,select,textarea,[role="button"],.nav-item,.dropdown'))
      .filter(e => !forbidden.some(selector => e.closest(selector)))
      .map((e, i) => {
        const rect = e.getBoundingClientRect();
        return {
          i, tag: e.tagName,
          text: (e.textContent?.trim() || e.getAttribute('placeholder') || e.getAttribute('aria-label') || "").slice(0, 50),
          x: Math.round(rect.left + rect.width / 2),
          y: Math.round(rect.top + rect.height / 2),
          isVisible: rect.width > 0 && rect.height > 0,
        };
      }).filter(el => el.isVisible && el.text.length > 0);
  });
}

const SMART_BRAIN_SYSTEM = `Eres un Agente de QA Automático. Tu meta es explorar y validar flujos de usuario.
REGLAS:
1. Lee el feedback de ADN: si una acción no cambió nada, NO la repitas.
2. Explora metódicamente todos los botones, menús y formularios.
3. El éxito se define por cambios en la URL, el idioma, el tema visual o el contenido.
Responde estrictamente en JSON: { "index": number, "action": "click"|"type", "payload": "string", "test_name": "string", "reasoning": "string" }`;

/* ───────── AGENTE 1: SCOUT ───────── */
export async function runScoutAgent(url: string, suiteId: string) {
  const safeUrl = url.startsWith('http') ? url : `https://${url}`;
  const cleanUrl = getCleanUrl(safeUrl);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await vigaLog(suiteId, `🛰️ Scout mapeando: ${cleanUrl}`, 'info');
    await page.goto(safeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const elements = await getActiveElements(page);
    const rows = elements.map(el => ({
      suite_id: suiteId, url: cleanUrl, tag_name: el.tag,
      text: el.text.slice(0, 80), semantic_id: generateSemanticId(el),
      identity_data: JSON.parse(JSON.stringify(el)), status: 'pending'
    }));
    await supabase.from('discovered_elements').delete().eq('url', cleanUrl);
    await supabase.from('discovered_elements').insert(rows);
  } finally { await page.close(); }
}

/* ───────── AGENTE 2: CHAOS (EVOLUTIVO + AGNÓSTICO) ───────── */
export async function runChaosAgent(url: string, suiteId: string) {
  const browser = await getBrowser();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  let stepCount = 0;
  let exhaustedElements = new Set<string>(); // Memoria de elementos probados
  let lastActionLog = "Inicio de exploración.";

  try {
    await page.goto(url, { waitUntil: 'networkidle' });

    while (stepCount < 25) {
      const dnaBefore = await getPageDNA(page);
      const allElements = await getActiveElements(page);

      // Filtramos para que la IA solo vea lo que no ha probado aún
      const available = allElements.filter(el => !exhaustedElements.has(`${el.tag}-${el.text}`));

      if (available.length === 0) {
        await vigaLog(suiteId, "🏁 No quedan elementos nuevos por explorar.", "success");
        break;
      }

      const contextPrompt = `
        URL: ${dnaBefore.url}
        FEEDBACK ÚLTIMA ACCIÓN: ${lastActionLog}
        
        ELEMENTOS DISPONIBLES (Nuevos):
        ${JSON.stringify(available.slice(0, 15).map(e => ({ i: e.i, txt: e.text })))}
      `;

      const decision = await callGroqJSON(SMART_BRAIN_SYSTEM, contextPrompt, getRotatedKey());
      if (!decision) break;

      const target = allElements.find(el => el.i === decision.index);
      if (target) {
        const elementKey = `${target.tag}-${target.text}`;
        await vigaLog(suiteId, `🧪 ${decision.test_name}`, "info");

        // Ejecución Híbrida (DOM Event + Mouse)
        try {
          if (decision.action === 'type') {
            await page.evaluate((i) => (document.querySelectorAll('a,button,input,select,textarea,[role="button"]')[i] as any).focus(), target.i);
            await page.keyboard.type(decision.payload || "test", { delay: 30 });
            await page.keyboard.press('Enter');
          } else {
            await page.evaluate((i) => {
              const el = document.querySelectorAll('a,button,input,select,textarea,[role="button"]')[i] as HTMLElement;
              el?.click();
            }, target.i).catch(async () => {
              await page.mouse.click(target.x, target.y);
            });
          }
        } catch (e) {
          await vigaLog(suiteId, `⚠️ Error al interactuar con elemento ${target.i}`, "warning");
        }

        await sleep(5000);
        const dnaAfter = await getPageDNA(page);

        // ORÁCULO: ¿Cambió algo realmente?
        const hasNavigated = dnaBefore.url !== dnaAfter.url;
        const hasTextChanged = dnaBefore.textHash !== dnaAfter.textHash;
        const hasVisualChanged = dnaBefore.bg !== dnaAfter.bg || dnaBefore.themeData !== dnaAfter.themeData;
        const success = hasNavigated || hasTextChanged || hasVisualChanged;

        if (success) {
          lastActionLog = `ÉXITO: ${target.text} cambió la web.`;
          await vigaLog(suiteId, `✅ ${lastActionLog}`, "success");
        } else {
          lastActionLog = `INERTE: ${target.text} no produjo cambios detectables.`;
          await vigaLog(suiteId, `⚠️ ${lastActionLog}`, "warning");
        }

        // TACHAMOS EL ELEMENTO (Sea éxito o no, ya lo exploramos)
        exhaustedElements.add(elementKey);

        const ev = await captureEvidence(page, suiteId, crypto.randomUUID(), false);
        await supabase.from('test_steps').insert({
          suite_id: suiteId, action_type: decision.action, title: decision.test_name,
          expected_result: lastActionLog, status: success ? 'success' : 'warning',
          screenshot_url: ev.screenshotUrl, selector: target.text
        });
      }
      stepCount++;
    }
  } finally {
    await page.close();
    await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);
  }
}

/* ───────── AGENTE 3: STRIKE ───────── */
export async function runStrikeAgent(url: string, suiteId: string, goal: string) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
  } finally {
    await page.close();
    await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);
  }
}
import crypto from 'crypto';
import { getBrowser } from '../lib/browser';
import { captureEvidence } from '../lib/evidence';
import { callGroqJSON, createLLMContext } from '../lib/llm';
import { supabase, updateJobProgress } from '../lib/supabase';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

async function vigaLog(
    suiteId: string,
    message: string,
    level: 'info' | 'success' | 'warning' | 'error' = 'info'
) {
    const shortId = suiteId.slice(-4);
    console.log(`[${shortId}] ${message}`);
    await supabase.from('agent_logs').insert({
        suite_id: suiteId,
        message,
        level
    });
}

async function recordStep(
    suiteId: string,
    page: any,
    title: string,
    status: 'success' | 'failed' | 'running' | 'warning',
    description: string = '',
    actionData?: {
        selector?: string,
        xpath?: string,
        actionType?: 'click' | 'type' | 'navigate',
        payload?: string
    }
) {
    const stepId = crypto.randomUUID();
    const evidence = await captureEvidence(page, suiteId, stepId, false);

    const { error } = await supabase.from('test_steps').insert({
        id: stepId,
        suite_id: suiteId,
        title: title,
        expected_result: description,
        status: status,
        screenshot_url: evidence.screenshotUrl,
        selector: actionData?.selector,
        xpath: actionData?.xpath,
        action_type: actionData?.actionType,
        action_payload: actionData?.payload
    });

    if (error && error.code !== '23505') {
        console.error('Error saving step:', error);
    }
}

async function waitForStableUI(page: any, timeout = 15000) {
    const start = Date.now();
    let stableCount = 0;

    while (Date.now() - start < timeout) {
        const unstable = await page.evaluate(() => {
            const hasLoader = document.querySelector('.loader, .spinner, .loading, [aria-busy="true"], .MuiCircularProgress-root, [data-loading="true"]') !== null;
            const textLoading = document.body.innerText.toLowerCase().match(/cargando\.\.\.|loading\.\.\.|procesando\.\.\./);
            return hasLoader || !!textLoading;
        });

        if (!unstable) {
            stableCount++;
            if (stableCount > 2) return;
        } else {
            stableCount = 0;
        }
        await sleep(300);
    }
}

const CLIENT_SELECTOR_SCRIPT = `
  (function() {
    function getCssPath(element) {
      if (element.id !== '') return '#' + element.id;
      if (element === document.body) return element.tagName.toLowerCase();
      var ix = 0;
      var siblings = element.parentNode.childNodes;
      for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];
        if (sibling === element) return getCssPath(element.parentNode) + ' > ' + element.tagName.toLowerCase() + ':nth-of-type(' + (ix + 1) + ')';
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
      }
      return null;
    }
    function getXPath(element) {
      if (element.id !== '') return '//*[@id="' + element.id + '"]';
      if (element === document.body) return '/html/body';
      var ix = 0;
      var siblings = element.parentNode.childNodes;
      for (var i = 0; i < siblings.length; i++) {
        var sibling = siblings[i];
        if (sibling === element) return getXPath(element.parentNode) + '/' + element.tagName.toLowerCase() + '[' + (ix + 1) + ']';
        if (sibling.nodeType === 1 && sibling.tagName === element.tagName) ix++;
      }
      return null;
    }
    window.getVigaSelector = getCssPath;
    window.getVigaXPath = getXPath;
  })();
`;

async function injectScripts(page: any) {
    await page.addScriptTag({ content: CLIENT_SELECTOR_SCRIPT });
}

type UIElement = {
    i: number;
    tag: string;
    text: string;
    hint: string;
    selector: string;
    xpath: string;
    attributes?: any;
};

async function getActiveElements(page: any): Promise<UIElement[]> {
    await injectScripts(page);
    return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"], [tabindex="0"]'))
            .map((e, i) => {
                const el = e as HTMLElement;
                const r = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                if (r.width < 5 || r.height < 5 || style.visibility === 'hidden' || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.closest('[disabled]')) return null;

                const placeholder = el.getAttribute('placeholder') || '';
                const aria = el.getAttribute('aria-label') || '';
                const name = el.getAttribute('name') || '';
                const role = el.getAttribute('role') || '';
                const type = el.getAttribute('type') || '';

                let labelText = '';
                if (el.id) {
                    const label = document.querySelector(`label[for="${el.id}"]`) as HTMLElement;
                    if (label) labelText = label.innerText || label.textContent || '';
                }
                if (!labelText && el.closest('label')) {
                    const label = el.closest('label') as HTMLElement;
                    labelText = label?.innerText || label?.textContent || '';
                }

                // @ts-ignore
                let selector = window.getVigaSelector(el);
                // @ts-ignore
                const xpath = window.getVigaXPath(el);

                if (el.id) selector = `#${el.id}`;
                else if (name) selector = `${el.tagName.toLowerCase()}[name="${name}"]`;

                const cleanText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100);
                const hint = [labelText, placeholder, aria, name, role, cleanText].filter(Boolean).join(' | ');

                return { i, tag: el.tagName.toLowerCase(), text: cleanText, hint: hint, selector, xpath, attributes: { type, name, id: el.id } };
            })
            .filter(Boolean) as UIElement[];
    });
}

async function smartWaitForElements(page: any, suiteId: string): Promise<UIElement[]> {
    let elements = await getActiveElements(page);
    if (elements.length > 0) return elements;

    await vigaLog(suiteId, '⚠️ Página vacía. Iniciando "Espera Profunda" (hasta 60s)...', 'warning');

    const POLL_MAX = 60000;
    const POLL_INTERVAL = 2000;
    let waited = 0;
    const currentUrl = page.url();

    while (waited < POLL_MAX) {
        await sleep(POLL_INTERVAL);
        waited += POLL_INTERVAL;

        if (page.url() !== currentUrl) {
            await vigaLog(suiteId, `🔄 Navegación detectada: ${page.url()}`, 'info');
            await waitForStableUI(page);
            return await getActiveElements(page);
        }

        elements = await getActiveElements(page);
        if (elements.length > 0) {
            await vigaLog(suiteId, `👀 Elementos aparecieron tras ${waited / 1000}s!`, 'success');
            return elements;
        }

        if (waited % 10000 === 0) {
            await vigaLog(suiteId, `⏳ Esperando carga... (${waited / 1000}s)`, 'info');
        }
    }

    await vigaLog(suiteId, `🛑 Tiempo agotado (${POLL_MAX / 1000}s). Página inactiva.`, 'error');
    return [];
}

const STRIKE_SYSTEM = `
Eres un Agente Autónomo Web (ReAct). Objetivo: "{goal}"

INSTRUCCIONES DE RESPUESTA:
1. "title": TÍTULO CORTO DEL PASO (Ej: "ACTIVAR MODO OSCURO").
2. "thought": Razonamiento (Ej: "Veo el botón Light, lo clickearé para cambiar...").
3. Si el objetivo está cumplido visualmente -> Action: "finish".

IMPORTANTE:
- Revisa el "history" provisto. NO REPITAS acciones que ya hiciste recientemente.
- Si ya intentaste algo y no funcionó, prueba otra estrategia.
- Si te encuentras en un bucle (ej: activando/desactivando lo mismo), DETENTE y marca como "finish" o intenta algo nuevo.

JSON:
{ "title": "...", "thought": "...", "status": "active"|"completed"|"failed", "action": "click"|"type"|"wait"|"finish", "index": number, "payload": "..." }
`;

export async function runStrikeAgent(jobId: string, url: string, suiteId: string, goal: string) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const llmCtx = createLLMContext();

    await vigaLog(suiteId, `🎯 Operación Strike: ${goal}`, 'info');

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch (e) { }

        let steps = 0;
        const MAX_STEPS = 50;
        let lastAction = 'Started Strike Agent';
        const history: string[] = [];

        while (steps < MAX_STEPS) {
            if (page.isClosed()) {
                await vigaLog(suiteId, '⚠️ Página cerrada prematuramente. Finalizando.', 'warning');
                break;
            }

            await waitForStableUI(page);
            const elements = await smartWaitForElements(page, suiteId);
            if (elements.length === 0) break;

            const context = JSON.stringify({
                objective: goal,
                current_url: page.url(),
                page_title: await page.title(),
                last_action: lastAction,
                history: history.slice(-10), // Send last 10 actions
                visible_elements: elements.map(e => ({ i: e.i, tag: e.tag, hint: e.hint }))
            });

            // Update job progress
            await updateJobProgress(jobId, {
                current_step: steps + 1,
                max_steps: MAX_STEPS,
                current_url: page.url(),
                goal: goal
            });

            const systemPrompt = STRIKE_SYSTEM.replace('{goal}', goal);
            const plan = await callGroqJSON(llmCtx, systemPrompt, context);

            if (!plan) break;

            await vigaLog(suiteId, `🤔 (${steps + 1}) ${plan.title || plan.thought}`, 'info');
            history.push(`${plan.title || 'Action'}: ${plan.thought}`);

            if (plan.status === 'completed' || plan.action === 'finish') {
                await vigaLog(suiteId, '✅ Objetivo Cumplido', 'success');
                await recordStep(suiteId, page, 'OBJETIVO CUMPLIDO', 'success', plan.thought || 'Goal achieved');
                break;
            }
            if (plan.status === 'failed') {
                await recordStep(suiteId, page, 'MISIÓN FALLIDA', 'failed', plan.thought || 'Agent failed to achieve goal');
                break;
            }

            steps++;
            try {
                if (plan.action === 'wait') {
                    await sleep(2000);
                } else if (plan.index !== undefined) {
                    const target = elements.find(e => e.i === plan.index);
                    if (target) {
                        lastAction = `${plan.action} on ${target.hint}`;

                        if (plan.action === 'type') {
                            try { await page.fill(target.selector, plan.payload || ''); }
                            catch (e) { if (target.xpath) await page.fill(`xpath=${target.xpath}`, plan.payload || ''); else throw e; }
                        } else {
                            try { await page.click(target.selector, { timeout: 5000 }); }
                            catch (e) { if (target.xpath) await page.click(`xpath=${target.xpath}`, { timeout: 5000 }); else throw e; }
                        }
                        await sleep(3000);
                        await recordStep(suiteId, page, plan.title || plan.thought, 'success', plan.thought, {
                            selector: target.selector,
                            xpath: target.xpath,
                            actionType: plan.action as 'click' | 'type',
                            payload: plan.payload
                        });
                    }
                }
            } catch (err: any) {
                try {
                    await recordStep(suiteId, page, 'ERROR DE EJECUCIÓN', 'failed', err.message);
                } catch { /* Browser closed? */ }
            }
        }
        await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);
    } catch (e: any) {
        await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId);
        throw e;
    } finally {
        await page.close();
        await browser.close().catch(() => { });
    }
}

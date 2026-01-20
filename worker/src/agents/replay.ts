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

async function updateStep(
    stepId: string,
    suiteId: string,
    page: any,
    status: 'success' | 'failed' | 'running' | 'warning',
    description: string = ''
) {
    const evidence = await captureEvidence(page, suiteId, stepId, false);

    const { error } = await supabase.from('test_steps').update({
        status: status,
        screenshot_url: evidence.screenshotUrl,
        expected_result: description
    }).eq('id', stepId);

    if (error) console.error('Error updating step:', error);
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

export async function runReplayAgent(jobId: string, url: string, suiteId: string, recordedSteps: any[]) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const llmCtx = createLLMContext();

    const steps = [...recordedSteps].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    await vigaLog(suiteId, `🔁 Iniciando Regresión: ${steps.length} pasos.`, 'info');

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch (e) { }

        for (let idx = 0; idx < steps.length; idx++) {
            const step = steps[idx];
            await vigaLog(suiteId, `▶️ Paso ${idx + 1}: ${step.title}`, 'info');
            await waitForStableUI(page);

            // Update job progress
            await updateJobProgress(jobId, {
                current_step: idx + 1,
                total_steps: steps.length,
                step_title: step.title
            });

            let success = false;
            let healedSelector = null;

            try {
                // STRATEGY 1: Try saved selector
                if (step.selector || step.xpath) {
                    try {
                        const targetSelector = step.selector || `xpath=${step.xpath}`;

                        if (step.action_type === 'type') {
                            await page.fill(targetSelector, step.action_payload || '', { timeout: 3000 });
                        } else {
                            await page.click(targetSelector, { timeout: 3000 });
                        }

                        success = true;
                        await vigaLog(suiteId, `✅ Selector directo funcionó`, 'success');

                    } catch (selectorError) {
                        await vigaLog(suiteId, `⚠️ Selector roto. Intentando auto-curación...`, 'warning');
                    }
                }

                // STRATEGY 2: AI Self-Healing
                if (!success) {
                    const elements = await smartWaitForElements(page, suiteId);

                    const HEAL_SYSTEM = `
Eres VIGA SELF-HEAL. El selector guardado falló.
Busca el elemento que mejor coincida con: "${step.title}: ${step.expected_result}"
Responde JSON: { "index": number, "confidence": "high"|"low" }
`;

                    const context = JSON.stringify({
                        target_description: `${step.title}: ${step.expected_result}`,
                        visible_elements: elements.map(e => ({ i: e.i, tag: e.tag, hint: e.hint }))
                    });

                    const healing = await callGroqJSON(llmCtx, HEAL_SYSTEM, context);

                    if (healing && healing.index !== undefined) {
                        const newTarget = elements.find(e => e.i === healing.index);

                        if (newTarget) {
                            if (step.action_type === 'type') {
                                await page.fill(newTarget.selector, step.action_payload || '');
                            } else {
                                await page.click(newTarget.selector);
                            }

                            success = true;
                            healedSelector = newTarget.selector;

                            // UPDATE DB with new selector (LEARNING)
                            await supabase.from('test_steps').update({
                                selector: newTarget.selector,
                                xpath: newTarget.xpath
                            }).eq('id', step.id);

                            await vigaLog(suiteId, `🔧 Auto-curado! Nuevo selector guardado.`, 'success');
                        }
                    }
                }

                await sleep(2000);

                if (success) {
                    await updateStep(step.id, suiteId, page, 'success', healedSelector ? 'Auto-curado exitosamente' : 'Regresión OK');
                } else {
                    await updateStep(step.id, suiteId, page, 'failed', 'No se pudo ejecutar ni auto-curar');
                }

            } catch (e: any) {
                await updateStep(step.id, suiteId, page, 'failed', `Error: ${e.message}`);
            }
        }

        await vigaLog(suiteId, '✅ Regresión Finalizada', 'success');
        await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);
    } catch (e: any) {
        await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId);
        throw e;
    } finally {
        await page.close();
        await browser.close().catch(() => { });
    }
}

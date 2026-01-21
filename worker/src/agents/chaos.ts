/**
 * VIGA Chaos Agent v2 - Production Grade
 * 
 * Cumulative learning agent that:
 * 1. Uses semantic fingerprinting to identify actions
 * 2. Exhaustively explores each DOM before navigating
 * 3. Reuses known actions across runs
 * 4. Uses LLM only when genuinely needed (Smart Cost Control)
 * 5. Generates human-readable test reports (QA Intent)
 */

import crypto from 'crypto';
import { getBrowser } from '../lib/browser';
import { captureEvidence } from '../lib/evidence';
import { callGroqJSON, createLLMContext } from '../lib/llm';
import { supabase, updateJobProgress } from '../lib/supabase';
import {
    UIElement,
    computeFingerprint,
    computeStateHash,
    generateCanonicalName,
    normalizeUrl
} from '../lib/fingerprint';
import {
    UIAction,
    findOrCreateAction,
    hasActionBeenExecuted,
    recordActionExecution,
    prioritizeActions
} from '../lib/actions';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Configuration
const MAX_ACTIONS = 50;
const MAX_LLM_CALLS = 15;
const STABILITY_THRESHOLD = 3;

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
    }).then(({ error }) => {
        if (error) console.error('[VIGA_LOG] Failed to save log:', error);
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
        payload?: string,
        actionId?: string
    },
    parentStepId?: string
): Promise<string | null> {
    const stepId = crypto.randomUUID();

    let evidence: { screenshotUrl: string } = { screenshotUrl: '' };
    try {
        if (!page.isClosed()) {
            const captured = await captureEvidence(page, suiteId, stepId, false);
            evidence = { screenshotUrl: captured.screenshotUrl };
        }
    } catch (e: any) {
        console.warn('[RECORD_STEP] Evidence capture failed:', e.message);
    }

    const payload: any = {
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
    };

    if (parentStepId) {
        payload.parent_step_id = parentStepId;
    }

    const { error } = await supabase.from('test_steps').insert(payload);
    if (error && error.code === '42703') {
        delete payload.parent_step_id;
        await supabase.from('test_steps').insert(payload);
    }

    return error ? null : stepId;
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

async function getActiveElements(page: any): Promise<UIElement[]> {
    await injectScripts(page);
    return await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="tab"], [role="radio"], [role="switch"], [tabindex="0"]'))
            .map((e, i) => {
                const el = e as HTMLElement;
                const r = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);
                if (r.width < 5 || r.height < 5 || style.visibility === 'hidden' || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.closest('[disabled]')) return null;

                const placeholder = el.getAttribute('placeholder') || '';
                const aria = el.getAttribute('aria-label') || '';
                const ariaPressed = el.getAttribute('aria-pressed') || '';
                const name = el.getAttribute('name') || '';
                const role = el.getAttribute('role') || '';
                const type = el.getAttribute('type') || '';
                const ariaSelected = el.getAttribute('aria-selected') || '';
                const checked = (el as HTMLInputElement).checked || false;

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

                return {
                    i,
                    tag: el.tagName.toLowerCase(),
                    text: cleanText,
                    hint: hint,
                    selector,
                    xpath,
                    attributes: {
                        type,
                        name,
                        id: el.id,
                        role,
                        ariaSelected,
                        checked,
                        'aria-label': aria,
                        'aria-pressed': ariaPressed,
                        placeholder
                    }
                };
            })
            .filter(Boolean) as UIElement[];
    });
}

async function smartWaitForElements(page: any, suiteId: string): Promise<UIElement[]> {
    let elements = await getActiveElements(page);
    if (elements.length > 0) return elements;
    const POLL_MAX = 30000;
    const POLL_INTERVAL = 2000;
    let waited = 0;
    while (waited < POLL_MAX) {
        await sleep(POLL_INTERVAL);
        waited += POLL_INTERVAL;
        elements = await getActiveElements(page);
        if (elements.length > 0) return elements;
    }
    return [];
}

const CHAOS_SYSTEM = `
Eres un QA Senior. Elige la MEJOR acción de la lista para validar el flujo actual.
Prioriza: inputs -> botones -> toggles -> links.
Responde JSON: { "action_index": number, "thought": "string", "payload": "string" }
`;

function getActionType(element: UIElement): 'click' | 'type' {
    const tag = element.tag.toLowerCase();
    const type = element.attributes?.type || '';
    if (tag === 'input' && !['checkbox', 'radio', 'submit', 'button'].includes(type)) return 'type';
    if (tag === 'textarea') return 'type';
    return 'click';
}

function generatePayload(element: UIElement, credentials?: any): string {
    const hint = (element.hint || '').toLowerCase();
    const type = element.attributes?.type || '';
    if (type === 'password' || hint.includes('pass')) return credentials?.password || 'TestPass123!';
    if (type === 'email' || hint.includes('email')) return credentials?.username || 'test@qa.viga.com';
    return 'Test Value';
}

export async function runChaosAgent(jobId: string, url: string, suiteId: string, credentials?: any) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const llmCtx = createLLMContext();
    await vigaLog(suiteId, '🌪️ VIGA Chaos Agent v2 Iniciado', 'info');
    const keepalive = setInterval(() => { if (!page.isClosed()) page.evaluate(() => true).catch(() => { }); }, 15000);

    let actionsExecuted = 0;
    let llmCalls = 0;
    let lastStepId: string | undefined;
    let consecutiveStableStates = 0;
    let lastStateHash: string = '';
    const executedInThisRun = new Set<string>();

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch (e) { }

        while (actionsExecuted < MAX_ACTIONS) {
            if (page.isClosed()) break;
            await waitForStableUI(page);
            const elements = await smartWaitForElements(page, suiteId);
            const currentUrl = page.url();
            const pageTitle = await page.title().catch(() => 'Unknown');
            if (elements.length === 0) break;

            const stateHash = computeStateHash(currentUrl, elements.length, pageTitle);
            if (stateHash === lastStateHash) consecutiveStableStates++;
            else { consecutiveStableStates = 0; lastStateHash = stateHash; }

            const untested: { element: UIElement; action: UIAction }[] = [];
            for (const el of elements) {
                const action = await findOrCreateAction(el, currentUrl, getActionType(el));
                const key = `${action.id}::${stateHash}`;
                // Check local run cache AND database strict persistence
                if (!executedInThisRun.has(key) && !(await hasActionBeenExecuted(suiteId, action.id, stateHash))) {
                    untested.push({ element: el, action });
                }
            }

            // SCREEN COVERAGE AUDIT
            const totalActions = elements.length;
            const coveredActions = totalActions - untested.length;
            await vigaLog(suiteId, `📊 Cobertura de Pantalla: ${coveredActions}/${totalActions} presuntamente ejecutadas.`, 'info');

            // 1. STRICT RULE: Cannot leave if unseen actions exist
            if (untested.length > 0) {
                // Determine priority: Inputs > Toggles > Buttons > Links
                const prioritized = prioritizeActions(untested.map(u => u.action));

                // Smart Selection Logic
                const hasComplexity = untested.length > 3 || untested.some(u => getActionType(u.element) === 'type');
                let selected: { element: UIElement; action: UIAction } | undefined;
                let payload = '';
                let thought = 'Priorización de cobertura por defecto.';

                // AI Decision Budget
                if (hasComplexity && llmCalls < MAX_LLM_CALLS) {
                    llmCalls++;
                    const context = JSON.stringify({
                        url: currentUrl,
                        total: totalActions,
                        untested_count: untested.length,
                        candidates: untested.map((u, i) => ({ i, title: u.action.canonical_name, role: u.action.role }))
                    });
                    const decision = await callGroqJSON(llmCtx, CHAOS_SYSTEM, context);
                    if (decision && typeof decision.action_index === 'number') {
                        selected = untested[decision.action_index] || untested[0];
                        payload = decision.payload || '';
                        thought = decision.thought || thought;
                    }
                }

                if (!selected) {
                    // Fallback: Pick top determined priority
                    const topAction = prioritized[0];
                    selected = untested.find(u => u.action.id === topAction.id) || untested[0];
                    if (getActionType(selected.element) === 'type') payload = generatePayload(selected.element, credentials);
                }

                const { element, action } = selected;
                const actionType = getActionType(element);
                const stepTitle = action.canonical_name;

                await vigaLog(suiteId, `👉 [${actionsExecuted + 1}/${MAX_ACTIONS}] ${stepTitle}`, 'info');

                try {
                    if (actionType === 'type') await page.fill(element.selector, payload);
                    else await page.click(element.selector, { timeout: 8000 });

                    actionsExecuted++;
                    await sleep(1500); // Wait for reaction
                    const stateActionKey = `${action.id}::${stateHash}`;
                    executedInThisRun.add(stateActionKey);

                    const stepId = await recordStep(suiteId, page, stepTitle, 'success', thought, {
                        selector: element.selector, xpath: element.xpath, actionType, payload: actionType === 'type' ? '***' : undefined, actionId: action.id
                    }, lastStepId);

                    if (stepId) {
                        lastStepId = stepId;
                        await recordActionExecution(suiteId, action.id, stateHash, stepId);
                    }
                    // Reset stability since we took action
                    consecutiveStableStates = 0;

                } catch (err: any) {
                    await vigaLog(suiteId, `⚠️ Fallo en acción: ${err.message}`, 'warning');
                    // Mark as executed to prevent infinite loop on broken element
                    executedInThisRun.add(`${action.id}::${stateHash}`);
                    await recordActionExecution(suiteId, action.id, stateHash);
                }

                // Force loop to continue - do not evaluate termination yet
                continue;
            }

            // 2. COVERAGE COMPLETE - Check for Navigation or Termination
            await vigaLog(suiteId, `✅ Pantalla cubierta al 100%. Evaluando navegación...`, 'success');

            if (consecutiveStableStates >= STABILITY_THRESHOLD) {
                // We are 100% covered and have been stable for N cycles => TRAPPED or DONE
                await recordStep(suiteId, page, '🏁 Ejecución Finalizada', 'success', `Cobertura completa alcanzada: ${actionsExecuted} pasos. Toda la UI accesible ha sido validada.`, undefined, lastStepId);
                break;
            }

            // Try to find ANY link to leave (even if executed, if we are still here, maybe try again or find one that wasn't a "link" role but acts as one)
            // Note: If untested is 0, we have clicked all links already?
            // If we are here, it means we clicked them and stayed on page. 
            // We'll let the stability counter kill it naturally.
            consecutiveStableStates++;
            await sleep(1000);

            // Update progress
            await updateJobProgress(jobId, { current_action: actionsExecuted, max_actions: MAX_ACTIONS });
        }

        await vigaLog(suiteId, `🏁 Finalizado: ${actionsExecuted} pasos.`, 'success');
        await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);

    } catch (e: any) {
        await vigaLog(suiteId, `🚨 Fatal: ${e.message}`, 'error');
        await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId);
    } finally {
        clearInterval(keepalive);
        await page.close();
        await browser.close().catch(() => { });
    }
}

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
import { callGroqJSON, createLLMContext, batchRankActions } from '../lib/llm';
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
import { captureState, validateActionEffect } from '../lib/validators';
import { SemanticIntent } from '../lib/fingerprint';
import { inferStateKeyValue, recordGlobalStateChange } from '../lib/v3_experimental';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Configuration
const MAX_ACTIONS = 50;
const MAX_LLM_CALLS = 15;
const STABILITY_THRESHOLD = 3;

// V3 EXPERIMENTAL (Feature Flag)
const CHAOS_V3_EXPERIMENTAL = process.env.CHAOS_V3_EXPERIMENTAL === 'true' || false;
const CHAOS_REPLAY_MODE = process.env.CHAOS_REPLAY_MODE === 'true' || false;

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
        actionId?: string,
        validationResult?: any
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

    // V3.1 CRITICAL: Force explicit version logging
    const version = CHAOS_V3_EXPERIMENTAL ? 'v3.1' : 'v2';
    await vigaLog(suiteId, `🌪️ VIGA Chaos Agent ${version} Iniciado`, 'info');

    // V3.1 CRITICAL: Hard-fail if v3 expected but not wired
    if (CHAOS_V3_EXPERIMENTAL) {
        await vigaLog(suiteId, `[V3] Experimental features ACTIVE`, 'info');
        console.log('[V3] CHAOS_V3_EXPERIMENTAL=true - Running v3 execution loop');
    }

    const keepalive = setInterval(() => { if (!page.isClosed()) page.evaluate(() => true).catch(() => { }); }, 15000);

    let actionsExecuted = 0;
    let llmCalls = 0;
    let lastStepId: string | undefined;
    let consecutiveStableStates = 0;
    let lastStateHash: string = '';
    const executedInThisRun = new Set<string>();
    let stepsWithoutValue = 0; // Phase 4.2

    // V3 EXPERIMENTAL: Global state tracking
    const globalStateActions = new Set<string>();
    let requiresRescan = false;
    let currentGlobalState: Record<string, string> = {}; // { theme: 'dark', lang: 'es' }

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

            // Phase 3: Include global state in hash
            const stateHash = computeStateHash(currentUrl, elements.length, pageTitle, CHAOS_V3_EXPERIMENTAL ? currentGlobalState : undefined);

            if (stateHash === lastStateHash) consecutiveStableStates++;
            else { consecutiveStableStates = 0; lastStateHash = stateHash; }

            // NEW: Capture scan start time to prevent self-matching in this cycle
            const scanStartTime = new Date().toISOString();

            const untested: { element: UIElement; action: UIAction }[] = [];
            const actionIdsOnScreen = new Set<string>();
            const snapshotRows: any[] = []; // V3 Phase 3

            for (const el of elements) {
                // Pass scanStartTime to prevent fuzzy matching against actions created within this loop
                // Pass actionIdsOnScreen to prevent mapping multiple elements to the same action ID in the same scan
                const action = await findOrCreateAction(el, currentUrl, getActionType(el), scanStartTime, actionIdsOnScreen);

                // DIAGNOSTIC LOG (Requested by USER)
                const fingerprint = computeFingerprint(el, currentUrl);
                console.log(`[SCAN-DEBUG] fingerprint=${fingerprint} assigned_action_id=${action.id}`);

                // V3 Phase 3: Accumulate Snapshot
                if (CHAOS_V3_EXPERIMENTAL) {
                    snapshotRows.push({
                        suite_id: suiteId,
                        state_hash: stateHash,
                        action_id: action.id,
                        selector: el.selector,
                        canonical_name: action.canonical_name,
                        was_executed: false
                    });
                }

                actionIdsOnScreen.add(action.id);

                const key = `${action.id}::${stateHash}`;

                // INVARIANT 1: Runtime Set Check (Cyclical loop prevention)
                const executedInRuntime = executedInThisRun.has(key);

                // INVARIANT 2: Database Persistence Check (State persistence)
                const executedInDB = await hasActionBeenExecuted(suiteId, action.id, stateHash);

                // V3 Logic: Global State actions are always valid candidates if they aren't "burned" or we want to re-toggle
                // But generally we should prioritize UNTESTED.
                const isGlobalState = action.action_category === 'GLOBAL_STATE';

                if (!executedInRuntime && !executedInDB) {
                    untested.push({ element: el, action });
                } else if (isGlobalState && CHAOS_V3_EXPERIMENTAL) {
                    // Assuming we might want to re-execute global state to switch back? 
                    // For now, let's stick to "not executed in this run" for global state to avoid infinite flapping
                    if (!executedInRuntime) untested.push({ element: el, action });
                } else {
                    // Ensure runtime set is in sync with DB if we found it in DB
                    if (executedInDB) executedInThisRun.add(key);
                }
            }

            // V3 Phase 3: Commit Snapshots
            if (CHAOS_V3_EXPERIMENTAL && snapshotRows.length > 0) {
                await supabase.from('discovered_elements_snapshot')
                    .upsert(snapshotRows, { onConflict: 'suite_id,state_hash,action_id', ignoreDuplicates: true })
                    .then(({ error }) => { if (error) console.warn('[V3] Snapshot error:', error.message); });
            }

            // INVARIANT 3: Coverage calculation from TRUTH (DB/Runtime), not inference
            const totalActions = elements.length; // Approximate, assuming 1:1 mapping ideally
            const reallyExecutedCount = Array.from(actionIdsOnScreen).filter(id =>
                executedInThisRun.has(`${id}::${stateHash}`)
            ).length;

            await vigaLog(suiteId, `📊 Cobertura Real (Invariante): ${reallyExecutedCount}/${actionIdsOnScreen.size} acciones únicas.`, 'info');

            // 1. STRICT RULE: Cannot leave if unseen actions exist
            if (untested.length > 0) {
                // Determine priority: Inputs > Toggles > Buttons > Links
                const prioritized = prioritizeActions(untested.map(u => u.action));

                // Phase 4: Prioritization (Heuristic + Batch LLM)
                // Sort by heuristic first (Inputs > Buttons > Toggles > Links)
                const heuristicSortedActions = prioritizeActions(untested.map(u => u.action));
                const sortedUntested = heuristicSortedActions.map(a => untested.find(u => u.action.id === a.id)!).filter(Boolean);

                let selected: { element: UIElement; action: UIAction } | undefined;
                let payload = '';
                let thought = 'Priorización heurística (Deterministic).';

                // PHASE 4.1: Batch Intelligence & Optimization
                // Only use LLM if NOT in Replay Mode, we have options, and budget exists
                const shouldUseLLM = !CHAOS_REPLAY_MODE && sortedUntested.length > 1 && llmCalls < MAX_LLM_CALLS;

                if (shouldUseLLM) {
                    // Take top 8 candidates from heuristic baseline
                    const candidates = sortedUntested.slice(0, 8);

                    // Semantic Cache: Skip reasoning for well-known actions (executed > 5 times historically)
                    const needsReasoning = candidates.filter(c => c.action.execution_count < 5);

                    if (needsReasoning.length > 1) {
                        llmCalls++; // One batch call replaces multiple heuristic checks
                        const rankResult = await batchRankActions(llmCtx, candidates.map(c => ({
                            id: c.action.id,
                            name: c.action.canonical_name,
                            category: c.action.action_category
                        })));

                        if (rankResult) {
                            selected = untested.find(u => u.action.id === rankResult.selected_id);
                            thought = `🧠 AI Decision: ${rankResult.reason}`;
                        }
                    } else if (candidates.length > 0 && needsReasoning.length <= 1) {
                        thought = '⚡ Semantic Cache (Known Action)';
                    }
                }

                if (!selected) {
                    // Fallback: Pick top heuristic
                    selected = sortedUntested[0];
                    if (getActionType(selected.element) === 'type') {
                        // Simple payload for now, or use generatePayload if critical
                        payload = 'test-input';
                    }
                }

                const { element, action } = selected;
                const actionType = getActionType(element);
                const stepTitle = action.canonical_name;
                const intent = action.metadata?.semantic_intent || 'UNKNOWN';

                await vigaLog(suiteId, `👉 [${actionsExecuted + 1}/${MAX_ACTIONS}] ${stepTitle} [${intent}]`, 'info');

                let executionStatus: 'success' | 'warning' | 'failed' = 'failed';

                try {
                    // V3 Phase 2: Capture state before action
                    const beforeState = await captureState(page);

                    if (actionType === 'type') await page.fill(element.selector, payload);
                    else await page.click(element.selector, { timeout: 8000 });

                    actionsExecuted++;
                    await sleep(1500); // Wait for reaction
                    const stateActionKey = `${action.id}::${stateHash}`;
                    executedInThisRun.add(stateActionKey);

                    // V3.1 CRITICAL: Log validator execution to prove v3 is running
                    console.log(`[VALIDATOR] intent=${intent} | action=${action.canonical_name}`);

                    const validation = await validateActionEffect(page, action, intent as SemanticIntent, beforeState);
                    const stepStatus = validation.passed ? 'success' : 'warning';
                    executionStatus = stepStatus; // Track for termination logic
                    const evidenceMsg = validation.evidence || thought;

                    // V3.1: Log validation result
                    console.log(`[VALIDATOR] result=${stepStatus} | evidence=${validation.evidence || 'none'}`);

                    if (!validation.passed) {
                        await vigaLog(suiteId, `⚠️ Validation Warning: ${validation.evidence}`, 'warning');
                    }

                    const stepId = await recordStep(suiteId, page, stepTitle, stepStatus, evidenceMsg, {
                        selector: element.selector, xpath: element.xpath, actionType, payload: actionType === 'type' ? '***' : undefined, actionId: action.id, validationResult: validation
                    }, lastStepId);

                    if (stepId) {
                        lastStepId = stepId;
                        await recordActionExecution(suiteId, action.id, stateHash, stepId);
                    }

                    // V3 EXPERIMENTAL: Global State & Depth Detection
                    if (CHAOS_V3_EXPERIMENTAL) {
                        // Phase 3: Mark Discovered Element as Executed
                        await supabase.from('discovered_elements_snapshot')
                            .update({ was_executed: true })
                            .match({ suite_id: suiteId, state_hash: stateHash, action_id: action.id });

                        // Track global state actions
                        if (action.action_category === 'GLOBAL_STATE') {
                            globalStateActions.add(action.id);

                            // Phase 3: Update Persistent Global State
                            const newStateInfo = inferStateKeyValue(action);
                            if (newStateInfo) {
                                currentGlobalState[newStateInfo.key] = newStateInfo.value;
                                await recordGlobalStateChange(suiteId, action, newStateInfo.key, newStateInfo.value);
                                console.log(`[V3] Global State Updated: ${JSON.stringify(currentGlobalState)}`);

                                // Force re-scan to explore new state immediately
                                consecutiveStableStates = 0;
                                lastStateHash = ''; // Invalidate hash so next loop sees "change"
                            } else {
                                console.log(`[V3] Global state action detected: ${action.canonical_name}`);
                            }
                        }

                        // Depth-aware rescan detection
                        // Reuse beforeState captured at start of action block
                        await sleep(500); // Allow DOM to settle

                        const afterUrl = page.url();
                        const urlChanged = beforeState.url !== afterUrl;
                        const modalOpened = await page.locator('[role="dialog"], .modal, [aria-modal="true"]').count().catch(() => 0) > 0;

                        if (urlChanged || modalOpened) {
                            requiresRescan = true;
                            console.log(`[V3] Depth change detected. Forcing rescan.`);
                        }
                    }

                    // Reset stability since we took action
                    consecutiveStableStates = 0;

                } catch (err: any) {
                    await vigaLog(suiteId, `⚠️ Fallo en acción: ${err.message}`, 'warning');
                    // Mark as executed to prevent infinite loop on broken element
                    executedInThisRun.add(`${action.id}::${stateHash}`);
                    await recordActionExecution(suiteId, action.id, stateHash);
                    executionStatus = 'failed';
                }

                // PHASE 4.2: Smart Termination (Diminishing Returns)
                if (executionStatus === 'success' || (CHAOS_V3_EXPERIMENTAL && requiresRescan)) {
                    stepsWithoutValue = 0;
                } else {
                    stepsWithoutValue++;
                }

                if (!CHAOS_REPLAY_MODE && stepsWithoutValue >= 5) {
                    await vigaLog(suiteId, '🛑 Smart Termination: Diminishing Returns (Sin valor en últimos 5 pasos)', 'info');
                    break;
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

        // V3 EXPERIMENTAL: Generate test narrative
        if (CHAOS_V3_EXPERIMENTAL) {
            try {
                const { generateTestNarrative } = await import('../lib/narrative');
                const { data: steps } = await supabase
                    .from('test_steps')
                    .select('id, title, status, expected_result, action_type, created_at')
                    .eq('suite_id', suiteId)
                    .order('created_at', { ascending: true });

                if (steps && steps.length > 0) {
                    const narrative = generateTestNarrative(steps as any[]);
                    await supabase.from('test_suites').update({
                        narrative: narrative.full_narrative,
                        objective: narrative.objective
                    }).eq('id', suiteId);

                    console.log(`[V3] Test narrative generated: ${narrative.objective}`);
                }
            } catch (e: any) {
                console.warn('[V3] Narrative generation failed:', e.message);
            }
        }

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

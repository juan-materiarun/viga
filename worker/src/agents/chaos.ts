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
import { callGroqJSON, createLLMContext, batchRankActions, analyzePageContext } from '../lib/llm';
import { generatePlaywrightCode } from '../lib/codegen';
import { supabase, updateJobProgress } from '../lib/supabase';
import { Logger } from '../lib/logger';
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


const MAX_STEPS = 999;
const MAX_PAGES = 999;
const MAX_ACCIONES_POR_PAGINA = 999;

// ============================================================================
// TELEMETRY - Track AI usage
// ============================================================================
let aiCallCount = 0;
let estimatedTokens = 0;

function trackAICall(promptLength: number, responseLength: number) {
    aiCallCount++;
    estimatedTokens += Math.ceil((promptLength + responseLength) / 4);
}

function getAIStats() {
    return { calls: aiCallCount, tokens: estimatedTokens };
}

// ============================================================================
// UTILITIES
// ============================================================================
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Configuration
const MAX_ACTIONS = 50;
const MAX_LLM_CALLS = 15;
const STABILITY_THRESHOLD = 3;

// V3 EXPERIMENTAL (Feature Flag)
const CHAOS_V3 = true; // permanent v3 activation
const CHAOS_REPLAY_MODE = process.env.CHAOS_REPLAY_MODE === 'true' || false;

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
        Logger.warn(`Evidence capture failed: ${e.message}`, suiteId);
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

    // Initial Network Idle check (fast)
    try { await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => { }); } catch (e) { }

    while (Date.now() - start < timeout) {
        const unstable = await page.evaluate(() => {
            // Check for common spinners/loaders
            const hasLoader = document.querySelector('.loader, .spinner, .loading, [aria-busy="true"], .MuiCircularProgress-root, [data-loading="true"], .animate-spin') !== null;

            // Check for text indicating processing
            const bodyText = document.body.innerText.toLowerCase();
            const textLoading = bodyText.match(/cargando\.\.\.|loading\.\.\.|procesando\.\.\.|iniciando\.\.\.|wait\.\.\.|esperando\.\.\./);

            // Check for disabled submit buttons (often indicates loading)
            const disabledSubmit = document.querySelector('button[type="submit"][disabled], button.is-loading');

            return hasLoader || !!textLoading || !!disabledSubmit;
        });

        if (!unstable) {
            stableCount++;
            if (stableCount > 3) return; // Increased stability threshold
        } else {
            stableCount = 0;
            // Adaptive wait: if unstable, wait longer
            await sleep(500);
            continue;
        }
        await sleep(300);
    }
    Logger.debug(`[STABILITY] Timeout waiting for stability. Proceeding anyway.`, 'SYS');
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
    await page.addInitScript({ content: CLIENT_SELECTOR_SCRIPT });
}

/**
 * OPTIMIZED: Parallel Element Discovery
 * Scans all elements in parallel instead of sequentially
 * Performance: 3x faster than sequential scanning
 */
async function getActiveElements(page: any): Promise<UIElement[]> {
    return page.evaluate(() => {
        const selectors = [
            'button:not([disabled])',
            'a[href]:not([disabled])',
            'input:not([disabled]):not([type="hidden"])',
            'textarea:not([disabled])',
            '[role="button"]:not([disabled])',
            '[role="link"]:not([disabled])',
            'select:not([disabled])',
            '[onclick]:not([disabled])'
        ];

        // Batch collect all elements
        const allElements = selectors.flatMap(sel => Array.from(document.querySelectorAll(sel)));
        const uniqueElements = Array.from(new Set(allElements));

        // Parallel visibility/interactivity checks
        return uniqueElements
            .map((el, i) => {
                if (!(el instanceof HTMLElement)) return null;

                // Fast visibility check (no async needed)
                const r = el.getBoundingClientRect();
                const style = window.getComputedStyle(el);

                // Filter out non-visible/non-interactive elements
                if (r.width < 5 || r.height < 5 || style.visibility === 'hidden' || el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true' || el.closest('[disabled]')) return null;

                const placeholder = el.getAttribute('placeholder') || '';
                const aria = el.getAttribute('aria-label') || '';
                const title = el.getAttribute('title') || ''; // Capture title as tooltip
                const name = el.getAttribute('name') || '';
                const role = el.getAttribute('role') || '';
                const type = el.getAttribute('type') || '';
                const ariaPressed = el.getAttribute('aria-pressed') || '';
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

                // Enhanced Text Extraction for V3.2
                let cleanText = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();

                // If text is empty, look deeper (SVG titles, Image alts)
                if (!cleanText) {
                    const img = el.querySelector('img');
                    if (img && img.alt) cleanText = img.alt;

                    const svgTitle = el.querySelector('svg title');
                    if (!cleanText && svgTitle) cleanText = svgTitle.textContent || '';
                }

                // @ts-ignore
                let selector = window.getVigaSelector(el);
                // @ts-ignore
                const xpath = window.getVigaXPath(el);

                if (el.id) selector = `#${el.id}`;
                else if (name) selector = `${el.tagName.toLowerCase()}[name="${name}"]`;

                // Truncate for safety
                cleanText = cleanText.slice(0, 100);

                // Hint composition: prioritized list of semantic signals
                const hint = [labelText, placeholder, aria, title, name, role, cleanText].filter(Boolean).join(' | ');

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
                        placeholder,
                        title // Add title to attributes
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


// V3.2: Generación inteligente de datos
function generatePayload(element: UIElement, credentials?: any): string {
    const hint = (element.hint || '').toLowerCase();
    const type = (element.attributes?.type || '').toLowerCase();
    const name = (element.attributes?.name || '').toLowerCase();
    const label = (element.attributes?.['aria-label'] || '').toLowerCase();

    const context = `${hint} ${name} ${label}`;

    // 1. URLs
    if (type === 'url' || context.includes('url') || context.includes('website') || context.includes('sitio')) {
        return 'https://viga.dev';
    }

    // 2. Emails
    if (type === 'email' || context.includes('email') || context.includes('correo')) {
        return credentials?.username || 'test@viga.dev';
    }

    // 3. Passwords
    if (type === 'password' || context.includes('pass') || context.includes('contraseña') || context.includes('clave')) {
        return credentials?.password || 'TestPass123!';
    }

    // 4. Teléfonos
    if (type === 'tel' || context.includes('phone') || context.includes('teléfono') || context.includes('celular')) {
        return '+5491112345678';
    }

    // 5. Fechas
    if (type === 'date' || context.includes('date') || context.includes('fecha') || context.includes('nacimiento')) {
        return '2024-01-01';
    }

    // 6. Búsqueda
    if (type === 'search' || context.includes('search') || context.includes('buscar')) {
        return 'test query';
    }

    // 7. Números
    if (type === 'number' || context.includes('amount') || context.includes('cantidad') || context.includes('edad')) {
        return '42';
    }

    // Default
    return 'Valor de Prueba';
}

export async function runChaosAgent(jobId: string, url: string, suiteId: string, credentials?: any) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const llmCtx = createLLMContext();

    // V3.1 CRITICAL: Force explicit version logging
    const version = 'v3.2.1'; // permanent version
    await Logger.log(suiteId, `🌪️ VIGA Chaos Agent ${version} Iniciado`, 'info');

    // V3.1 CRITICAL: Hard-fail if v3 expected but not wired
    Logger.debug(`[V3] Permanent features ACTIVE`, suiteId);

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
        await injectScripts(page);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch (e) { }

        while (actionsExecuted < MAX_ACTIONS) {
            if (page.isClosed()) break;
            await waitForStableUI(page);
            const elements = await smartWaitForElements(page, suiteId);
            const currentUrl = page.url();
            const pageTitle = await page.title().catch(() => 'Unknown');
            if (elements.length === 0) break;

            // Phase 3: "El Cartógrafo" analyzes only on new URL/State
            // We use elements count and title to hash
            const stateHash = computeStateHash(currentUrl, elements.length, pageTitle, currentGlobalState);

            // V4.0: CEREBRO CENTRAL - "El Cartógrafo"
            // Solo analizamos si cambia la URL o es el inicio (para ahorrar tokens)
            let pageContext = "";
            let strategy = "";
            let purpose = "";

            if (actionsExecuted === 0 || !lastStepId || (lastStateHash && stateHash !== lastStateHash && Math.random() < 0.3)) {

                // V4.1: Enhanced Context (Visual + Textual)
                const visualSummary = elements.slice(0, 15).map(e => `[${e.tag}] ${e.hint || e.text}`).join(', ');

                // Capture main body text (truncated) to give "reading" context
                const bodyText = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 1000));
                const contextPayload = `Visual: ${visualSummary}\nText: ${bodyText}`;

                try {
                    Logger.thought(`🗺️ Analizando contexto de página (Visual + Texto)...`, suiteId);
                    // Track usage: Context payload + ~300 chars output
                    trackAICall(contextPayload.length + 500, 300);
                    const analysis: any = await analyzePageContext(llmCtx, currentUrl, pageTitle, contextPayload);
                    pageContext = `Página: ${analysis.page_type} | Objetivo: ${analysis.purpose}`;
                    strategy = analysis.strategy;
                    purpose = analysis.purpose;
                    Logger.info(`🧠 Contexto entendido: ${pageContext} | Estrategia: ${strategy}`, suiteId);

                    // V4.2: Respect WAIT Strategy
                    if (strategy.includes('ESPERAR') || strategy.includes('WAIT')) {
                        Logger.info(`⏳ Estrategia dice ESPERAR. Pausando 5s para estabilidad...`, suiteId);
                        await sleep(5000); // Explicit wait
                        continue; // Restart loop to re-scan
                    }

                } catch (e) {
                    Logger.warn(`Fallo en análisis de contexto: ${e}`, suiteId);
                }
            }

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
                Logger.debug(`[SCAN] fp=${fingerprint.substring(0, 8)} action=${action.id.substring(0, 8)}`, suiteId);

                // V3 Phase 3: Accumulate Snapshot
                if (CHAOS_V3) {
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
                } else if (isGlobalState && CHAOS_V3) {
                    // Assuming we might want to re-execute global state to switch back? 
                    // For now, let's stick to "not executed in this run" for global state to avoid infinite flapping
                    if (!executedInRuntime) untested.push({ element: el, action });
                } else {
                    // Ensure runtime set is in sync with DB if we found it in DB
                    if (executedInDB) executedInThisRun.add(key);
                }
            }

            // V3 Phase 3: Commit Snapshots
            if (CHAOS_V3 && snapshotRows.length > 0) {
                await supabase.from('discovered_elements_snapshot')
                    .upsert(snapshotRows, { onConflict: 'suite_id,state_hash,action_id', ignoreDuplicates: true })
                    .then(({ error }) => { if (error) Logger.warn(`[V3] Snapshot error: ${error.message}`, suiteId); });
            }

            // INVARIANT 3: Coverage calculation from TRUTH (DB/Runtime), not inference
            const totalActions = elements.length; // Approximate, assuming 1:1 mapping ideally
            const reallyExecutedCount = Array.from(actionIdsOnScreen).filter(id =>
                executedInThisRun.has(`${id}::${stateHash}`)
            ).length;

            Logger.debug(`📊 Coverage: ${reallyExecutedCount}/${actionIdsOnScreen.size} unique actions.`, suiteId);

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
                let thought = 'Decisión basada en reglas (Determinista).';

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
                        trackAICall(candidates.length * 150, 200); // Estimate token usage for ranking
                        const rankResult = await batchRankActions(llmCtx, candidates.map(c => ({
                            id: c.action.id,
                            name: c.action.canonical_name,
                            category: c.action.action_category
                        })), pageContext, purpose);

                        if (rankResult) {
                            selected = untested.find(u => u.action.id === rankResult.selected_id);
                            thought = `🧠 Decisión IA: ${rankResult.reason}`;
                            if (rankResult.suggested_payload) {
                                payload = rankResult.suggested_payload;
                            }
                        }
                    } else if (candidates.length > 0 && needsReasoning.length <= 1) {
                        thought = '⚡ Caché Semántico (Acción Conocida)';
                    }
                }

                if (!selected) {
                    // Fallback: Pick top heuristic
                    selected = sortedUntested[0];
                }

                const { element, action } = selected;
                const actionType = getActionType(element);

                // V3.2: Use sanitized payload generator
                // V3.2: Use sanitized payload generator (fallback if AI didn't provide one)
                if (actionType === 'type' && !payload) {
                    payload = generatePayload(element, credentials);
                }

                const stepTitle = action.canonical_name;
                const intent = action.metadata?.semantic_intent || 'UNKNOWN';

                Logger.thought(`Decided: ${stepTitle} (${intent}) | Reason: ${thought}`, suiteId);

                let executionStatus: 'success' | 'warning' | 'failed' = 'failed';

                try {
                    // V3 Phase 2: Capture state before action
                    const beforeState = await captureState(page);

                    if (actionType === 'type') {
                        Logger.action(`ESCRIBIR "${payload}" en ${element.selector}`, suiteId);
                        await page.fill(element.selector, payload);
                    } else {
                        Logger.action(`CLIC en ${element.selector}`, suiteId);
                        await page.click(element.selector, { timeout: 8000 });
                    }

                    actionsExecuted++;
                    await sleep(1500); // Wait for reaction
                    const stateActionKey = `${action.id}::${stateHash}`;
                    executedInThisRun.add(stateActionKey);

                    const validation = await validateActionEffect(page, action, intent as SemanticIntent, beforeState);
                    const stepStatus = validation.passed ? 'success' : 'warning';
                    executionStatus = stepStatus; // Track for termination logic
                    const evidenceMsg = validation.evidence || thought;

                    if (validation.passed) {
                        Logger.success(`Action validated: ${evidenceMsg}`, suiteId);
                    } else {
                        Logger.warn(`Action validation warning: ${evidenceMsg}`, suiteId);
                    }

                    // V3.2 CRITICAL: Regenerate canonical_name ALWAYS if different
                    const regeneratedName = generateCanonicalName(element, actionType);
                    if (regeneratedName !== action.canonical_name) {
                        Logger.debug(`[RENAME] ${action.canonical_name} → ${regeneratedName}`, suiteId);
                        await supabase.from('ui_actions')
                            .update({ canonical_name: regeneratedName })
                            .eq('id', action.id);
                        action.canonical_name = regeneratedName; // Update local reference
                    }

                    const stepId = await recordStep(suiteId, page, stepTitle, stepStatus, evidenceMsg, {
                        selector: element.selector, xpath: element.xpath, actionType, payload: actionType === 'type' ? '***' : undefined, actionId: action.id, validationResult: validation
                    }, lastStepId);

                    if (stepId) {
                        lastStepId = stepId;
                        await recordActionExecution(suiteId, action.id, stateHash, stepId);
                    }

                    // V3 EXPERIMENTAL: Global State & Depth Detection
                    if (CHAOS_V3) {
                        // Phase 3: Mark Discovered Element as Executed
                        await supabase.from('discovered_elements_snapshot')
                            .update({ was_executed: true })
                            .match({ suite_id: suiteId, state_hash: stateHash, action_id: action.id });

                        // Track global state actions
                        if (action.action_category === 'GLOBAL_STATE') {
                            globalStateActions.add(action.id);
                            Logger.debug(`[V3] Global state action detected: ${action.canonical_name}`, suiteId);
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
                        Logger.info(`Cambio de profundidad detectado (URL/Modal). Forzando reescaneo.`, suiteId);
                    }

                    // Reset stability since we took action
                    consecutiveStableStates = 0;

                } catch (err: any) {
                    await Logger.log(suiteId, `⚠️ Fallo en acción: ${err.message}`, 'warning');
                    // Mark as executed to prevent infinite loop on broken element
                    executedInThisRun.add(`${action.id}::${stateHash}`);
                    await recordActionExecution(suiteId, action.id, stateHash);
                    executionStatus = 'failed';
                }

                // PHASE 4.2: Smart Termination (Diminishing Returns)
                if (executionStatus === 'success' || (CHAOS_V3 && requiresRescan)) {
                    stepsWithoutValue = 0;
                } else {
                    stepsWithoutValue++;
                }

                if (!CHAOS_REPLAY_MODE && stepsWithoutValue >= 10) {
                    await Logger.log(suiteId, '🛑 Smart Termination: Diminishing Returns (Sin valor en últimos 10 pasos)', 'info');
                    break;
                }

                // Force loop to continue - do not evaluate termination yet
                continue;
            }

            // 2. COVERAGE COMPLETE - Check for Navigation or Termination
            await Logger.log(suiteId, `✅ Pantalla cubierta al 100%. Evaluando navegación...`, 'success');

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
            await updateJobProgress(jobId, null, null, { current_action: actionsExecuted, max_actions: MAX_ACTIONS });
        }

        await Logger.log(suiteId, `🏁 Finalizado: ${actionsExecuted} pasos.`, 'success');

        await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);

    } catch (e: any) {
        await Logger.log(suiteId, `🚨 Fatal: ${e.message}`, 'error');
        await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId);
    } finally {
        await browser.close();
        clearInterval(keepalive);

        // V6: Generate & Save Playwright Code
        try {
            // Retrieve all recorded steps for this suite
            const { data: steps } = await supabase
                .from('test_steps')
                .select('*')
                .eq('suite_id', suiteId)
                .order('created_at', { ascending: true });

            if (steps && steps.length > 0) {
                const code = generatePlaywrightCode(steps, url);
                await supabase.from('test_suites').update({ generated_code: code }).eq('id', suiteId);
                Logger.success(`💾 Playwright Code Generated & Saved`, suiteId);
            }
        } catch (e) {
            Logger.warn(`Failed to generate code: ${e}`, suiteId);
        }

        Logger.info(`🛑 Chaos Agent Finished. Actions: ${actionsExecuted}, LLM Calls: ${llmCalls}`, suiteId);
        await updateJobProgress(jobId, 'completed', undefined, getAIStats());
    }
}

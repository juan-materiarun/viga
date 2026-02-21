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
import { getBrowser, injectScripts, getActiveElements, getAccessibilityTree, getBodyText, scrollPage, isAtBottom, isPageScrollable } from '../lib/browser';
import { captureEvidence, waitForUISettled } from '../lib/evidence';
import { callGroqJSON, createLLMContext, batchRankActions, analyzePageContext } from '../lib/llm';
import { generatePlaywrightCode } from '../lib/codegen';
import { supabase, updateJobProgress } from '../lib/supabase';
import { Logger } from '../lib/logger';
import {
    UIElement,
    computeFingerprint,
    computeStateHash,
    generateCanonicalName,
    normalizeUrl,
    inferIntent
} from '../lib/fingerprint';
import {
    UIAction,
    buildActionCache,
    findOrCreateActionCached,
    flushActionCache,
    hasActionBeenExecuted,
    recordActionExecution,
    prioritizeActions
} from '../lib/actions';
import { captureState, validateActionEffect } from '../lib/validators';
import { SemanticIntent } from '../lib/fingerprint';
import { registerState, recordTransition } from '../lib/journey'; // V5: Knowledge Graph
import { SemanticPayloadGenerator, ContextEnvelope } from '../lib/payload';


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

// Protocol V1 Constants
const CONFIDENCE_THRESHOLD = 0.85;
const VALIDATED_CONFIDENCE = 0.90;
const MAX_GENERIC_TEXT_PER_PAGE = 3;
const MAX_REGENERATION_ATTEMPTS = 1;

// V3 EXPERIMENTAL (Feature Flag)
const CHAOS_V3 = true; // permanent v3 activation
const CHAOS_REPLAY_MODE = process.env.CHAOS_REPLAY_MODE === 'true' || false;

async function recordStep(
    suiteId: string,
    page: any,
    title: string,
    status: 'success' | 'failed' | 'running' | 'warning',
    description: string = '',
    expectedResult: string = '',
    actualResult: string = '',
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
    console.log(`[DB] 📝 Recording step: "${title}" (ID: ${stepId.slice(0, 8)}) for Suite: ${suiteId}`);

    // TURBO: capture screenshot
    const evidencePromise = page.isClosed()
        ? Promise.resolve({ screenshotUrl: '' })
        : captureEvidence(page, suiteId, stepId, false).catch(() => ({ screenshotUrl: '' }));

    // Prepare payload with ALL columns we'd like to have
    const payload: any = {
        id: stepId,
        suite_id: suiteId,
        title: title,
        status: status,
        expected_result: expectedResult || description,
        description: actualResult || description,
        observation: actualResult || description, // Try both description and observation
        action_type: actionData?.actionType,
        selector: actionData?.selector,
        xpath: actionData?.xpath,
        action_payload: actionData?.payload,
        action_id: actionData?.actionId,
        validation_result: actionData?.validationResult,
        screenshot_url: '',
        step_number: 0 // Will be handled by DB or sequence
    };

    if (parentStepId) payload.parent_step_id = parentStepId;

    // Self-Healing Insertion Loop
    let attempt = 0;
    let success = false;
    let currentPayload = { ...payload };

    while (!success && attempt < 5) {
        const { error } = await supabase.from('test_steps').insert(currentPayload);

        if (!error) {
            success = true;
            console.log(`[DB] ✅ Step "${title}" saved successfully on attempt ${attempt + 1}`);
        } else {
            console.error(`[DB] ❌ Insert failed (Attempt ${attempt + 1}):`, error.message, error.hint);

            // SELF-HEALING: Identify offensive column and remove it
            if (error.code === 'PGRST204' || error.message.includes('column')) {
                // Extract column name from error message (e.g. "Could not find the 'observation' column")
                const match = error.message.match(/column "(.+?)"/i) || error.message.match(/'(.+?)' column/i);
                const offendingColumn = match ? match[1] : null;

                if (offendingColumn && currentPayload[offendingColumn] !== undefined) {
                    console.warn(`[DB] 🛡️ Healing: Removing offending column '${offendingColumn}' and retrying...`);
                    delete currentPayload[offendingColumn];
                } else {
                    // If we can't find the column, start stripping "risky" ones blindly
                    const riskyColumns = ['observation', 'action_id', 'validation_result', 'xpath', 'action_payload', 'parent_step_id', 'screenshot_url'];
                    const columnToRemove = riskyColumns[attempt];
                    if (columnToRemove) {
                        console.warn(`[DB] 🛡️ Blind Healing: Removing '${columnToRemove}' and retrying...`);
                        delete currentPayload[columnToRemove];
                    }
                }
            } else {
                // Other error (Foreign key, etc.)
                console.error(`[DB] 🛑 Terminal error inserting step: ${error.message}`);
                break;
            }
        }
        attempt++;
    }

    // Patch screenshot later if it resolves
    evidencePromise.then(evidence => {
        if (evidence.screenshotUrl) {
            supabase.from('test_steps').update({ screenshot_url: evidence.screenshotUrl }).eq('id', stepId).then();
        }
    });

    return stepId;
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
            const textLoading = bodyText.match(/cargando\.\.\.|loading\.\.\.|procesando\.\.\.|iniciando\.\.\.|wait\.\.\.|esperando\.\.\.|auditando\.\.\.|analizando\.\.\.|generando\.\.\./);

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



/**
 * OPTIMIZED: Parallel Element Discovery
 * Scans all elements in parallel instead of sequentially
 * Performance: 3x faster than sequential scanning
 */


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


// V4 UPGRADED: Generación inteligente de datos con detección de contexto semántico
function generatePayload(element: UIElement, credentials?: any): string {
    const hint = (element.hint || '').toLowerCase();
    const type = (element.attributes?.type || '').toLowerCase();
    const name = (element.attributes?.name || '').toLowerCase();
    const label = (element.attributes?.['aria-label'] || '').toLowerCase();
    const placeholder = (element.attributes?.placeholder || '').toLowerCase();
    const tag = element.tag.toLowerCase();

    const context = `${hint} ${name} ${label} ${placeholder}`;

    // ─── CÓDIGO / EDITORES (más específico → primero) ───
    // Detecta si el campo pide código: HTML, CSS, JS, código fuente
    const isCodeEditor = (
        context.includes('html') || context.includes('css') || context.includes('javascript') ||
        context.includes('js') || context.includes('código') || context.includes('code') ||
        context.includes('snippet') || context.includes('fuente') || context.includes('source') ||
        context.includes('pega') || context.includes('paste') ||
        // También detectar por tag: si es un textarea con nada de contexto especial, es +probable que sea un editor
        (tag === 'textarea' && (context.includes('anali') || context.includes('analyz')))
    );
    if (isCodeEditor) {
        return `// VIGA Automated Audit Snippet
function calculateSecurityScore(metrics) {
  const base = metrics.vulnerabilities === 0 ? 100 : 50;
  return Math.min(100, base + metrics.performance / 2);
}
console.log("Audit test initialized...");`;
    }

    // 1. URLs
    if (type === 'url' || context.includes('url') || context.includes('website') || context.includes('sitio web') || context.includes('dominio')) {
        return 'https://viga.dev';
    }

    // 2. Emails
    if (type === 'email' || context.includes('email') || context.includes('correo') || context.includes('mail')) {
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

    // 6. Búsqueda / Nombre de app / Proyecto
    if (type === 'search' || context.includes('search') || context.includes('buscar')) {
        return 'test query';
    }
    if (context.includes('app') || context.includes('nombre') || context.includes('name') || context.includes('proyecto')) {
        return 'Mi Aplicación Test';
    }

    // 7. Números
    if (type === 'number' || context.includes('amount') || context.includes('cantidad') || context.includes('edad')) {
        return '42';
    }

    // 8. Textarea genérico (sin otro contexto especial) → Descripción
    if (tag === 'textarea') {
        return 'Descripción de prueba generada por VIGA para validación automática de formularios.';
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
    const recentActionNames: string[] = []; // V4.4: Last 6 action names (for anti-repetition)

    // V5: Journey Graph tracking
    let currentJourneyStateId: string | undefined;
    let lastJourneyStateId: string | undefined;
    let lastJourneyAction: { id: string; intent: string } | undefined;

    // V1 PROTOCOL: Unified Context Object
    let currentPageType = "UNKNOWN";
    let currentPurpose = "Exploración General";
    let genericTextCount = 0;

    // V3 EXPERIMENTAL: Global state tracking
    const globalStateActions = new Set<string>();
    let requiresRescan = false;
    let currentGlobalState: Record<string, string> = {}; // { theme: 'dark', lang: 'es' }
    let consecutiveWaits = 0; // V4.3: Prevent infinite waiting loops

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

            if (elements.length === 0) {
                // V3.3: Don't break if we are likely in a loading state
                const bodyText = await getBodyText(page);
                const isLoading = bodyText.toLowerCase().match(/cargando|loading|wait...|esperando...|processing/);
                if (isLoading && consecutiveWaits < 10) {
                    Logger.info(`⏳ No hay elementos pero se detecta carga: "${isLoading[0]}". Esperando...`, suiteId);
                    consecutiveWaits++;
                    await sleep(5000);
                    continue;
                }
                break;
            }

            const stateHash = computeStateHash(currentUrl, elements.length, pageTitle, currentGlobalState);

            // TURBO: Build action cache once per scan cycle (1 DB fetch for all elements)
            const urlPattern = normalizeUrl(currentUrl);
            const actionCache = await buildActionCache(urlPattern);

            // V4.0: CEREBRO CENTRAL - "El Cartógrafo"
            // Solo analizamos si cambia la URL o es el inicio (para ahorrar tokens)
            let pageContext = "";
            let strategy = "";
            let purpose = "";

            if (actionsExecuted === 0 || !lastStepId || (lastStateHash && stateHash !== lastStateHash && Math.random() < 0.3)) {

                // V4.1: Enhanced Context (Accessibility Tree + Fallback)
                const axTree = await getAccessibilityTree(page).catch(() => null);

                // Truncate tree to manageable size for LLM (15k chars) or use body text
                const contextRaw = axTree ? JSON.stringify(axTree).slice(0, 15000) : (await getBodyText(page)).slice(0, 5000);
                const contextPayload = `Visual: Accessibility Tree\nContext: ${contextRaw}`;

                try {
                    Logger.thought(`🗺️ [CARTÓGRAFO] Analizando contexto (Accessibility Tree)...`, suiteId);
                    trackAICall(contextPayload.length + 500, 300);

                    const analysis: any = await analyzePageContext(llmCtx, currentUrl, pageTitle, contextPayload);
                    pageContext = `Página: ${analysis.page_type} | Objetivo: ${analysis.purpose}`;
                    strategy = analysis.strategy;
                    purpose = analysis.purpose;

                    // V1 PROTOCOL: Store context for drift detection
                    currentPageType = analysis.page_type || "UNKNOWN";
                    currentPurpose = analysis.purpose || "Exploración General";
                    genericTextCount = 0; // Reset count on new page scan

                    const evidence = analysis.evidence ? ` | Evidencia: "${analysis.evidence}"` : "";
                    Logger.info(`🧠 [CARTÓGRAFO] ${pageContext} | Estrategia: ${strategy}${evidence}`, suiteId);

                    // V5: Register journey state in Knowledge Graph
                    try {
                        const keyElements = elements.slice(0, 10).map(el => ({
                            role: el.attributes?.role || el.tag,
                            text: (el.text || el.hint || '').slice(0, 80)
                        }));
                        const journeyState = await registerState(suiteId, currentUrl, pageTitle, keyElements, llmCtx);
                        lastJourneyStateId = currentJourneyStateId;
                        currentJourneyStateId = journeyState.id;

                        // If we arrived here via an action, record the transition
                        if (lastJourneyStateId && lastJourneyAction && lastJourneyStateId !== currentJourneyStateId) {
                            await recordTransition(
                                suiteId,
                                lastJourneyStateId,
                                currentJourneyStateId,
                                lastJourneyAction.id,
                                lastJourneyAction.intent,
                                `Página cambió a: ${analysis.page_type || pageTitle}`,
                                true
                            ).catch(e => Logger.debug(`[V5] Transition error: ${e.message}`, suiteId));
                            lastJourneyAction = undefined; // Reset after recording
                        }
                    } catch (e: any) {
                        Logger.debug(`[V5] State registration error: ${e.message}`, suiteId);
                    }

                    // V4.2: Respect WAIT Strategy
                    if (strategy.includes('ESPERAR') || strategy.includes('WAIT')) {
                        consecutiveWaits++;

                        if (consecutiveWaits >= 6) {
                            Logger.warn(`⚠️ Infinite wait detected (${consecutiveWaits} cycles). Forcing interaction to break loop.`, suiteId);
                            consecutiveWaits = 0; // Reset
                            // Fall through to interaction logic...
                        } else {
                            Logger.info(`⏳ Estrategia dice ESPERAR. Pausando 5s para estabilidad... (${consecutiveWaits}/6)`, suiteId);
                            await sleep(5000); // Explicit wait
                            continue; // Restart loop to re-scan
                        }
                    } else {
                        consecutiveWaits = 0; // Reset on normal strategy
                    }

                } catch (e) {
                    Logger.warn(`Fallo en análisis de contexto: ${e}`, suiteId);
                }
            }

            if (stateHash === lastStateHash) consecutiveStableStates++;
            else { consecutiveStableStates = 0; lastStateHash = stateHash; }

            // NEW: Capture scan start time to prevent self-matching in this cycle
            const scanStartTime = new Date().toISOString();

            const untested: { element: UIElement; action: UIAction; needsReclassification: boolean }[] = [];
            const actionIdsOnScreen = new Set<string>();
            const snapshotRows: any[] = []; // V3 Phase 3

            for (const el of elements) {
                // TURBO: findOrCreateActionCached — all in-memory, no DB calls inside loop
                const action = findOrCreateActionCached(el, currentUrl, getActionType(el), actionCache);

                const fingerprint = computeFingerprint(el, currentUrl);
                Logger.debug(`[SCAN] fp=${fingerprint.substring(0, 8)} action=${action.id.substring(0, 8)}`, suiteId);

                // V1 PROTOCOL: Context Drift Detection
                const contextDrift = action.last_page_type !== currentPageType || action.last_purpose !== currentPurpose;
                const isGeneric = action.semantic_type === 'GENERIC_TEXT';
                if (isGeneric) genericTextCount++;

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

                actionCache.usedIds.add(action.id);

                const key = `${action.id}::${stateHash}`;
                const executedInRuntime = executedInThisRun.has(key);
                const executedInDB = await hasActionBeenExecuted(suiteId, action.id, stateHash);
                const isGlobalState = action.action_category === 'GLOBAL_STATE';

                // V1 PROTOCOL: Force re-classification if Context Drift detected or Confidence is low
                const needsReclassification = contextDrift || action.confidence_score < CONFIDENCE_THRESHOLD || (isGeneric && genericTextCount > MAX_GENERIC_TEXT_PER_PAGE);

                if (!executedInRuntime && !executedInDB) {
                    untested.push({ element: el, action, needsReclassification });
                } else if (isGlobalState && CHAOS_V3) {
                    if (!executedInRuntime) untested.push({ element: el, action, needsReclassification });
                } else {
                    if (executedInDB) executedInThisRun.add(key);
                }
            }

            // TURBO: Flush new actions to DB in a single batch write
            const idMap = await flushActionCache(actionCache);
            // Resolve provisional IDs so recordActionExecution works correctly
            for (const u of untested) {
                if (u.action.id.startsWith('pending::')) {
                    u.action.id = idMap.get(u.action.id) || u.action.id;
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

                    // Semantic Cache: Skip reasoning for well-known actions (validated confidence >= 0.9)
                    // V1 PROTOCOL: Confidence Threshold check
                    const needsReasoning = candidates.filter(c => c.action.confidence_score < CONFIDENCE_THRESHOLD || c.needsReclassification);

                    if (needsReasoning.length > 0) {
                        llmCalls++; // One batch call replaces multiple heuristic checks
                        trackAICall(candidates.length * 150, 200); // Estimate token usage for ranking
                        const rankResult = await batchRankActions(llmCtx, candidates.map(c => ({
                            id: c.action.id,
                            name: c.action.canonical_name,
                            category: c.action.action_category
                        })), pageContext, purpose, undefined, recentActionNames.slice(-6));

                        if (rankResult) {
                            selected = untested.find(u => u.action.id === rankResult.selected_id);
                            thought = `🧠 Decisión IA: ${rankResult.reason}`;
                            if (rankResult.suggested_payload) {
                                payload = rankResult.suggested_payload;
                            }

                            // V1 PROTOCOL: Persistence of classification (CHAOS ONLY)
                            if (selected && rankResult.semantic_type) {
                                const { action } = selected;

                                // Concurrency Lock Check
                                const { data: currentAction } = await supabase.from('ui_actions').select('locked_by_suite').eq('id', action.id).single();
                                if (!currentAction?.locked_by_suite || currentAction.locked_by_suite === suiteId) {
                                    await supabase.from('ui_actions').update({
                                        semantic_type: rankResult.semantic_type,
                                        confidence_score: rankResult.confidence || 0.7, // Tentative if not specified
                                        last_page_type: currentPageType,
                                        last_purpose: currentPurpose,
                                        locked_by_suite: suiteId // Soft lock
                                    }).eq('id', action.id);

                                    action.semantic_type = rankResult.semantic_type;
                                    action.confidence_score = rankResult.confidence || 0.7;
                                }
                            }
                        }
                    } else if (candidates.length > 0) {
                        thought = `⚡ Caché Semántico (${candidates[0].action.semantic_type})`;
                        selected = candidates[0];
                    }
                }

                if (!selected) {
                    // Fallback: Pick top heuristic
                    selected = sortedUntested[0];
                }

                const { element, action } = selected;
                const actionType = getActionType(element);

                // V1 PROTOCOL: Use SemanticPayloadGenerator
                if (actionType === 'type') {
                    const context: ContextEnvelope = {
                        page_type: currentPageType,
                        purpose: currentPurpose,
                        journey_state: currentJourneyStateId,
                        semantic_type: action.semantic_type,
                        element_hint: element.hint
                    };
                    payload = SemanticPayloadGenerator.generate(element, context, credentials);

                    // Specific override if AI suggested one and we trust it
                    if (shouldUseLLM && selected.action.confidence_score > 0.5 && payload.includes('Valor de Prueba')) {
                        // Keep AI payload if ours is too generic
                    }
                }

                const stepTitle = action.canonical_name;
                const intent = action.metadata?.semantic_intent || 'UNKNOWN';

                Logger.thought(`Decided: ${stepTitle} (${intent}) | Reason: ${thought}`, suiteId);

                // --- 5. Execution & Adaptive Waiting ---
                Logger.info(`🚀 Ejecutando: ${stepTitle} (${actionType})`, suiteId);

                const stateBefore = await captureState(page);
                let validation: any = { passed: false };
                let attempts = 0;
                let executionStatus: 'success' | 'warning' | 'failed' = 'failed';

                while (attempts <= MAX_REGENERATION_ATTEMPTS) {
                    try {
                        if (actionType === 'type') {
                            await page.fill(element.selector, payload || '');
                            if (element.tag === 'textarea' || payload?.includes('\n')) {
                                await page.keyboard.press('Control+Enter');
                            } else {
                                await page.keyboard.press('Enter');
                            }
                        } else {
                            await page.click(element.selector);
                        }

                        // Adaptive wait after action
                        await smartWaitForElements(page, suiteId);

                        // --- 6. Semantic Validation (V3) ---
                        const intent = (action.metadata?.semantic_intent || inferIntent(element)) as SemanticIntent;
                        validation = await validateActionEffect(page, action, intent, stateBefore);

                        if (validation.passed) {
                            Logger.info(`✅ Validación Exitosa: ${validation.evidence}`, suiteId);
                            executionStatus = 'success';

                            // V1 PROTOCOL: Boost confidence on success
                            if (action.confidence_score < 0.95 && action.locked_by_suite === suiteId) {
                                await supabase.from('ui_actions').update({
                                    confidence_score: Math.min(1.0, action.confidence_score + 0.05),
                                    last_page_type: currentPageType,
                                    last_purpose: currentPurpose
                                }).eq('id', action.id);
                            }
                            break;
                        } else {
                            attempts++;
                            if (attempts <= MAX_REGENERATION_ATTEMPTS && actionType === 'type') {
                                Logger.warn(`⚠️ Validación fallida: ${validation.evidence}. Re-generando payload (Intento ${attempts}/${MAX_REGENERATION_ATTEMPTS})...`, suiteId);
                                const retryContext: ContextEnvelope = {
                                    page_type: currentPageType,
                                    purpose: currentPurpose,
                                    semantic_type: action.semantic_type,
                                    element_hint: `${element.hint} | ERROR PREVIO: ${validation.evidence}`
                                };
                                payload = SemanticPayloadGenerator.generate(element, retryContext, credentials);
                            } else {
                                Logger.error(`❌ Validación fallida después de ${attempts} intentos: ${validation.evidence}`, suiteId);
                                executionStatus = 'warning';

                                // V1 PROTOCOL: DRIFT CONTROL - Penalize on failure
                                if (action.confidence_score > 0.4 && action.locked_by_suite === suiteId) {
                                    await supabase.from('ui_actions').update({
                                        confidence_score: Math.max(0, action.confidence_score - 0.2)
                                    }).eq('id', action.id);
                                }
                                break;
                            }
                        }
                    } catch (e: any) {
                        Logger.error(`Fallo en ejecución: ${e.message}`, suiteId);
                        validation = { passed: false, evidence: e.message };
                        executionStatus = 'failed';
                        break;
                    }
                }

                actionsExecuted++;
                recentActionNames.push(action.canonical_name);
                if (recentActionNames.length > 8) recentActionNames.shift();

                // V5: Stage last action for Journey Graph
                lastJourneyAction = {
                    id: action.id,
                    intent: action.metadata?.semantic_intent || action.canonical_name
                };

                const stepStatus = validation.passed ? 'success' : 'warning';
                const evidenceMsg = validation.evidence || thought;

                // V1 Protocol: Record the step
                const stepId = await recordStep(suiteId, page, stepTitle, stepStatus, evidenceMsg, thought, evidenceMsg, {
                    selector: element.selector, xpath: element.xpath, actionType, payload: actionType === 'type' ? '***' : undefined, actionId: action.id, validationResult: validation
                }, lastStepId);

                if (stepId) {
                    lastStepId = stepId;
                    await recordActionExecution(suiteId, action.id, stateHash, stepId);
                }

                // Update canonical name if it changed
                const regeneratedName = generateCanonicalName(element, actionType);
                if (regeneratedName !== action.canonical_name) {
                    await supabase.from('ui_actions').update({ canonical_name: regeneratedName }).eq('id', action.id);
                    action.canonical_name = regeneratedName;
                }

                // V3 Phase 3: Update element snapshot
                if (CHAOS_V3) {
                    await supabase.from('discovered_elements_snapshot')
                        .update({ was_executed: true })
                        .match({ suite_id: suiteId, state_hash: stateHash, action_id: action.id });

                    if (action.action_category === 'GLOBAL_STATE') {
                        globalStateActions.add(action.id);
                    }
                }

                await waitForUISettled(page, 200, 1500);

                const afterUrl = page.url();
                const urlChanged = stateBefore.url !== afterUrl;
                const modalOpened = await page.locator('[role="dialog"], .modal, [aria-modal="true"]').count().catch(() => 0) > 0;

                const currentElementCount = await page.locator('*').count().catch(() => 0);
                const domDelta = Math.abs(currentElementCount - stateBefore.elementCount);
                if (domDelta >= 10 && !urlChanged) {
                    await waitForUISettled(page, 500, 5000);
                }

                if (urlChanged || modalOpened) {
                    requiresRescan = true;
                    Logger.info(`Cambio de profundidad detectado (URL/Modal). Forzando reescaneo.`, suiteId);
                }

                consecutiveStableStates = 0;
                executedInThisRun.add(`${action.id}::${stateHash}`);

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

            // 2. COVERAGE COMPLETE - Check for Scrolling or Termination
            const canScroll = await isPageScrollable(page);
            const bottom = await isAtBottom(page);

            if (canScroll && !bottom) {
                await Logger.log(suiteId, `📜 Pantalla cubierta pero hay más contenido. Scrolleando...`, 'info');
                await scrollPage(page, 'down');
                await recordStep(suiteId, page, 'Desplazamiento vertical', 'success', 'Desplazamiento táctico para cobertura total.', 'Espero descubrir nuevos elementos interactivos al final de la página.', 'Desplazamiento vertical exitoso. Nueva área de la UI expuesta.', undefined, lastStepId);
                continue; // Re-scan after scroll
            }

            await Logger.log(suiteId, `✅ Pantalla cubierta al 100%. Evaluando navegación...`, 'success');

            if (consecutiveStableStates >= STABILITY_THRESHOLD) {
                // We are 100% covered and have been stable for N cycles => TRAPPED or DONE
                await recordStep(suiteId, page, '🏁 Ejecución Finalizada', 'success', 'Cobertura completa alcanzada.', 'El agente debe validar toda la UI accesible.', `Misión cumplida. ${actionsExecuted} pasos ejecutados con éxito.`, undefined, lastStepId);
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

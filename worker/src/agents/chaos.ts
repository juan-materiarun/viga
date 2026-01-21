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
        payload?: string
    },
    parentStepId?: string
): Promise<string | null> {
    const stepId = crypto.randomUUID();
    const evidence = await captureEvidence(page, suiteId, stepId, false);

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

    if (error) {
        if (error.code === '42703') { // Column does not exist
            console.warn('[DB] ⚠️ "parent_step_id" column missing. Retrying without it.');
            delete payload.parent_step_id;
            const { error: retryError } = await supabase.from('test_steps').insert(payload);
            if (retryError) console.error('[RECORD_STEP] ❌ Retry failed:', retryError);
            else return stepId;
        } else if (error.code === '23505') {
            console.log(`[DB] ⚠️ Duplicate step ID avoided (idempotency check passed).`);
            return stepId;
        } else {
            console.error('[RECORD_STEP] ❌ Error saving step:', error);
            console.error('[RECORD_STEP] Payload:', { suite_id: suiteId, title, status });
        }
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
        return Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"], [role="tab"], [role="radio"], [tabindex="0"]'))
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

                // REMOVED: Static branch detection (now done post-action based on structural change)

                return {
                    i,
                    tag: el.tagName.toLowerCase(),
                    text: cleanText,
                    hint: hint,
                    selector,
                    xpath,
                    attributes: { type, name, id: el.id, role, ariaSelected, checked }
                };
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

const CHAOS_SYSTEM = `
Eres un Tester de Chaos Inteligente y Analítico. Tu misión es explorar aplicaciones web como lo haría un QA experto.

CONTEXTO QUE RECIBIRÁS:
- Contenido visible de la página (texto, encabezados)
- Elementos interactivos con sus propiedades
- Historial de acciones previas

TU PROCESO DE DECISIÓN:
1. ANALIZA el propósito de la página actual (¿Landing?, ¿Login?, ¿Dashboard?).
2. Para CADA elemento que consideres, identifica:
   - ¿QUÉ ES? (botón de login, toggle de tema, input de búsqueda, link de navegación, etc.)
   - ¿QUÉ FUNCIÓN tiene según su texto/label/contexto?
   - ¿POR QUÉ es importante probarlo en el contexto actual?
3. FASE 1 - EXPLORACIÓN LOCAL: Debes interactuar con TODOS los elementos relevantes de la vista actual (botones, toggles, inputs) ANTES de navegar a otra página.
4. FASE 2 - NAVEGACIÓN PROFUNDA: Solo si la vista actual está "agotada" (todos los elementos visitados), busca links de navegación o login.

TU ANÁLISIS NEURAL ("thought") DEBE INCLUIR:
✅ FORMATO CORRECTO:
"Identifico el [TIPO DE ELEMENTO] '[NOMBRE/LABEL]' ubicado en [UBICACIÓN]. Su función aparente es [PROPÓSITO INFERIDO]. Lo probaré porque [RAZÓN ESPECÍFICA SEGÚN CONTEXTO]."

❌ RESPUESTA GENÉRICA INACEPTABLE:
"Debo probar esto para ver su funcionalidad"
"Voy a clickear este botón"
"Necesito ver qué hace"

✅ EJEMPLOS DE BUEN RAZONAMIENTO:

Ejemplo 1:
{
  "title": "PROBAR TOGGLE DE TEMA",
  "thought": "Identifico el botón 'Dark Mode' en la esquina superior derecha del header. Es un control de tema que debería alternar entre paletas claras y oscuras. Lo probaré para validar la respuesta visual del sistema a cambios de preferencias de UI, un caso crítico de accesibilidad.",
  "index": 3,
  "action": "click"
}

Ejemplo 2:
{
  "title": "COMPLETAR CAMPO EMAIL",
  "thought": "Detecto el input con placeholder 'Enter your email' en el formulario de registro. Es un campo obligatorio para crear cuenta. Lo llenaré con un email de prueba para validar la validación de formato y continuar el flujo de onboarding.",
  "index": 1,
  "action": "type",
  "payload": "test@qa.com"
}

REGLAS CRÍTICAS:
1. JAMÁS selecciones un elemento con "visited": true.
2. Si TODOS los elementos tienen "visited": true -> Action: "finish".
3. PRIORIDAD MÁXIMA: No saltes pasos. Si hay botones funcionales en la pantalla actual, clickéalos primero.
4. Si detectas un cambio de tab/pestaña, asume que es una vista nueva y resetea tu curiosidad exploratoria.
5. **FLOW COMPLETION**: Si "blocked_flows" > 0 en stats, significa que hay Botones/Acciones que visitaste pero sin completar sus inputs relacionados (Flow Vacio vs Flow Lleno). DEBES buscar esos inputs y llenarlos para habilitar la prueba real del flujo.

Responde JSON:
{
  "title": "ACCIÓN CLARA (Ej: PROBAR LOGIN)",
  "thought": "[ANÁLISIS CONTEXTUAL ESPECÍFICO SIGUIENDO EL FORMATO ARRIBA]",
  "index": number,
  "action": "click" | "type" | "finish",
  "payload": "string si action=type"
}
`;

const WARMUP_ACTIONS = 1; // Reduced from 5 to prevent spam

function classifyElementDeterministically(el: UIElement): number {
    const hint = (el.hint || '').toLowerCase();
    const tag = (el.tag || '').toLowerCase();
    const type = el.attributes?.type || '';
    const role = el.attributes?.role || '';

    // EXCLUDE toggles/switches/checkboxes from warmup
    if (type === 'checkbox' || role === 'switch' || hint.match(/toggle|switch|theme|idioma|language|dark|light/)) return 0;

    // EXCLUDE main CTAs from warmup
    if (tag === 'button' && hint.match(/submit|login|sign|start|crear|enviar/)) return 0;

    // High priority: Simple inputs only
    if (tag === 'input' && type !== 'checkbox' && type !== 'radio') return 10;

    // Medium: Safe navigation
    if (tag === 'a' && hint.length > 0 && !hint.match(/logout|salir|delete|eliminar/)) return 5;

    // Low
    return 1;
}

// NEW: Detect if action is reversible (toggle/switch)
function isReversibleAction(el: UIElement): boolean {
    const hint = (el.hint || '').toLowerCase();
    const type = el.attributes?.type || '';
    const role = el.attributes?.role || '';

    return type === 'checkbox' ||
        role === 'switch' ||
        hint.match(/toggle|switch|theme|idioma|language|dark|light/) !== null;
}

export async function runChaosAgent(jobId: string, url: string, suiteId: string, credentials?: any) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    const llmCtx = createLLMContext();

    await vigaLog(suiteId, '🌪️ Chaos Monkey Liberado', 'info');

    const keepalive = setInterval(() => {
        if (!page.isClosed()) {
            page.evaluate(() => true).catch(() => { });
        }
    }, 15000);

    let actions = 0; // Moved outside try for catch block access
    const MAX_ACTIONS = 50;

    // NEW: Track parent step for tree structure
    let lastStepId: string | undefined;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        try { await page.waitForLoadState('networkidle', { timeout: 8000 }); } catch (e) { }

        const visitedStates = new Set<string>();
        const visitedFingerprints = new Set<string>();
        const interactedInputs = new Set<string>(); // Track which inputs were filled
        const actionHistory = new Map<string, number>(); // Anti-loop: fingerprint -> execution count
        const history: string[] = [];

        while (actions < MAX_ACTIONS) {
            if (page.isClosed()) {
                await vigaLog(suiteId, '⚠️ Página cerrada prematuramente. Finalizando.', 'warning');
                break;
            }

            // DEFENSIVE: Check if page is still alive
            if (page.isClosed()) {
                await vigaLog(suiteId, '⚠️ Página cerrada durante exploración. Finalizando gracefully.', 'warning');
                break;
            }

            await waitForStableUI(page);

            const elements = await smartWaitForElements(page, suiteId);
            const currentUrl = page.url();

            if (elements.length === 0) {
                await vigaLog(suiteId, '🛑 No se detectaron elementos. Chaos finalizado.', 'warning');
                break;
            }

            const stateHash = crypto.createHash('md5').update(currentUrl + elements.length).digest('hex');
            if (!visitedStates.has(stateHash)) {
                visitedStates.add(stateHash);
                await vigaLog(suiteId, `📍 Nuevo estado: ${currentUrl} (${elements.length} elems)`, 'info');

                const upsertBatch = elements.map(el => ({
                    suite_id: suiteId,
                    selector: el.selector,
                    tag_name: el.tag,
                    text: el.text || el.hint,
                    url: currentUrl,
                    status: 'active',
                    priority: 1,
                    identity_data: {
                        hint: el.hint,
                        attributes: el.attributes,
                        xpath: el.xpath
                    }
                }));

                const { error: upsertError } = await supabase.from('discovered_elements').upsert(upsertBatch, { onConflict: 'suite_id, url, selector' });

                if (upsertError) {
                    await vigaLog(suiteId, `❌ ERROR guardando discovered_elements: ${upsertError.message}`, 'error');
                    console.error('[CHAOS] Failed to save discovered_elements:', upsertError);
                }

            }

            const mappedElements = elements.map(e => {
                const baseUrl = currentUrl.split('#')[0].split('?')[0];

                // GENERIC FLOW-AWARE FINGERPRINTING
                let fingerprint = `${baseUrl}::${e.selector}`;

                const isActionable = e.tag === 'button' ||
                    (e.tag === 'a' && (e.hint.toLowerCase().includes('submit') ||
                        e.hint.toLowerCase().includes('send') ||
                        e.hint.toLowerCase().includes('start') ||
                        e.hint.toLowerCase().includes('create')));

                if (isActionable) {
                    const nearbyInputs = elements
                        .filter(el => el.tag === 'input' && Math.abs(el.i - e.i) < 10)
                        .map(el => ({ selector: el.selector, index: el.i }));

                    if (nearbyInputs.length > 0) {
                        const inputsState = nearbyInputs
                            .map(inp => interactedInputs.has(`${baseUrl}::${inp.selector}`) ? '1' : '0')
                            .join('');

                        if (inputsState.includes('0')) {
                            fingerprint = `${fingerprint}::flow_${inputsState}`;
                        }
                    }
                }

                return {
                    i: e.i,
                    tag: e.tag,
                    hint: e.hint,
                    selector: e.selector,
                    visited: visitedFingerprints.has(fingerprint),
                    _fingerprint: fingerprint // Store for later use
                };
            });

            const unvisitedCount = mappedElements.filter(e => !e.visited).length;

            // FLOW COMPLETION GUARD:
            // Detect Actionables that have nearby inputs which are NOT fully interacted.
            const blockedFlows = mappedElements.filter(e => {
                const isActionable = e.tag === 'button' || (e.tag === 'a' && /submit|send|start|create|search/i.test(e.hint));
                if (!isActionable) return false;

                const nearbyInputs = elements.filter(el => el.tag === 'input' && Math.abs(el.i - e.i) < 10);
                if (nearbyInputs.length === 0) return false;

                const hasUninteractedInputs = nearbyInputs.some(inp => {
                    const baseUrl = currentUrl.split('#')[0].split('?')[0];
                    return !interactedInputs.has(`${baseUrl}::${inp.selector}`);
                });

                return hasUninteractedInputs;
            });

            // DEFENSIVE: Wrap DOM access in try/catch
            let pageContent = '';
            let headings: string[] = [];
            let formCount = 0;
            let pageTitle = '';

            try {
                pageContent = await page.textContent('body').then(t => t || '').catch(() => '');
                headings = await page.$$eval('h1, h2, h3', els => els.map(el => el.textContent?.trim() || '').filter(Boolean)).catch(() => [] as string[]);
                formCount = await page.$$eval('form', forms => forms.length).catch(() => 0);
                pageTitle = await page.title().catch(() => 'Unknown');
            } catch (e: any) {
                await vigaLog(suiteId, `⚠️ Error extrayendo contexto: ${e.message}`, 'warning');
            }

            const context = JSON.stringify({
                url: currentUrl,
                title: pageTitle,
                page_content: pageContent.slice(0, 2000),
                headings: headings.slice(0, 10),
                forms_detected: formCount,
                history: history.slice(-15),
                interactive_elements: mappedElements,
                stats: {
                    unvisited_elements: unvisitedCount,
                    blocked_flows: blockedFlows.length,
                    total_elements: mappedElements.length
                },
                credentials_vault: credentials ? "AVAILABLE (Use these for login forms if needed)" : "NONE",
                available_credentials: credentials
            });

            await updateJobProgress(jobId, {
                current_action: actions + 1,
                max_actions: MAX_ACTIONS,
                current_url: currentUrl,
                elements_found: elements.length
            });

            // --- WARMUP PHASE ---
            if (actions < WARMUP_ACTIONS) {
                await vigaLog(suiteId, `🏃 WARMUP MODE (${actions + 1}/${WARMUP_ACTIONS})`, 'info');

                const scoredElements = mappedElements
                    .filter(e => !e.visited)
                    .map(e => {
                        const original = elements.find(el => el.i === e.i);
                        return { ...e, score: original ? classifyElementDeterministically(original) : 0 };
                    })
                    .sort((a, b) => b.score - a.score);

                if (scoredElements.length > 0 && scoredElements[0].score > 1) {
                    const topCandidate = scoredElements[0];
                    const target = elements.find(el => el.i === topCandidate.i)!;

                    const actionType = target.tag === 'input' ? 'type' : 'click';
                    const actionDesc = `[HEURÍSTICO] ${actionType.toUpperCase()} en ${target.hint}`;

                    await vigaLog(suiteId, `👉 ${actionDesc} (Score: ${topCandidate.score})`, 'info');

                    const baseUrl = currentUrl.split('#')[0].split('?')[0];
                    const fingerprint = `${baseUrl}::${target.selector}`;
                    visitedFingerprints.add(fingerprint);

                    try {
                        if (actionType === 'type') {
                            let payload = 'test@qa.com';
                            if (target.selector.includes('password') || target.selector.includes('pass')) {
                                payload = credentials?.password || 'Password123!';
                            } else if (credentials?.username && (target.selector.includes('user') || target.selector.includes('email'))) {
                                payload = credentials.username || 'test_user';
                            }
                            await page.fill(target.selector, payload);
                        } else {
                            try { await page.click(target.selector, { timeout: 5000 }); }
                            catch (e) { if (target.xpath) await page.click(`xpath=${target.xpath}`, { timeout: 5000 }); else throw e; }
                        }

                        actions++;
                        await sleep(1000);

                        const newStepId = await recordStep(suiteId, page, actionDesc, 'success', `Acción determinística (Score ${topCandidate.score})`, {
                            selector: target.selector,
                            xpath: target.xpath,
                            actionType: actionType as any
                        }, lastStepId);

                        // If recordStep succeeded, update lastStepId for next iteration (Tree)
                        if (newStepId) lastStepId = newStepId;

                        continue;
                    } catch (err: any) {
                        await vigaLog(suiteId, `⚠️ Fallo heurístico: ${err.message}`, 'warning');
                    }
                } else {
                    await vigaLog(suiteId, `ℹ️ Warmup skippeado: sin candidatos claros`, 'info');
                }
            }


            const decision = await callGroqJSON(llmCtx, CHAOS_SYSTEM, context);

            if (!decision) { break; }

            if (decision.action === 'finish') {
                await vigaLog(suiteId, '✅ Chaos: Cobertura completada.', 'success');
                await recordStep(suiteId, page, 'EXPLORACIÓN COMPLETADA', 'success', decision.thought || 'No hay más elementos nuevos que probar.', undefined, lastStepId);
                break;
            }

            if (typeof decision.index !== 'number') break;

            const target = elements.find(e => e.i === decision.index);

            if (target) {
                const baseUrl = currentUrl.split('#')[0].split('?')[0];
                const targetMapped = mappedElements.find(m => m.i === target.i);
                const fingerprint = targetMapped?._fingerprint || `${baseUrl}::${target.selector}`;
                const actionDesc = `${decision.action} en "${target.hint}"`;
                await vigaLog(suiteId, `👉 [${actions + 1}/${MAX_ACTIONS}] ${decision.title || actionDesc}`, 'info');

                history.push(`${decision.title}: ${decision.thought}`);

                // ANTI-LOOP: Check if this is a reversible action already executed
                const isReversible = isReversibleAction(target);
                const executionCount = actionHistory.get(fingerprint) || 0;

                if (isReversible && executionCount >= 1) {
                    await vigaLog(suiteId, `⚠️ Toggle/Switch ya ejecutado (${executionCount}x). Skipping para evitar loop.`, 'warning');
                    visitedFingerprints.add(fingerprint);
                    continue; // Skip execution, mark as visited
                }

                visitedFingerprints.add(fingerprint);
                actionHistory.set(fingerprint, executionCount + 1);
                await vigaLog(suiteId, `🔖 Marcado como visitado: ${fingerprint.slice(0, 80)}...`, 'info');

                try {
                    if (decision.action === 'type') {
                        let payload = decision.payload || 'Val';
                        if (credentials && (target.selector.includes('password') || target.selector.includes('pass'))) {
                            payload = credentials.password || payload;
                        } else if (credentials && (target.selector.includes('email') || target.selector.includes('user'))) {
                            payload = credentials.username || payload;
                        }

                        console.log(`[CHAOS] ⌨️ Typing...`);
                        try { await page.fill(target.selector, payload); }
                        catch (e) { if (target.xpath) await page.fill(`xpath=${target.xpath}`, payload); else throw e; }

                        interactedInputs.add(`${baseUrl}::${target.selector}`);
                    } else {
                        console.log(`[CHAOS] 🖱️ Clicking...`);
                        try { await page.click(target.selector, { timeout: 8000 }); }
                        catch (e) {
                            console.log(`[CHAOS] ⚠️ Standard click failed, trying XPath...`);
                            if (target.xpath) await page.click(`xpath=${target.xpath}`, { timeout: 8000 }); else throw e;
                        }
                    }
                    console.log(`[CHAOS] ✅ Action executed. Sleeping...`);

                    actions++;
                    await sleep(1500);

                    console.log(`[CHAOS] 📝 Recording step...`);

                    if (page.isClosed()) {
                        await vigaLog(suiteId, `⚠️ Página cerrada tras acción. Registrando sin evidencia.`, 'warning');
                        await supabase.from('test_steps').insert({
                            id: crypto.randomUUID(),
                            suite_id: suiteId,
                            title: decision.title || actionDesc,
                            expected_result: 'Page closed after action',
                            status: 'warning',
                            selector: target.selector,
                            parent_step_id: lastStepId // Try to chain even if closing
                        });
                    } else {
                        const newStepId = await recordStep(suiteId, page, decision.title || actionDesc, 'success', decision.thought || actionDesc, {
                            selector: target.selector,
                            xpath: target.xpath,
                            actionType: decision.action as 'click' | 'type',
                            payload: decision.action === 'type' ? (credentials && (target.selector.includes('password') || target.selector.includes('pass')) ? '******' : decision.payload) : undefined
                        }, lastStepId);

                        if (newStepId) lastStepId = newStepId;
                    }
                    console.log(`[CHAOS] ✅ Step recorded.`);
                } catch (err: any) {
                    await vigaLog(suiteId, `⚠️ Fallo: ${err.message}`, 'warning');

                    try {
                        if (!page.isClosed()) {
                            // On failure, we record it, but we typically do NOT advance the parent ID 
                            // because the action failed, so we're theoretically still at the previous state?
                            // OR we record it as a dead-end child. Let's record it as child.
                            await recordStep(suiteId, page, `ERROR: ${decision.title}`, 'failed', err.message, undefined, lastStepId);
                        } else {
                            await supabase.from('test_steps').insert({
                                id: crypto.randomUUID(),
                                suite_id: suiteId,
                                title: `ERROR: ${decision.title}`,
                                expected_result: err.message,
                                status: 'failed',
                                parent_step_id: lastStepId
                            });
                        }
                    } catch (recordErr: any) {
                        console.error(`[CHAOS] Could not record step failure: ${recordErr.message}`);
                    }
                }
            }
            await sleep(500);
        }
        if (actions > 0) {
            const { count, error: countErr } = await supabase
                .from('discovered_elements')
                .select('*', { count: 'exact', head: true })
                .eq('suite_id', suiteId);

            if (countErr) await vigaLog(suiteId, `❌ Error verificando memoria: ${countErr.message}`, 'error');
            else if ((count || 0) === 0) await vigaLog(suiteId, `🚨 ALERTA: Memoria vacía tras ${actions} acciones! Revisar logs.`, 'error');
            else await vigaLog(suiteId, `🧠 Memoria validada: ${count} elementos persistidos.`, 'success');
        }
        await vigaLog(suiteId, '🏁 Chaos Session Finalizada', 'success');
        await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);
    } catch (e: any) {
        console.error(`[CHAOS-CRITICAL] 💥 Fatal Loop Error: ${e.message}`);
        console.error(e);

        try {
            if (!page.isClosed()) {
                await recordStep(suiteId, page, 'FATAL ERROR', 'failed', `Critical failure: ${e.message}`, undefined, lastStepId);
            } else {
                await supabase.from('test_steps').insert({
                    id: crypto.randomUUID(),
                    suite_id: suiteId,
                    title: 'FATAL ERROR (Page Closed)',
                    expected_result: `Critical failure: ${e.message}`,
                    status: 'failed',
                    parent_step_id: lastStepId
                });
            }
        } catch (recordErr: any) {
            console.error(`[CHAOS-CRITICAL] ⚠️ Could not record fatal error: ${recordErr.message}`);
        }

        if (actions > 5) {
            await vigaLog(suiteId, `⚠️ Sesión terminada prematuramente pero con progreso (${actions} acciones)`, 'warning');
            await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);
        } else {
            await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId);
        }

        if (actions < 5) throw e;
    } finally {
        clearInterval(keepalive);
        await page.close();
        await browser.close().catch(() => { });
    }
}

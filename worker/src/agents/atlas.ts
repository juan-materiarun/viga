import { supabase, updateJobProgress, createLog } from '../lib/supabase';
import { createLLMContext, callGroqJSON } from '../lib/llm';
import { JourneyState, JourneyTransition } from '../lib/journey';
import { getBrowser, getBodyText } from '../lib/browser';
import { captureEvidence, waitForUISettled } from '../lib/evidence';
import { Cortex } from '../lib/cortex';
import { Healer } from '../lib/healer';
import crypto from 'crypto';

interface GraphNode {
    state: JourneyState;
    outEdges: JourneyTransition[];
}

interface PathCandidate {
    pathId: string;
    states: JourneyState[];
    transitions: JourneyTransition[];
}

export async function runAtlasAgent(jobId: string, suiteId: string) {
    console.log(`[ATLAS] 🏛️ Starting Synthesis for Suite: ${suiteId}`);
    await createLog(suiteId, '🧠 Atlas Mastermind activado.', 'info');
    await createLog(suiteId, '📂 Cargando Grafo de Conocimiento (Offline Mode)...', 'info');

    const llmCtx = createLLMContext();
    const browser = await getBrowser(); // Initialize browser once
    try {

        // 1. Fetch Graph Data
        await createLog(suiteId, '📥 Obteniendo datos de exploración (Estados y Transiciones)...', 'info');

        let statesVal: any[] | null = null;
        let transitionsVal: any[] | null = null;
        let actualSuiteId = suiteId;

        const fetchGraph = async (sid: string) => {
            const { data: s } = await supabase
                .from('journey_states')
                .select('*')
                .eq('suite_id', sid)
                .order('created_at', { ascending: true });

            const { data: t } = await supabase
                .from('journey_transitions')
                .select('*')
                .eq('suite_id', sid)
                .eq('was_explored', true);

            return { s, t };
        };

        const firstTry = await fetchGraph(suiteId);
        statesVal = firstTry.s;
        transitionsVal = firstTry.t;

        if (!statesVal || statesVal.length === 0) {
            console.log(`[ATLAS] 🔍 No states in current suite ${suiteId}. Searching for parent suite...`);
            // Fallback: Find the latest COMPLETED suite for the SAME URL that HAS states AND transitions
            const { data: currentSuite } = await supabase.from('test_suites').select('base_url').eq('id', suiteId).single();

            if (currentSuite?.base_url) {
                const { data: otherSuites } = await supabase
                    .from('test_suites')
                    .select('id')
                    .eq('base_url', currentSuite.base_url)
                    .eq('status', 'completed')
                    .neq('id', suiteId)
                    .order('created_at', { ascending: false })
                    .limit(5); // Check top 5 most recent

                if (otherSuites && otherSuites.length > 0) {
                    console.log(`[ATLAS] 🔄 Found ${otherSuites.length} candidate parent suites. Checking for valid graph data...`);

                    for (const candidate of otherSuites) {
                        // Check if this suite has actual transitions
                        const { count: transCount } = await supabase
                            .from('journey_transitions')
                            .select('id', { count: 'exact', head: true })
                            .eq('suite_id', candidate.id)
                            .eq('was_explored', true);

                        if (transCount && transCount > 0) {
                            const retry = await fetchGraph(candidate.id);
                            if (retry.s && retry.s.length > 0) {
                                console.log(`[ATLAS] ✅ Found VALID source data in suite: ${candidate.id} (${transCount} transitions)`);
                                statesVal = retry.s;
                                transitionsVal = retry.t;
                                actualSuiteId = candidate.id;
                                await createLog(suiteId, `📍 Usando datos de exploración previa (Suite: ${candidate.id.slice(0, 8)} - ${transCount} transiciones)`, 'info');
                                break;
                            }
                        } else {
                            console.log(`[ATLAS] ⚠️ Skipping candidate ${candidate.id} (0 transitions)`);
                        }
                    }
                }
            }
        }

        if (!statesVal || statesVal.length === 0) {
            console.warn('[ATLAS] ⚠️ No states found for this suite or URL.');
            await createLog(suiteId, '⚠️ No se encontraron estados explorados. Ejecuta Chaos primero.', 'warning');
            return;
        }

        const states = statesVal as JourneyState[];
        const transitions = (transitionsVal || []) as JourneyTransition[];

        console.log(`[ATLAS] 📊 Graph Loaded: ${states.length} States, ${transitions.length} Transitions`);
        await createLog(suiteId, `📊 Grafo cargado: ${states.length} estados, ${transitions.length} transiciones.`, 'info');

        // 2. Build Graph Structure
        const graph = new Map<string, GraphNode>();
        states.forEach(s => graph.set(s.id, { state: s, outEdges: [] }));
        transitions.forEach(t => {
            const node = graph.get(t.from_state_id);
            if (node) node.outEdges.push(t);
        });

        // 3. Find Journeys (Root -> Leaves)
        // Identify Root (First created state)
        const rootState = states[0];
        const rawPaths = findPathsDFS(graph, rootState.id, new Set());

        console.log(`[ATLAS] 🛤️ Found ${rawPaths.length} potential journeys.`);
        await createLog(suiteId, `🛤️ Se encontraron ${rawPaths.length} rutas potenciales para análisis.`, 'info');

        // 4. Synthesize & Persist
        let processedCount = 0;
        const MAX_JOURNEYS = 10; // Cap to avoid explosion

        // Prioritize longest paths that are not loops
        console.log(`[ATLAS] 🧠 Analyzing ${rawPaths.length} paths for Test Case Diversity...`);

        // STRATEGY: Select a MIX of behaviors, not just long paths.
        // 1. Long Flows (Business Logic)
        // 2. Short Interaction (UI Toggles, etc)
        // 3. Navigation (Page changes)
        // 4. Input Forms (Data entry)

        const categorized: Record<string, PathCandidate[]> = {
            forms: [],
            nav: [],
            ui: [],
            complex: []
        };

        for (const p of rawPaths) {
            const hasInput = p.transitions.some(t => t.action_intent.toLowerCase().match(/escribir|fill|type|ingresar/));
            const hasNav = p.transitions.some(t => t.action_intent.toLowerCase().match(/navegar|ir a/));

            if (hasInput) categorized.forms.push(p);
            else if (hasNav) categorized.nav.push(p);
            else if (p.transitions.length > 2) categorized.complex.push(p);
            else categorized.ui.push(p);
        }

        const selectedPaths: PathCandidate[] = [];
        const pick = (list: PathCandidate[], count: number) => {
            // Sort by length desc within category
            list.sort((a, b) => b.transitions.length - a.transitions.length);
            selectedPaths.push(...list.slice(0, count));
        };

        // BALANCE THE MIX (Max 15 candidates)
        pick(categorized.complex, 4);
        pick(categorized.forms, 4);
        pick(categorized.nav, 3);
        pick(categorized.ui, 3);

        // DEDUPLICATION BY INTENT SIGNATURE
        const uniqueSignatures = new Set<string>();
        const uniquePaths: PathCandidate[] = [];

        for (const p of selectedPaths) {
            // Signature: "Click Login -> Fill Email -> Click Submit"
            const sig = p.transitions.map(t => t.action_intent.toLowerCase().trim()).join('||');

            // Allow only distinct flows (similarity check)
            if (!uniqueSignatures.has(sig)) {
                uniqueSignatures.add(sig);
                uniquePaths.push(p);
            }
        }

        const sortedPaths = uniquePaths.slice(0, MAX_JOURNEYS);

        await createLog(suiteId, `🧠 Selección Final: ${sortedPaths.length} flujos únicos (de ${rawPaths.length} posibles). Deduped: ${selectedPaths.length - sortedPaths.length}.`, 'info');

        const existingTitles = new Set<string>();

        for (const path of sortedPaths) {
            console.log(`[ATLAS DEBUG] Synthesizing path...`);
            const journeyId = await synthesizeAndSaveJourney(jobId, suiteId, path, llmCtx, existingTitles);

            if (journeyId) {
                console.log(`[ATLAS DEBUG] Journey ID returned: ${journeyId}`);
                processedCount++;
                await createLog(suiteId, `⚡ Ejecutando: ${path.states[0]?.semantic_description || 'Journey'}...`, 'info');
                await executeJourney(suiteId, journeyId);
                await updateJobProgress(jobId, 'running', null, { current_action: processedCount, max_actions: sortedPaths.length });
            } else {
                console.log(`[ATLAS DEBUG] Duplicate or Invalid Journey, skipping execution.`);
                // Don't count as processed if skipped
            }
        }

        console.log(`[ATLAS] ✅ Synthesis Complete. Generated ${processedCount} Test Cases.`);
        await createLog(suiteId, `✅ Síntesis completada. Se generaron ${processedCount} Casos de Prueba ÚNICOS.`, 'success');

        // 5. MASTER SUITE GENERATION (The "Book") 📖
        if (processedCount > 0) {
            await createLog(suiteId, `📖 Escribiendo Master Suite (Playwright)...`, 'info');
            try {
                // Fetch all verified journeys
                const { data: verifiedJourneys } = await supabase
                    .from('test_journeys')
                    .select('id, name, status, test_case_steps (*)') // Nested fetch
                    .eq('suite_id', suiteId)
                    .eq('status', 'verified');

                if (verifiedJourneys && verifiedJourneys.length > 0) {
                    const testCases = [];

                    for (const journey of verifiedJourneys) {
                        // Enhance steps with action details (like ExecuteJourney docs)
                        const steps = journey.test_case_steps.sort((a: any, b: any) => a.step_order - b.step_order);

                        // We need action/locator details for code generation
                        // Optimization: For code gen, we might just need intent + payload if strict selector is missing
                        // Ideally we would do a join, but for MVP let's reuse what we have or fetch if needed.
                        // Actually, let's fetch action details for these steps to be precise.

                        const actionIds = steps.map((s: any) => s.original_action_id).filter(Boolean);
                        let actionsMap: any = {};
                        if (actionIds.length > 0) {
                            const { data: actions } = await supabase.from('ui_actions').select('id, selectors').in('id', actionIds);
                            actions?.forEach((a: any) => actionsMap[a.id] = a);
                        }

                        const enrichedSteps = steps.map((s: any) => ({
                            ...s,
                            ui_actions: s.original_action_id ? actionsMap[s.original_action_id] : null
                            // We trust action_type and payload are correct from Architect
                        }));

                        testCases.push({
                            title: journey.name,
                            steps: enrichedSteps
                        });
                    }

                    // Get Start URL
                    const { data: suite } = await supabase.from('test_suites').select('base_url').eq('id', suiteId).single();
                    const startUrl = suite?.base_url || 'https://google.com';

                    // Generate Code
                    const { generatePlaywrightSuite } = await import('../lib/codegen');
                    const masterCode = generatePlaywrightSuite(`VIGA Atlas: ${new URL(startUrl).hostname}`, startUrl, testCases);

                    // Save to DB
                    await supabase.from('test_suites').update({ generated_code: masterCode }).eq('id', suiteId);
                    await createLog(suiteId, `💾 Suite Completa Guardada en Biblioteca.`, 'success');
                    console.log(`[ATLAS] 💾 Master Suite Saved (${masterCode.length} bytes)`);

                } else {
                    console.warn('[ATLAS] ⚠️ No verified journeys found to generate suite.');
                }

            } catch (e: any) {
                console.error(`[ATLAS] ❌ Failed to generate Master Suite: ${e.message}`);
                await createLog(suiteId, `❌ Error generando Master Suite: ${e.message}`, 'error');
            }
        }

    } finally {
        const browser = await getBrowser();
        await browser.close().catch(() => { });
    }
}

function findPathsDFS(
    graph: Map<string, GraphNode>,
    currentId: string,
    visitedObj: Set<string>,
    currentPath: PathCandidate = { pathId: '', states: [], transitions: [] }
): PathCandidate[] {
    const node = graph.get(currentId);
    if (!node) return [];

    // Avoid cycles in a single path
    if (visitedObj.has(currentId)) {
        return [currentPath]; // Return what we have as a "Loop detected" path
    }

    const newVisited = new Set(visitedObj);
    newVisited.add(currentId);

    const newPath: PathCandidate = {
        pathId: '', // calculated later
        states: [...currentPath.states, node.state],
        transitions: [...currentPath.transitions]
    };

    // If Leaf (no out edges)
    if (node.outEdges.length === 0) {
        return [newPath];
    }

    let allPaths: PathCandidate[] = [];
    for (const edge of node.outEdges) {
        // Only follow explored edges
        const branchPath = {
            ...newPath,
            transitions: [...newPath.transitions, edge]
        };
        const childPaths = findPathsDFS(graph, edge.to_state_id, newVisited, branchPath);
        allPaths = allPaths.concat(childPaths);
    }

    return allPaths;
}

// Fixed Synthesize Function with Action Type Detection
async function synthesizeAndSaveJourney(
    jobId: string,
    suiteId: string,
    path: PathCandidate,
    llmCtx: any,
    existingTitles?: Set<string>
) {
    // Format for LLM
    const narrative = path.transitions.map((t, i) => {
        const fromState = path.states[i];
        return `${i + 1}. [Pantalla: ${fromState.semantic_description}] -> ACCIÓN: "${t.action_intent}" -> RESULTADO: "${t.effect_description}"`;
    }).join('\n');

    // ==========================================================
    // MULTI-CHIP SYNTHESIS PIPELINE 🧠⚡
    // ==========================================================

    // CHIP 1: CONTEXT ANALYST
    console.log('[ATLAS] 🧠 Chip 1: Analyzing Context...');
    const analysis = await Cortex.ContextAnalyst.analyze(narrative, llmCtx);
    console.log(`[ATLAS] 📝 Story: "${analysis.story_name}" (${analysis.complexity})`);

    // DEDUPLICATION EARLY CHECK
    if (existingTitles && existingTitles.has(analysis.story_name)) {
        console.log(`[ATLAS] ⚠️ Skipping Duplicate Story: "${analysis.story_name}"`);
        return null;
    }
    if (existingTitles) existingTitles.add(analysis.story_name);

    // CHIP 2: EDGE CASE CRITIC
    console.log('[ATLAS] ⚖️ Chip 2: Judging Quality...');
    const classification = await Cortex.EdgeCritic.judge(analysis, narrative, llmCtx);
    console.log(`[ATLAS] 🏷️ Class: ${classification.is_edge_case ? 'EDGE CASE' : 'HAPPY PATH'} (Risk: ${classification.risk_score}%)`);

    // CHIP 3: TEST ARCHITECT
    console.log('[ATLAS] 🏗️ Chip 3: Architecting Steps...');
    const generatedSteps = await Cortex.TestArchitect.design(analysis, classification, path.transitions, llmCtx);

    if (!generatedSteps || generatedSteps.length === 0) {
        console.log('[ATLAS] ⚠️ Architect failed to generate steps. Skipping.');
        return null;
    }

    // Persist Journey
    const { data: journey, error: jErr } = await supabase.from('test_journeys').insert({
        suite_id: suiteId,
        name: analysis.story_name,
        intent: analysis.user_intent,
        status: 'proposed',
        is_happy_path: classification.is_happy_path,
        is_edge_case: classification.is_edge_case,
        risk_score: classification.risk_score,
        step_count: generatedSteps.length
    }).select().single();

    if (jErr) {
        console.error('[ATLAS] ❌ Save Failed:', jErr.message);
        return;
    }

    // Persist Steps
    const stepsToInsert = generatedSteps.map((step, index) => {
        // Find original action ID if aligned (Best effort mapping)
        // Since Architect generates N steps and we have M transitions, mapping is heuristic.
        // For strict mapping, Architect inputs strictly map 1:1. 
        // Our Architect chip prompt asks for steps based on transitions, so we assume 1:1 or close.
        // Let's use the index to map back to original transition if possible.
        const originalT = path.transitions[index];

        return {
            journey_id: journey.id,
            step_order: step.step_order,
            intent: step.intent,
            action_type: step.action_type,
            payload: step.payload,
            original_action_id: originalT ? originalT.action_id : null,
            expected_observation: step.expected_observation
        };
    });

    if (stepsToInsert.length > 0) {
        await supabase.from('test_case_steps').insert(stepsToInsert);
    }

    console.log(`[ATLAS] 💾 Saved Journey: "${journey.name}" (${stepsToInsert.length} steps)`);
    return journey.id;
}

// ============================================================================
// EXECUTION ENGINE ⚡ (Fixed with Smart Replay)
// ============================================================================

async function executeJourney(suiteId: string, journeyId: string) {
    console.log(`[ATLAS DEBUG] START executeJourney for ${journeyId}`);

    // 1. Fetch Steps & Merged Data
    let steps: any[] = [];
    try {
        const { data: stepData, error: stepError } = await supabase
            .from('test_case_steps')
            .select('*')
            .eq('journey_id', journeyId)
            .order('step_order', { ascending: true });

        if (stepError) throw stepError;
        if (!stepData || stepData.length === 0) return;

        const actionIds = stepData.map((s: any) => s.original_action_id).filter(Boolean);
        const locatorIds = stepData.map((s: any) => s.locator_id).filter(Boolean);

        // Fetch relations
        let actionsMap: any = {};
        if (actionIds.length > 0) {
            const { data: actions } = await supabase.from('ui_actions').select('id, selectors, tag').in('id', actionIds);
            actions?.forEach((a: any) => actionsMap[a.id] = a);
        }

        let locatorsMap: any = {};
        if (locatorIds.length > 0) {
            const { data: locators } = await supabase.from('ui_locators').select('id, selectors').in('id', locatorIds);
            locators?.forEach((l: any) => locatorsMap[l.id] = l);
        }

        steps = stepData.map((s: any) => ({
            ...s,
            ui_actions: s.original_action_id ? actionsMap[s.original_action_id] : null,
            ui_locators: s.locator_id ? locatorsMap[s.locator_id] : null
        }));

    } catch (e: any) {
        console.error(`[ATLAS DEBUG] DB Error: ${e.message}`);
        await createLog(suiteId, `❌ Error interno: ${e.message}`, 'error');
        return;
    }

    // Get Base URL
    const { data: suite } = await supabase.from('test_suites').select('base_url').eq('id', suiteId).single();
    const startUrl = suite?.base_url || 'https://google.com';

    await createLog(suiteId, `🎬 Iniciando validación en: ${startUrl}`, 'info');

    // Launch Browser
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        // Only navigate if first step is NOT a navigation step to the same URL
        if (steps[0].action_type !== 'navigate') {
            await page.goto(startUrl, { waitUntil: 'domcontentloaded' });
            await waitForUISettled(page, 500, 4000);
        }

        let successCount = 0;

        for (const [idx, step] of steps.entries()) {
            await createLog(suiteId, `👣 [${idx + 1}/${steps.length}] ${step.intent}`, 'info');

            // 1. Register Step (RUNNING)
            const execStepId = crypto.randomUUID();
            const { error: insertErr } = await supabase.from('test_steps').insert({
                id: execStepId,
                suite_id: suiteId,
                journey_id: journeyId, // Linked to Journey for Storyboard View
                title: `[ATLAS] ${step.intent}`,
                expected_result: step.expected_observation || 'Action validation',
                status: 'running',
                step_number: idx + 1,
                created_at: new Date().toISOString()
            });

            if (insertErr) console.error(`[ATLAS] Step Insert Error: ${insertErr.message}`);

            // 2. Resolve Selector or Fallback
            let selector = '';
            let method = 'unknown';

            if (step.ui_actions?.selectors?.[0]) {
                selector = step.ui_actions.selectors[0];
                method = 'recorded_action';
            } else if (step.ui_locators?.selectors?.css) {
                selector = step.ui_locators.selectors.css;
                method = 'recorded_locator';
            } else {
                console.log(`[ATLAS] ⚠️ No selector for step ${idx + 1}. ActionID: ${step.original_action_id || 'NULL'}`);
            }

            // 3. Execution Logic with Fallbacks
            let evidencePromise: Promise<{ screenshotUrl: string }> | null = null;
            try {
                let success = false;

                if (step.action_type === 'navigate') {
                    const targetUrl = step.payload || startUrl; // Fallback to base
                    console.log(`[ATLAS] Navigating to ${targetUrl}`);
                    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
                    success = true;
                }
                else {
                    // HEALER INTEGRATION: Robust interaction
                    const healed = await Healer.find(page, selector, step.intent, suiteId);

                    if (healed.success && healed.element) {
                        if (step.action_type === 'click') await healed.element.click();
                        if (step.action_type === 'fill') {
                            await healed.element.click().catch(() => { });
                            await page.keyboard.type(step.payload || 'Test');
                        }
                        success = true;
                        if (healed.method !== 'strict') {
                            console.log(`[ATLAS] 🩹 Auto-healed action using ${healed.method}`);
                        }
                    } else {
                        console.log(`[ATLAS] ❌ Healer failed to find element for: "${step.intent}"`);
                    }
                }

                // TURBO: Adaptive wait resolves when DOM settles
                await waitForUISettled(page, 400, 3000);

                // 4. Capture Evidence (Success or Fail) - Background fire-and-forget
                evidencePromise = captureEvidence(page, suiteId, execStepId, false).catch(() => ({ screenshotUrl: '' }));

                if (success) {
                    const evidence = await evidencePromise;
                    await supabase.from('test_steps').update({
                        status: 'success',
                        screenshot_url: evidence?.screenshotUrl || ''
                    }).eq('id', execStepId);

                    // VERIFICATION (The Judge) ⚖️
                    if (step.expected_observation) {
                        const pageText = await getBodyText(page);
                        const llmCtx = createLLMContext(); // Fresh context for judge
                        const verification = await Cortex.AuditJudge.verify(step.expected_observation, pageText, llmCtx);

                        if (!verification.success) {
                            console.log(`[ATLAS] ❌ Verification Failed: ${verification.reason}`);
                            await createLog(suiteId, `⚠️ Verificación falló: ${verification.reason}`, 'warning');

                            await supabase.from('test_steps').update({
                                status: 'failed',
                                expected_result: `Actual: Failed Verification. Judge: ${verification.reason}`
                            }).eq('id', execStepId);
                        } else {
                            await createLog(suiteId, `✅ Verificado: ${step.expected_observation}`, 'success');
                            successCount++;
                        }
                    } else {
                        successCount++;
                    }
                } else {
                    await createLog(suiteId, `⚠️ No se pudo ejecutar: ${step.intent}`, 'warning');
                    const evidence = evidencePromise ? await evidencePromise : null;
                    await supabase.from('test_steps').update({
                        status: 'failed',
                        expected_result: `Failed to interact. Key: "${step.intent}". Smart Fallback failed.`,
                        screenshot_url: evidence?.screenshotUrl || ''
                    }).eq('id', execStepId);

                    break;
                }

            } catch (e: any) {
                console.error(`[ATLAS] Exec Error: ${e.message}`);
                // Try capture one last time if the promise didn't start or we want fresh error screen
                const evidence = await (evidencePromise || captureEvidence(page, suiteId, execStepId, false).catch(() => ({ screenshotUrl: '' })));

                await supabase.from('test_steps').update({
                    status: 'failed',
                    expected_result: `Exception: ${e.message}`,
                    screenshot_url: evidence?.screenshotUrl || ''
                }).eq('id', execStepId);
                break;
            }
        }

        // Final Update
        const finalStatus = successCount === steps.length ? 'verified' : 'failed';
        await supabase.from('test_journeys').update({ status: finalStatus }).eq('id', journeyId);

        if (finalStatus === 'verified') {
            await createLog(suiteId, `✅ Journey validado exitosamente (${successCount}/${steps.length})`, 'success');
        } else {
            await createLog(suiteId, `❌ Journey incompleto (${successCount}/${steps.length})`, 'warning');
        }

    } finally {
        await page.close();
        // Do NOT close browser here, it's shared
    }
}

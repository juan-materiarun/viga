
import { supabase, updateJobProgress } from '../lib/supabase';
import { Logger } from '../lib/logger';
import { createLLMContext } from '../lib/llm';
import { Cortex } from '../lib/cortex';
import { Healer } from '../lib/healer';
import { getBrowser, getBodyText, injectScripts, getActiveElements, getAccessibilityTree } from '../lib/browser';
import { captureEvidence, waitForUISettled } from '../lib/evidence';
// import { getActiveElements } from '../lib/fingerprint'; // Removed

export async function runStrikeAgent(
    jobId: string,
    url: string,
    suiteId: string,
    objective: string,
    credentials?: any
) {
    Logger.info(`[STRIKE] 🎯 Initializing STRIKE Agent for Objective: "${objective}"`, suiteId);
    await updateJobProgress(jobId, 'running');

    const browser = await getBrowser();
    const page = await browser.newPage();
    const llmCtx = createLLMContext('premium'); // Use smart model for planning

    // Telemetry
    let actionsExecuted = 0;
    const MAX_ACTIONS = 20; // Cap for safety
    const history: string[] = [];

    try {
        await injectScripts(page);
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        while (actionsExecuted < MAX_ACTIONS) {

            // 1. ANALYZE STATE
            const currentUrl = page.url();
            const pageText = await getBodyText(page);

            // 2. VERIFY GOAL (Audit Judge) - Are we there yet?
            const verification = await Cortex.AuditJudge.verify(objective, pageText, llmCtx);

            if (verification.success && actionsExecuted > 0) {
                Logger.success(`[STRIKE] 🏁 Objective Verified! Reason: ${verification.reason}`, suiteId);
                await captureEvidence(page, suiteId, `strike_win_${actionsExecuted}`, false);
                await updateJobProgress(jobId, 'completed', { result: 'Goal Achieved' });
                return;
            }

            // 3. PLAN NEXT MOVE (Strategic Planner)
            // Use Accessibility Tree for richer, semantic context (lighter than full DOM)
            const axTree = await getAccessibilityTree(page).catch(() => null);
            const actionableElements = axTree ? JSON.stringify(axTree).slice(0, 8000) : (await getBodyText(page)).slice(0, 3000);

            const plan = await Cortex.StrategicPlanner.plan(
                history.join(' -> '),
                currentUrl,
                actionableElements,
                llmCtx
            );

            Logger.info(`[STRIKE] 🧠 Strategy: ${plan.strategy} | Focus: ${plan.focus_selector || 'General'}`, suiteId);
            history.push(`State: ${currentUrl} -> Plan: ${plan.strategy}`);

            if (!plan.focus_selector) {
                Logger.warn(`[STRIKE] ⚠️ No clear move identified. Aborting to save tokens.`, suiteId);
                break;
            }

            // 4. EXECUTE AGENTIC ACTION
            // We treat the "focus_selector" as an intent or selector
            const intent = plan.strategy; // Use the strategy reasoning as high-level intent
            const target = plan.focus_selector; // The AI gives us a hint/text/selector

            Logger.action(`Attempting: ${target}`, suiteId);

            // Use HEALER to find the best element matching the AI's target hint
            const healed = await Healer.find(page, null, target, suiteId);

            if (healed.success && healed.element) {
                // Determine action type based on element tag
                const tagName = await healed.element.evaluate(e => e.tagName.toLowerCase());

                if (tagName === 'input' || tagName === 'textarea') {
                    // Logic for inputs (Fill)
                    // We need a value! Ask DataScientist or heuristics
                    let value = "Test Value";
                    if (credentials && (target.includes('user') || target.includes('mail'))) value = credentials.username;
                    if (credentials && (target.includes('pass') || target.includes('clave'))) value = credentials.password;

                    // If no creds matched, generate synthetic
                    if (value === "Test Value") {
                        value = await Cortex.DataScientific.generate(tagName, 'text', target, target, "Generar datos para test", llmCtx);
                    }

                    await healed.element.fill(value);
                    Logger.action(`Filled "${value}" into ${target}`, suiteId);
                } else {
                    // Default Click
                    await healed.element.click();
                    Logger.action(`Clicked ${target}`, suiteId);
                }

                actionsExecuted++;
                // Per user request: stabilize 1-2s and capture before planning next move
                await captureEvidence(page, suiteId, `strike_step_${actionsExecuted}`, false);

            } else {
                Logger.error(`[STRIKE] ❌ Failed to execute plan. Could not interact with: ${target}`, undefined, suiteId);
                // We might want to retry or abort. For now, abort to prevent loops.
                break;
            }
        }

        // If loop finishes without success
        Logger.warn(`[STRIKE] 🛑 Max actions reached or stuck. Objective might not be fully met.`, suiteId);
        await updateJobProgress(jobId, 'failed', { error: "Objective not verified after max steps" });

    } catch (e: any) {
        Logger.error(`[STRIKE] 💥 Fatal Error: ${e.message}`, e, suiteId);
        await updateJobProgress(jobId, 'failed', { error: e.message });
    } finally {
        await browser.close();
    }
}

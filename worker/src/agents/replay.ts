
import { supabase, updateJobProgress } from '../lib/supabase';
import { Logger } from '../lib/logger';
import { Healer } from '../lib/healer';
import { getBrowser } from '../lib/browser';
import { captureEvidence } from '../lib/evidence';

export async function runReplayAgent(
    jobId: string,
    url: string,
    suiteId: string,
    steps: any[],
    credentials?: any
) {
    Logger.info(`[REPLAY] 🔄 Initializing Regression Replay (${steps.length} steps)`, suiteId);
    await updateJobProgress(jobId, 'running');

    const browser = await getBrowser();
    const page = await browser.newPage();

    let stepsExecuted = 0;
    let failed = false;

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2000);

        // Optional: login if credentials provided and first step isn't login? 
        // For now, assume steps contain login if needed or session is fresh.

        for (const [index, step] of steps.entries()) {
            Logger.info(`[REPLAY] 👣 Step ${index + 1}: ${step.intent || step.action_type}`, suiteId);

            try {
                // Determine target
                const selector = step.selector || (step.ui_actions?.selectors?.[0] || null);
                const intent = step.intent || step.description || '';

                // HEALER to the rescue
                const healed = await Healer.find(page, selector, intent, suiteId);

                if (!healed.success || !healed.element) {
                    throw new Error(`Could not find element for: ${intent}`);
                }

                // Execute Action
                const actionType = step.action_type || 'click';

                if (actionType === 'click') {
                    await healed.element.click();
                } else if (actionType === 'fill' || actionType === 'type') {
                    const val = step.payload || step.value || 'Test';
                    await healed.element.fill(val);
                } else if (actionType === 'navigate') {
                    await page.goto(step.payload || url);
                } else if (actionType === 'wait') {
                    await page.waitForTimeout(parseInt(step.payload || '2000'));
                }

                await page.waitForTimeout(1000); // Visual pause

                // Capture Evidence for step
                await captureEvidence(page, suiteId, `replay_step_${index + 1}`, false);
                stepsExecuted++;

            } catch (stepError: any) {
                Logger.error(`[REPLAY] ❌ Step ${index + 1} Failed: ${stepError.message}`, stepError, suiteId);
                await captureEvidence(page, suiteId, `replay_fail_${index + 1}`, true);
                failed = true;
                break; // Stop on first failure in regression
            }
        }

        if (failed) {
            await updateJobProgress(jobId, 'failed', { error: `Regression failed at step ${stepsExecuted + 1}` });
        } else {
            Logger.success(`[REPLAY] ✅ Regression Passed! (${stepsExecuted} steps)`, suiteId);
            await updateJobProgress(jobId, 'completed', { result: 'Regression Passed' });
        }

    } catch (e: any) {
        Logger.error(`[REPLAY] 💥 Fatal Error: ${e.message}`, e, suiteId);
        await updateJobProgress(jobId, 'failed', { error: e.message });
    } finally {
        await browser.close();
    }
}

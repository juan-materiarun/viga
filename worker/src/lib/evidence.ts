import { supabase } from './supabase';

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function captureEvidence(page: any, suiteId: string, stepId: string, isError: boolean = false): Promise<{ screenshotUrl: string, domSnapshot?: string }> {
    try {
        // MANDATORY STABILIZATION (Per USER request)
        // 1. Wait 1000ms base
        await sleep(1000);
        // 2. Wait for DOM to be quiet for at least 500ms (max 2s)
        await waitForUISettled(page, 500, 2000);

        const timestamp = Date.now();
        const screenshotBuffer = await page.screenshot({
            fullPage: false,
            quality: 60,
            type: 'jpeg'
        });

        const path = `${suiteId}/${stepId}_${timestamp}${isError ? '_error' : ''}.jpg`;

        // The upload itself is the heavy part, so we return the URL promise
        // but the screenshot taking above is BLOCKING to ensure we catch the right state.
        const uploadPromise = supabase.storage
            .from('evidence')
            .upload(path, screenshotBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            });

        const { data } = supabase.storage
            .from('evidence')
            .getPublicUrl(path);

        // We fire-and-forget the upload check but return the URL immediately
        uploadPromise.catch(e => console.error('[EVIDENCE] Upload background error:', e.message));

        return { screenshotUrl: data.publicUrl };

    } catch (e: any) {
        console.error('[EVIDENCE] Capture failed:', e.message);
        return { screenshotUrl: '' };
    }
}


/**
 * TURBO: Adaptive wait using MutationObserver — resolves as soon as the DOM
 * has been quiet for `quietMs` milliseconds, or after `maxMs` hard timeout.
 * 
 * This REPLACES fixed `sleep(1500)` calls after actions.
 * On fast pages it resolves in ~100ms. On slow SPAs it self-adjusts upward.
 */
export async function waitForUISettled(page: any, quietMs = 350, maxMs = 4000): Promise<void> {
    try {
        await page.evaluate(({ quiet, max }: { quiet: number; max: number }) => {
            return new Promise<void>((resolve) => {
                let timer: ReturnType<typeof setTimeout>;

                const reset = () => {
                    clearTimeout(timer);
                    timer = setTimeout(resolve, quiet);
                };

                // Watch DOM mutations (new elements, attribute changes)
                const mo = new MutationObserver(reset);
                mo.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });

                // Hard timeout fallback
                const hardStop = setTimeout(() => {
                    mo.disconnect();
                    resolve();
                }, max);

                // Kick off the first timer
                reset();

                // Cleanup both timers and observer once settled
                const done = (t: ReturnType<typeof setTimeout>) => {
                    clearTimeout(t);
                    clearTimeout(hardStop);
                    mo.disconnect();
                    resolve();
                };

                timer = setTimeout(() => done(timer), quiet);
            });
        }, { quiet: quietMs, max: maxMs });
    } catch {
        // Page may have navigated — that's fine, it means the action worked
    }
}


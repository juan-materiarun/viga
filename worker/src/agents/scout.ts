
/**
 * VIGA Scout Agent (The Cartographer)
 * Purpose: Map the application state and discover locators without risky interactions.
 */

import { getBrowser } from '../lib/browser';
import { supabase, updateJobProgress } from '../lib/supabase';
import { registerLocator } from '../lib/locators';
import { normalizeUrl } from '../lib/fingerprint';

const MAX_STEPS = 30;

// Simplified helper for Scout (Cartographer)
async function getActiveElements(page: any) {
    return page.$$eval('button, a, input, textarea, [role]', (els: any[]) =>
        els.map((e, idx) => ({
            index: idx,
            tag: e.tagName.toLowerCase(),
            text: e.textContent?.trim().slice(0, 100) || '',
            selector: `//${e.tagName.toLowerCase()}`, // Simplified for scout
            attributes: {
                role: e.getAttribute('role'),
                name: e.getAttribute('name'),
                id: e.id
            }
        }))
    );
}

export async function runScoutAgent(jobId: string, url: string, suiteId: string) {
    console.log('[SCOUT] 🗺️ Starting mapping mission...');
    const browser = await getBrowser();
    const page = await browser.newPage();

    // Visited URLs tracking
    const visitedUrls = new Set<string>();
    const linkQueue: string[] = [url];

    try {
        await page.goto(url, { waitUntil: 'domcontentloaded' });

        let steps = 0;
        while (steps < MAX_STEPS && linkQueue.length > 0) {
            if (page.isClosed()) break;

            // 1. Wait for stability
            await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => { });
            const currentUrl = page.url();
            const normalized = normalizeUrl(currentUrl);

            // 2. Map the current page
            console.log(`[SCOUT] Scanning: ${currentUrl}`);
            const elements = await getActiveElements(page);

            let newLocators = 0;
            for (const el of elements as any[]) {
                try {
                    const loc = await registerLocator(el, currentUrl);
                    if (loc.status === 'new') newLocators++;
                } catch (e) { }
            }
            console.log(`[SCOUT] Found ${elements.length} elements (${newLocators} new).`);

            visitedUrls.add(normalized);

            // 3. Find next navigation target
            // Prioritize links that lead to unvisited internal pages
            const links = await page.$$eval('a[href]', (as: any[]) => as.map(a => a.href));
            const distinctLinks = new Set(links.filter(l => l.startsWith(new URL(currentUrl).origin)));

            for (const link of distinctLinks) {
                if (!visitedUrls.has(normalizeUrl(link)) && !linkQueue.includes(link)) {
                    linkQueue.push(link);
                }
            }

            // 4. Navigate to next
            // If current page is done, pick next from queue
            // Since we are not clicking, we just use goto() usually? 
            // BUT Scout should probably "click" links to verify they work? 
            // For V1 Scout, let's use direct navigation to be faster, or clicking if standard SPA.

            // Optimization: If we are already on a page, maybe look for a link to click in the DOM?
            // This is safer for SPA.

            let navigationOccurred = false;
            // Find a link to a new place
            const navigationCandidates = (elements as any[]).filter(el =>
                (el.tag === 'a' || el.attributes?.role === 'link') &&
                !(el.attributes as any)?.href?.includes('logout')
            );

            // Simple heuristic mapping
            // For now, let's just cycle queue
            const nextLink = linkQueue.shift();
            if (nextLink && nextLink !== currentUrl) {
                await page.goto(nextLink);
                steps++;
            } else {
                // If queue empty or same link, stop?
                if (linkQueue.length === 0) break;
            }

            await updateJobProgress(jobId, null, null, { current_action: steps, max_actions: MAX_STEPS });
        }

        console.log('[SCOUT] Mission complete.');
        await supabase.from('test_suites').update({ status: 'completed' }).eq('id', suiteId);

    } catch (e: any) {
        console.error('[SCOUT] Failed:', e);
        await supabase.from('test_suites').update({ status: 'failed' }).eq('id', suiteId);
    } finally {
        console.log('[SCOUT] 🕒 Manteniendo navegador abierto 60s para inspección...');
        await new Promise(r => setTimeout(r, 60000));
        await page.close().catch(() => { });
        await browser.close().catch(() => { });
    }
}

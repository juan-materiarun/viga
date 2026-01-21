/**
 * Chaos v3 Experimental Utilities
 * 
 * Helper functions for v3 features (global state tracking, depth detection).
 * Only used when CHAOS_V3_EXPERIMENTAL flag is enabled.
 */

import { supabase } from './supabase';
import { UIAction } from './actions';

/**
 * Record a global state change (theme, language, etc.)
 */
export async function recordGlobalStateChange(
    suiteId: string,
    action: UIAction,
    stateKey: string,
    stateValue: string
): Promise<void> {
    await supabase.from('global_state_snapshot').insert({
        suite_id: suiteId,
        state_key: stateKey,
        state_value: stateValue,
        action_id: action.id
    });
}

/**
 * Infer state key and value from action (e.g., "theme" -> "dark")
 */
export function inferStateKeyValue(action: UIAction): { key: string; value: string } | null {
    const name = action.canonical_name.toLowerCase();
    const hint = action.aria_label?.toLowerCase() || '';

    // Theme detection
    if (name.includes('dark') || hint.includes('dark') || hint.includes('oscuro')) {
        return { key: 'theme', value: 'dark' };
    }
    if (name.includes('light') || hint.includes('light') || hint.includes('claro')) {
        return { key: 'theme', value: 'light' };
    }

    // Language detection
    if (name.includes('español') || name.includes('es') || hint.includes('spanish')) {
        return { key: 'language', value: 'es' };
    }
    if (name.includes('english') || name.includes('en') || hint.includes('inglés')) {
        return { key: 'language', value: 'en' };
    }

    return null;
}

/**
 * Detect if an action caused a "depth change" (modal, navigation, async load)
 */
export async function detectDepthChange(
    page: any,
    beforeState: { url: string; elementCount: number }
): Promise<boolean> {
    try {
        const afterUrl = page.url();
        const afterElementCount = await page.evaluate(() => {
            return document.querySelectorAll('a, button, input, select, textarea').length;
        });

        // URL changed (navigation)
        if (beforeState.url !== afterUrl) {
            return true;
        }

        // Significant element count change (modal opened, content loaded)
        if (Math.abs(afterElementCount - beforeState.elementCount) > 5) {
            return true;
        }

        // Modal/dialog opened
        const modalOpened = await page.evaluate(() => {
            return document.querySelectorAll('[role="dialog"], .modal, .popup, [aria-modal="true"]').length > 0;
        });

        if (modalOpened) {
            return true;
        }

        // Async loading indicator
        const isLoading = await page.evaluate(() => {
            return document.querySelectorAll('[aria-busy="true"], .loading, .spinner').length > 0;
        });

        if (isLoading) {
            // Wait for loading to finish
            await new Promise(r => setTimeout(r, 2000));
            return true;
        }

        return false;
    } catch (e) {
        console.warn('[V3] Depth detection failed:', e);
        return false;
    }
}

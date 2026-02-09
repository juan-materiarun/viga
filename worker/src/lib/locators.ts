
import { supabase } from './supabase';
import { UIElement, computeFingerprint } from './fingerprint';

export type LocatorStatus = 'new' | 'verified' | 'broken' | 'ignored';

export interface UILocator {
    id: string;
    project_id?: string;
    fingerprint: string;
    name: string;
    description?: string;
    selectors: {
        css?: string;
        xpath?: string;
        ai_description?: string;
        attributes?: any;
    };
    status: LocatorStatus;
    last_seen_at: string;
    screenshot_url?: string;
}

/**
 * SERVICE: Locator Management (The Cartographer's Tool)
 * Handles CRUD for the persistent 'ui_locators' table.
 */

/**
 * Find a locator by its semantic fingerprint.
 */
export async function findLocatorByFingerprint(fingerprint: string): Promise<UILocator | null> {
    const { data, error } = await supabase
        .from('ui_locators')
        .select('*')
        .eq('fingerprint', fingerprint)
        .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
        console.warn('[LOCATORS] Find error:', error.message);
    }
    return data as UILocator | null;
}

/**
 * Register a newly discovered element or update an existing one.
 * If it exists, we update 'last_seen_at'.
 * If it's new, we create it with status 'new'.
 */
export async function registerLocator(
    element: UIElement,
    pageUrl: string,
    screenshotUrl?: string
): Promise<UILocator> {
    // 1. Generate stable fingerprint
    const fingerprint = computeFingerprint(element, pageUrl);

    // 2. Check existence
    const existing = await findLocatorByFingerprint(fingerprint);

    if (existing) {
        // Update heartbeat
        const { data, error } = await supabase
            .from('ui_locators')
            .update({ last_seen_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) console.error('[LOCATORS] Heartbeat failed:', error.message);
        return existing; // Return original to preserve name/status
    }

    // 3. Create new locator
    // Auto-generate a readable name (fallback)
    const hints = element.hint?.split('|') || [];
    const bestHint = hints[0]?.trim() || element.tag;
    const autoName = `${bestHint} (${element.tag})`;

    const newLocator: Partial<UILocator> = {
        fingerprint,
        name: autoName,
        selectors: {
            css: element.selector,
            xpath: element.xpath,
            attributes: element.attributes
        },
        status: 'new',
        screenshot_url: screenshotUrl
    };

    const { data: created, error: createError } = await supabase
        .from('ui_locators')
        .insert(newLocator)
        .select()
        .single();

    if (createError) {
        throw new Error(`[LOCATORS] Creation failed: ${createError.message}`);
    }

    console.log(`[LOCATORS] 🆕 Discovered: ${autoName} [${fingerprint.substring(0, 8)}]`);
    return created as UILocator;
}

/**
 * Update a locator's human-readable name (e.g. from Dashboard or AI)
 */
export async function renameLocator(id: string, newName: string) {
    return await supabase
        .from('ui_locators')
        .update({ name: newName })
        .eq('id', id);
}

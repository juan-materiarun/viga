/**
 * Action Management Library
 * 
 * Handles CRUD operations for ui_actions table and provides
 * the core logic for finding, matching, and creating actions.
 */

import { supabase } from './supabase';
import { Logger } from './logger';
import {
    UIElement,
    computeFingerprint,
    computeSimilarity,
    generateCanonicalName,
    normalizeUrl,
    detectContainer,
    inferIntent,
    inferActionCategory,
    ActionCategory
} from './fingerprint';

export interface UIAction {
    id: string;
    fingerprint: string;
    role: string;
    aria_label: string;
    aria_pressed: string | null;
    input_type: string;
    tag: string;
    url_pattern: string;
    container_context: string;
    canonical_name: string;
    selectors: { type: string; value: string }[];
    first_seen_at: string;
    last_seen_at: string;
    execution_count: number;
    dom_delta_signature: string | null;
    metadata: {
        semantic_intent?: string;
        [key: string]: any;
    };
    action_category: ActionCategory;
}

const SIMILARITY_THRESHOLD = 0.75;

/**
 * Find an existing action by fingerprint, or find a similar one by score.
 * If no match found, creates a new action.
 * 
 * @returns The matched or newly created action
 */
export async function findOrCreateAction(
    element: UIElement,
    pageUrl: string,
    actionType: 'click' | 'type' = 'click',
    scanStartTime?: string,
    usedInThisScan?: Set<string>
): Promise<UIAction> {
    let fingerprint = computeFingerprint(element, pageUrl);
    const urlPattern = normalizeUrl(pageUrl);

    // 1. Try exact fingerprint match (Always global)
    const { data: exactMatch } = await supabase
        .from('ui_actions')
        .select('*')
        .eq('fingerprint', fingerprint)
        .single();

    if (exactMatch) {
        // CRITICAL FIX: Even exact matches must respect 1:1 scan uniqueness
        if (!usedInThisScan?.has(exactMatch.id)) {
            await updateActionSelectors(exactMatch.id, element);
            return exactMatch as UIAction;
        }
        Logger.debug(`[ACTIONS] Exact match ${exactMatch.id} already used in this scan. Forcing new variant.`);
    }

    // 2. Try fuzzy match by URL + role + similarity score
    // CRITICAL FIX: Only match against actions established BEFORE this scan cycle.
    // This prevents "snowballing" where distinct elements on the same page collapse into the first created action.
    const role = element.attributes?.role || inferRoleSimple(element);
    let query = supabase
        .from('ui_actions')
        .select('*')
        .eq('url_pattern', urlPattern)
        .eq('tag', element.tag.toLowerCase());

    if (scanStartTime) {
        query = query.lt('first_seen_at', scanStartTime);
    }

    const { data: candidates } = await query;

    if (candidates && candidates.length > 0) {
        for (const candidate of candidates) {
            // COLLISION CHECK: If this candidate ID is already used in this scan, SKIP IT.
            // This forces creation of a new action for the second/third/etc element.
            if (usedInThisScan?.has(candidate.id)) {
                continue;
            }

            const similarity = computeSimilarity(candidate, element, pageUrl);
            if (similarity >= SIMILARITY_THRESHOLD) {
                Logger.debug(`[ACTIONS] Matched existing action (score: ${(similarity * 100).toFixed(0)}%): ${candidate.canonical_name}`);
                await updateActionSelectors(candidate.id, element);
                return candidate as UIAction;
            }
        }
    }

    // 3. No match found (or all matches matched already-used IDs) -> Create new action
    const baseCanonicalName = generateCanonicalName(element, actionType);
    let attempt = 0;
    while (attempt < 5) {
        const suffix = attempt > 0 ? ` #${attempt + 1}` : '';
        const variantFingerprint = attempt > 0 ? `${fingerprint}_v${attempt}` : fingerprint;

        const newAction: Partial<UIAction> = {
            fingerprint: variantFingerprint,
            role,
            aria_label: element.attributes?.['aria-label'] || element.hint?.split('|')[0]?.trim() || '',
            aria_pressed: element.attributes?.['aria-pressed'] || null,
            input_type: element.attributes?.type || '',
            tag: element.tag.toLowerCase(),
            url_pattern: urlPattern,
            container_context: detectContainer(element),
            canonical_name: `${baseCanonicalName}${suffix}`,
            selectors: [
                { type: 'css', value: element.selector },
                ...(element.xpath ? [{ type: 'xpath', value: element.xpath }] : [])
            ],
            execution_count: 0,
            metadata: {
                semantic_intent: inferIntent(element)
            },
            action_category: inferActionCategory(element, inferIntent(element))
        };

        const { data: created, error } = await supabase
            .from('ui_actions')
            .insert(newAction)
            .select()
            .single();

        if (!error) {
            Logger.debug(`[ACTIONS] Created new action: ${newAction.canonical_name}`);
            return created as UIAction;
        }

        // Handle collision
        if (error.code === '23505') { // Unique violation
            // Check if it's the fingerprint that collided
            const { data: existing } = await supabase
                .from('ui_actions')
                .select('*')
                .eq('fingerprint', variantFingerprint)
                .single();

            if (existing) {
                // If it exists AND is not used, take it
                if (!usedInThisScan?.has(existing.id)) {
                    return existing as UIAction;
                }
                // If used, try next variant
                attempt++;
                continue;
            }
        }

        Logger.error('[ACTIONS] Failed to create action', error);
        throw error;
    }

    throw new Error(`Failed to find unique action slot after 5 attempts for ${baseCanonicalName}`);
}

/**
 * Update an action's selectors with new values from the element.
 * Also updates last_seen_at timestamp.
 */
async function updateActionSelectors(actionId: string, element: UIElement): Promise<void> {
    const { data: existing } = await supabase
        .from('ui_actions')
        .select('selectors')
        .eq('id', actionId)
        .single();

    const currentSelectors: { type: string; value: string }[] = existing?.selectors || [];

    // Add new selectors if not already present
    const newSelectors = [...currentSelectors];
    const cssExists = currentSelectors.some(s => s.type === 'css' && s.value === element.selector);
    if (!cssExists && element.selector) {
        newSelectors.push({ type: 'css', value: element.selector });
    }

    const xpathExists = currentSelectors.some(s => s.type === 'xpath' && s.value === element.xpath);
    if (!xpathExists && element.xpath) {
        newSelectors.push({ type: 'xpath', value: element.xpath });
    }

    // Keep only the last 5 selectors of each type to avoid bloat
    const limitedSelectors = limitSelectors(newSelectors, 5);

    await supabase
        .from('ui_actions')
        .update({
            selectors: limitedSelectors,
            last_seen_at: new Date().toISOString()
        })
        .eq('id', actionId);
}

function limitSelectors(selectors: { type: string; value: string }[], maxPerType: number): { type: string; value: string }[] {
    const byType: Record<string, { type: string; value: string }[]> = {};
    for (const s of selectors) {
        if (!byType[s.type]) byType[s.type] = [];
        byType[s.type].push(s);
    }

    const result: { type: string; value: string }[] = [];
    for (const type of Object.keys(byType)) {
        result.push(...byType[type].slice(-maxPerType));
    }
    return result;
}

/**
 * Check if an action has been executed in a given state within a suite.
 */
export async function hasActionBeenExecuted(
    suiteId: string,
    actionId: string,
    stateHash: string
): Promise<boolean> {
    const { data } = await supabase
        .from('action_executions')
        .select('id')
        .eq('suite_id', suiteId)
        .eq('action_id', actionId)
        .eq('state_hash', stateHash)
        .limit(1);

    return (data?.length || 0) > 0;
}

/**
 * Record that an action was executed in a given state.
 */
export async function recordActionExecution(
    suiteId: string,
    actionId: string,
    stateHash: string,
    stepId?: string
): Promise<void> {
    await supabase
        .from('action_executions')
        .upsert({
            suite_id: suiteId,
            action_id: actionId,
            state_hash: stateHash,
            step_id: stepId
        }, { onConflict: 'suite_id, action_id, state_hash' });

    // Increment execution count (simple increment, not atomic but sufficient)
    const { data: current } = await supabase
        .from('ui_actions')
        .select('execution_count')
        .eq('id', actionId)
        .single();

    await supabase
        .from('ui_actions')
        .update({
            execution_count: (current?.execution_count || 0) + 1
        })
        .eq('id', actionId);
}

/**
 * Get all known actions for a URL pattern.
 */
export async function getActionsForUrl(urlPattern: string): Promise<UIAction[]> {
    const { data } = await supabase
        .from('ui_actions')
        .select('*')
        .eq('url_pattern', urlPattern)
        .order('execution_count', { ascending: false });

    return (data || []) as UIAction[];
}

/**
 * Get actions that have NOT been executed in the current suite/state.
 */
export async function getUntestedActions(
    suiteId: string,
    stateHash: string,
    allActions: UIAction[]
): Promise<UIAction[]> {
    if (allActions.length === 0) return [];

    const actionIds = allActions.map(a => a.id);

    // Get executions for this suite/state
    const { data: executions } = await supabase
        .from('action_executions')
        .select('action_id')
        .eq('suite_id', suiteId)
        .eq('state_hash', stateHash)
        .in('action_id', actionIds);

    const executedIds = new Set((executions || []).map(e => e.action_id));

    return allActions.filter(a => !executedIds.has(a.id));
}

/**
 * Simple role inference for matching purposes.
 */
function inferRoleSimple(element: UIElement): string {
    const tag = element.tag.toLowerCase();
    const type = element.attributes?.type || '';
    const hint = (element.hint || '').toLowerCase();

    if (tag === 'input') {
        if (type === 'checkbox') return 'checkbox';
        if (type === 'radio') return 'radio';
        if (type === 'submit') return 'submit-button';
        return 'input';
    }

    if (tag === 'button') {
        if (hint.includes('toggle') || hint.includes('switch')) return 'toggle';
        return 'button';
    }

    if (tag === 'a') return 'link';

    return element.attributes?.role || tag;
}

/**
 * Prioritize actions for execution order.
 * Priority: inputs > buttons > toggles > links
 */
export function prioritizeActions(actions: UIAction[]): UIAction[] {
    const priority: Record<string, number> = {
        'text-input': 1,
        'email-input': 1,
        'password-input': 1,
        'search-input': 1,
        'textarea': 1,
        'input': 2,
        'dropdown': 3,
        'checkbox': 4,
        'radio': 4,
        'submit-button': 5,
        'button': 6,
        'toggle': 7,
        'link': 8
    };

    return [...actions].sort((a, b) => {
        const pa = priority[a.role] || 10;
        const pb = priority[b.role] || 10;
        return pa - pb;
    });
}

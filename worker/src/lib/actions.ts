/**
 * Action Management Library — TURBO EDITION
 *
 * KEY OPTIMIZATION:
 *   Old: 2 DB calls per element → O(N) serial queries.
 *   New: 1 bulk fetch per scan cycle → O(1) and all matching done in-memory.
 *
 * Usage pattern (per scan cycle in the agent):
 *   const cache = await buildActionCache(urlPattern);
 *   const action = findOrCreateActionCached(element, url, type, cache);
 *   await flushActionCache(cache); // one batch write at end of cycle
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
    semantic_type: string | null;
    confidence_score: number;
    last_page_type: string | null;
    last_purpose: string | null;
    locked_by_suite: string | null;
}

// ─── In-memory scan cache ─────────────────────────────────────────────────

export interface ActionScanCache {
    urlPattern: string;
    /** All existing actions for this URL, indexed by fingerprint for O(1) exact lookup */
    byFingerprint: Map<string, UIAction>;
    /** Flat list of all known actions for fuzzy matching */
    all: UIAction[];
    /** Actions matched or created in this scan cycle, keyed by their element-position */
    usedIds: Set<string>;
    /** New actions staged for batch insert at end of cycle */
    pending: Partial<UIAction>[];
    /** Selector updates staged for batch at end of cycle */
    selectorUpdates: Map<string, { type: string; value: string }[]>;
    /** Timestamp when this scan started — used to filter out actions created within this cycle */
    scanStart: string;
}

const SIMILARITY_THRESHOLD = 0.75;

/**
 * STEP 1: Call once at the start of each scan cycle.
 * Bulk-fetches all known actions for this URL and builds an in-memory cache.
 */
export async function buildActionCache(urlPattern: string): Promise<ActionScanCache> {
    const { data, error } = await supabase
        .from('ui_actions')
        .select('*')
        .eq('url_pattern', urlPattern);

    if (error) {
        Logger.warn(`[ACTIONS] Cache load failed: ${error.message}. Starting empty.`);
    }

    const all = (data || []) as UIAction[];
    const byFingerprint = new Map<string, UIAction>();
    for (const a of all) byFingerprint.set(a.fingerprint, a);

    return {
        urlPattern,
        byFingerprint,
        all,
        usedIds: new Set(),
        pending: [],
        selectorUpdates: new Map(),
        scanStart: new Date().toISOString()
    };
}

/**
 * STEP 2: Call per element — fully in-memory, no DB round trips inside.
 * Falls back to staging a new action in `cache.pending` if no match is found.
 */
export function findOrCreateActionCached(
    element: UIElement,
    pageUrl: string,
    actionType: 'click' | 'type' = 'click',
    cache: ActionScanCache
): UIAction {
    const fingerprint = computeFingerprint(element, pageUrl);

    // 1. Exact fingerprint match (O(1))
    const exact = cache.byFingerprint.get(fingerprint);
    if (exact && !cache.usedIds.has(exact.id)) {
        cache.usedIds.add(exact.id);
        _stageSelectorsUpdate(cache, exact, element);
        return exact;
    }

    // 2. Fuzzy match (in-memory, no DB call)
    for (const candidate of cache.all) {
        if (cache.usedIds.has(candidate.id)) continue;
        if (candidate.tag !== element.tag.toLowerCase()) continue;
        // Only match against actions created BEFORE this scan to prevent within-cycle collapse
        if (candidate.first_seen_at >= cache.scanStart) continue;

        const similarity = computeSimilarity(candidate, element, pageUrl);
        if (similarity >= SIMILARITY_THRESHOLD) {
            cache.usedIds.add(candidate.id);
            _stageSelectorsUpdate(cache, candidate, element);
            return candidate;
        }
    }

    // 3. No match — create a synthetic action and stage it for batch insert
    const role = element.attributes?.role || _inferRoleSimple(element);
    const baseCanonicalName = generateCanonicalName(element, actionType);

    // Deduplicate name collisions within same cycle using a suffix
    const existingNames = new Set([...cache.all.map(a => a.canonical_name), ...cache.pending.map(p => p.canonical_name as string)]);
    let attempt = 0;
    let canonical_name = baseCanonicalName;
    while (existingNames.has(canonical_name)) {
        attempt++;
        canonical_name = `${baseCanonicalName} #${attempt + 1}`;
    }

    const variantFp = attempt > 0 ? `${fingerprint}_v${attempt}` : fingerprint;

    const newAction: Partial<UIAction> = {
        fingerprint: variantFp,
        role,
        aria_label: element.attributes?.['aria-label'] || element.hint?.split('|')[0]?.trim() || '',
        aria_pressed: element.attributes?.['aria-pressed'] || null,
        input_type: element.attributes?.type || '',
        tag: element.tag.toLowerCase(),
        url_pattern: cache.urlPattern,
        container_context: detectContainer(element),
        canonical_name,
        selectors: [
            { type: 'css', value: element.selector },
            ...(element.xpath ? [{ type: 'xpath', value: element.xpath }] : [])
        ],
        execution_count: 0,
        metadata: { semantic_intent: inferIntent(element) },
        action_category: inferActionCategory(element, inferIntent(element)),
        semantic_type: null,
        confidence_score: 0
    };

    cache.pending.push(newAction);

    // Return a provisional action with a temporary ID so the agent can continue immediately
    const provisional: UIAction = {
        ...(newAction as UIAction),
        id: `pending::${variantFp}`, // will be replaced after flush
        first_seen_at: cache.scanStart,
        last_seen_at: cache.scanStart,
        dom_delta_signature: null,
    };

    // Register in cache so subsequent elements don't collide with this one
    cache.all.push(provisional);
    cache.byFingerprint.set(variantFp, provisional);

    return provisional;
}

/**
 * STEP 3: Call once at the END of each scan cycle.
 * Writes all pending new actions to the DB in a single batch and resolves real IDs.
 * Returns a map of provisional IDs → real IDs.
 */
export async function flushActionCache(cache: ActionScanCache): Promise<Map<string, string>> {
    const idMap = new Map<string, string>();

    // 1. Batch insert all pending new actions
    if (cache.pending.length > 0) {
        const { data: created, error } = await supabase
            .from('ui_actions')
            .upsert(cache.pending, { onConflict: 'fingerprint', ignoreDuplicates: false })
            .select('id, fingerprint');

        if (error) {
            Logger.warn(`[ACTIONS] Batch insert failed: ${error.message}`);
        } else if (created) {
            for (const row of created) {
                const provisionalId = `pending::${row.fingerprint}`;
                idMap.set(provisionalId, row.id);
            }
            Logger.debug(`[ACTIONS] Flushed ${created.length} new actions in one DB write`);
        }
    }

    // 2. Batch update selectors for existing actions
    if (cache.selectorUpdates.size > 0) {
        const updates = Array.from(cache.selectorUpdates.entries()).map(([id, selectors]) => ({
            id,
            selectors,
            last_seen_at: new Date().toISOString()
        }));

        // Supabase doesn't support bulk update natively, do it in parallel (still N round trips but non-blocking)
        await Promise.allSettled(
            updates.map(u =>
                supabase.from('ui_actions').update({ selectors: u.selectors, last_seen_at: u.last_seen_at }).eq('id', u.id)
            )
        );
    }

    return idMap;
}

/** Stage a selector update for an existing action without hitting the DB immediately */
function _stageSelectorsUpdate(cache: ActionScanCache, action: UIAction, element: UIElement) {
    const current = cache.selectorUpdates.get(action.id) || [...(action.selectors || [])];
    const cssExists = current.some(s => s.type === 'css' && s.value === element.selector);
    const xpathExists = current.some(s => s.type === 'xpath' && s.value === element.xpath);

    if ((!cssExists && element.selector) || (!xpathExists && element.xpath)) {
        const updated = [...current];
        if (!cssExists && element.selector) updated.push({ type: 'css', value: element.selector });
        if (!xpathExists && element.xpath) updated.push({ type: 'xpath', value: element.xpath });
        cache.selectorUpdates.set(action.id, limitSelectors(updated, 5));
    }
}

function limitSelectors(selectors: { type: string; value: string }[], maxPerType: number) {
    const byType: Record<string, { type: string; value: string }[]> = {};
    for (const s of selectors) {
        if (!byType[s.type]) byType[s.type] = [];
        byType[s.type].push(s);
    }
    const result: { type: string; value: string }[] = [];
    for (const type of Object.keys(byType)) result.push(...byType[type].slice(-maxPerType));
    return result;
}

// ─── Legacy single-element API (kept for backward compat with atlas/strike) ──

/**
 * @deprecated Prefer buildActionCache + findOrCreateActionCached + flushActionCache
 * Still works, just slower (2 DB calls per element).
 */
export async function findOrCreateAction(
    element: UIElement,
    pageUrl: string,
    actionType: 'click' | 'type' = 'click',
    scanStartTime?: string,
    usedInThisScan?: Set<string>
): Promise<UIAction> {
    const fingerprint = computeFingerprint(element, pageUrl);
    const urlPattern = normalizeUrl(pageUrl);

    const { data: exactMatch } = await supabase
        .from('ui_actions')
        .select('*')
        .eq('fingerprint', fingerprint)
        .single();

    if (exactMatch && !usedInThisScan?.has(exactMatch.id)) {
        usedInThisScan?.add(exactMatch.id);
        return exactMatch as UIAction;
    }

    const role = element.attributes?.role || _inferRoleSimple(element);
    let query = supabase
        .from('ui_actions')
        .select('*')
        .eq('url_pattern', urlPattern)
        .eq('tag', element.tag.toLowerCase());

    if (scanStartTime) query = query.lt('first_seen_at', scanStartTime);

    const { data: candidates } = await query;
    if (candidates && candidates.length > 0) {
        for (const candidate of candidates) {
            if (usedInThisScan?.has(candidate.id)) continue;
            const similarity = computeSimilarity(candidate, element, pageUrl);
            if (similarity >= SIMILARITY_THRESHOLD) {
                usedInThisScan?.add(candidate.id);
                return candidate as UIAction;
            }
        }
    }

    const baseCanonicalName = generateCanonicalName(element, actionType);
    let attempt = 0;
    while (attempt < 5) {
        const suffix = attempt > 0 ? ` #${attempt + 1}` : '';
        const variantFingerprint = attempt > 0 ? `${fingerprint}_v${attempt}` : fingerprint;
        const newAction: Partial<UIAction> = {
            fingerprint: variantFingerprint, role,
            aria_label: element.attributes?.['aria-label'] || element.hint?.split('|')[0]?.trim() || '',
            aria_pressed: element.attributes?.['aria-pressed'] || null,
            input_type: element.attributes?.type || '',
            tag: element.tag.toLowerCase(), url_pattern: urlPattern,
            container_context: detectContainer(element),
            canonical_name: `${baseCanonicalName}${suffix}`,
            selectors: [
                { type: 'css', value: element.selector },
                ...(element.xpath ? [{ type: 'xpath', value: element.xpath }] : [])
            ],
            execution_count: 0,
            metadata: { semantic_intent: inferIntent(element) },
            action_category: inferActionCategory(element, inferIntent(element))
        };
        const { data: created, error } = await supabase.from('ui_actions').insert(newAction).select().single();
        if (!error) return created as UIAction;
        if (error.code === '23505') {
            const { data: existing } = await supabase.from('ui_actions').select('*').eq('fingerprint', variantFingerprint).single();
            if (existing && !usedInThisScan?.has(existing.id)) return existing as UIAction;
        }
        attempt++;
    }
    throw new Error(`Failed to find unique action slot for ${baseCanonicalName}`);
}

// ─── Shared utilities ──────────────────────────────────────────────────────

function _inferRoleSimple(element: UIElement): string {
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
 * Check if an action has been executed in a given state within a suite.
 */
export async function hasActionBeenExecuted(suiteId: string, actionId: string, stateHash: string): Promise<boolean> {
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
export async function recordActionExecution(suiteId: string, actionId: string, stateHash: string, stepId?: string): Promise<void> {
    // Skip provisional actions not yet flushed
    if (actionId.startsWith('pending::')) return;

    await supabase
        .from('action_executions')
        .upsert({ suite_id: suiteId, action_id: actionId, state_hash: stateHash, step_id: stepId }, { onConflict: 'suite_id, action_id, state_hash' });

    // Async increment — fire-and-forget to avoid blocking the main agent loop
    supabase.from('ui_actions')
        .select('execution_count')
        .eq('id', actionId)
        .single()
        .then(({ data }) =>
            supabase.from('ui_actions').update({ execution_count: (data?.execution_count || 0) + 1 }).eq('id', actionId)
        );
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
export async function getUntestedActions(suiteId: string, stateHash: string, allActions: UIAction[]): Promise<UIAction[]> {
    if (allActions.length === 0) return [];
    const actionIds = allActions.map(a => a.id);
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
 * Prioritize actions for execution order.
 * Priority: inputs > buttons > toggles > links
 */
export function prioritizeActions(actions: UIAction[]): UIAction[] {
    const priority: Record<string, number> = {
        'text-input': 1, 'email-input': 1, 'password-input': 1,
        'search-input': 1, 'textarea': 1,
        'input': 2, 'dropdown': 3, 'checkbox': 4, 'radio': 4,
        'submit-button': 5, 'button': 6, 'toggle': 7, 'link': 8
    };
    return [...actions].sort((a, b) => (priority[a.role] || 10) - (priority[b.role] || 10));
}

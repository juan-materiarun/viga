/**
 * VIGA V5: Journey Graph
 * Tracks state→action→state transitions for intelligent exploration
 */

import { supabase } from './supabase';
import { LLMContext, callGroqJSON } from './llm';
import crypto from 'crypto';

export interface JourneyState {
    id: string;
    suite_id: string;
    state_hash: string;
    semantic_description: string;
    screen_type: string;
    key_elements: any;
}

export interface JourneyTransition {
    id: string;
    suite_id: string;
    from_state_id: string;
    to_state_id: string;
    action_id?: string;
    action_intent: string;
    effect_description: string;
    was_explored: boolean;
    exploration_count: number;
}

/**
 * Compute semantic state hash (URL pattern + key element roles)
 */
export function computeSemanticStateHash(url: string, keyElements: string[]): string {
    const urlPattern = url.replace(/\/[0-9a-f-]{36}/g, '/:uuid').replace(/\/\d+/g, '/:id');
    const elementSignature = keyElements.sort().join('|');
    return crypto.createHash('md5').update(`${urlPattern}::${elementSignature}`).digest('hex');
}

/**
 * Register or retrieve a journey state
 */
export async function registerState(
    suiteId: string,
    url: string,
    pageTitle: string,
    keyElements: Array<{ role: string; text: string }>,
    llmCtx: LLMContext
): Promise<JourneyState> {
    const elementRoles = keyElements.map(e => e.role);
    const stateHash = computeSemanticStateHash(url, elementRoles);

    // Check if state exists
    const { data: existing } = await supabase
        .from('journey_states')
        .select('*')
        .eq('suite_id', suiteId)
        .eq('state_hash', stateHash)
        .single();

    if (existing) return existing as JourneyState;

    // LLM classifies the screen with high-level awareness
    const system = `Eres el Cerebro de un Agente QA. Tu tarea es IDENTIFICAR en qué parte del "Mapa Mental" de la aplicación estamos.
    
Identificadores Clave:
- HOME: Página de aterrizaje, suele tener heros, descripciones generales.
- DASHBOARD: Panel de control, métricas, resumen de actividad.
- LOGIN/AUTH: Formularios de acceso, registro, recuperación.
- REPORT: Gráficos, resultados detallados, tablas de resultados.
- SETTINGS: Configuraciones, perfil, preferencias.
- LIST/EXPLORER: Listados de ítems, tablas de datos para navegar.

Responde JSON: 
{ 
  "semantic_description": "Breve descripción funcional (ej: 'Panel de control de ventas')", 
  "screen_type": "HOME | DASHBOARD | LOGIN | REPORT | SETTINGS | LIST | MODAL | ERROR | UNKNOWN",
  "is_critical": boolean (si es una página núcleo del negocio)
}`;

    const user = `CONTEXTO ACTUAL:
URL: ${url}
Título: ${pageTitle}
Elementos Clave Detectados: 
${keyElements.map(e => `- ${e.role}: ${e.text}`).join('\n')}

INSTRUCCIÓN: Basado en los elementos y URL, clasifica esta pantalla de forma precisa para el Mapa Mental.`;

    const analysis = await callGroqJSON(llmCtx, system, user);

    const state: Partial<JourneyState> = {
        suite_id: suiteId,
        state_hash: stateHash,
        semantic_description: analysis?.semantic_description || pageTitle,
        screen_type: (analysis?.screen_type || 'unknown').toUpperCase(),
        key_elements: keyElements
    };

    const { data: created, error } = await supabase
        .from('journey_states')
        .insert(state)
        .select()
        .single();

    if (error) throw new Error(`Failed to create journey state: ${error.message}`);

    console.log(`[JOURNEY] 🗺️ New State: ${created.semantic_description}`);
    return created as JourneyState;
}

/**
 * Record a transition (action execution)
 */
export async function recordTransition(
    suiteId: string,
    fromStateId: string,
    toStateId: string,
    actionId: string | undefined,
    actionIntent: string,
    effectDescription: string,
    wasExplored: boolean = true
): Promise<void> {
    // Check if transition exists to increment count
    const { data: existing } = await supabase
        .from('journey_transitions')
        .select('id, exploration_count, was_explored')
        .match({
            suite_id: suiteId,
            from_state_id: fromStateId,
            action_intent: actionIntent
        })
        .single();

    if (existing) {
        // Only update was_explored if the new value is true
        const newExplored = wasExplored || existing.was_explored;

        await supabase
            .from('journey_transitions')
            .update({
                to_state_id: toStateId, // Update in case path changed
                exploration_count: wasExplored ? (existing.exploration_count || 0) + 1 : (existing.exploration_count || 0),
                effect_description: effectDescription,
                was_explored: newExplored
            })
            .eq('id', existing.id);
    } else {
        const transition: Partial<JourneyTransition> = {
            suite_id: suiteId,
            from_state_id: fromStateId,
            to_state_id: toStateId,
            action_id: actionId,
            action_intent: actionIntent,
            effect_description: effectDescription,
            was_explored: wasExplored,
            exploration_count: wasExplored ? 1 : 0
        };

        await supabase.from('journey_transitions').insert(transition);
    }

    console.log(`[JOURNEY] 🗺️ Registered: ${actionIntent} (explored: ${wasExplored})`);
}

/**
 * Get unexplored branches from current state
 */
export async function getUnexploredBranches(
    suiteId: string,
    currentStateId: string
): Promise<JourneyTransition[]> {
    const { data } = await supabase
        .from('journey_transitions')
        .select('*')
        .eq('suite_id', suiteId)
        .eq('from_state_id', currentStateId)
        .eq('was_explored', false)
        .order('created_at', { ascending: true });

    return (data || []) as JourneyTransition[];
}

/**
 * Get intents already explored in this state
 */
export async function getExploredIntentsForState(
    suiteId: string,
    stateId: string
): Promise<string[]> {
    const { data } = await supabase
        .from('journey_transitions')
        .select('action_intent')
        .eq('suite_id', suiteId)
        .eq('from_state_id', stateId)
        .eq('was_explored', true);

    return (data || []).map(t => t.action_intent);
}

/**
 * Calculate semantic novelty score (0-1)
 * Higher = more unexplored territory
 */
export async function calculateSemanticNovelty(suiteId: string): Promise<number> {
    const { data: transitions } = await supabase
        .from('journey_transitions')
        .select('was_explored')
        .eq('suite_id', suiteId);

    if (!transitions || transitions.length === 0) return 1.0;

    const explored = transitions.filter(t => t.was_explored).length;
    const total = transitions.length;

    return 1 - (explored / total);
}

/**
 * Determine if exploration should terminate
 */
export async function shouldTerminateExploration(
    suiteId: string,
    maxDepth: number,
    currentDepth: number
): Promise<{ should_terminate: boolean; reason: string }> {
    if (currentDepth >= maxDepth) {
        return { should_terminate: true, reason: 'Max depth reached' };
    }

    // CRITICAL: Require minimum exploration before novelty checks
    // This prevents premature termination on simple landing pages
    const MIN_EXPLORATION_DEPTH = 10;

    if (currentDepth < MIN_EXPLORATION_DEPTH) {
        return { should_terminate: false, reason: 'Minimum exploration not yet reached' };
    }

    const novelty = await calculateSemanticNovelty(suiteId);
    if (novelty < 0.05) { // Lowered from 0.1 to 0.05 (5%)
        return { should_terminate: true, reason: 'Semantic novelty exhausted (<5%)' };
    }

    // Check if there are any transitions at all for this suite
    const { count } = await supabase
        .from('journey_transitions')
        .select('*', { count: 'exact', head: true })
        .eq('suite_id', suiteId);

    // If we have transitions and NONE are unexplored, then we stop.
    // If we have 0 transitions, we are at the start, don't stop.
    const { data: unexplored } = await supabase
        .from('journey_transitions')
        .select('id')
        .eq('suite_id', suiteId)
        .eq('was_explored', false)
        .limit(1);

    if (count !== null && count > 0 && (!unexplored || unexplored.length === 0)) {
        return { should_terminate: true, reason: 'No unexplored branches remaining' };
    }

    return { should_terminate: false, reason: '' };
}

/**
 * Get history of actions for a given base URL (Persistent Memory)
 */
export async function getExploreHistory(baseUrl: string): Promise<Set<string>> {
    const { data: suites } = await supabase
        .from('test_suites')
        .select('id')
        .eq('base_url', baseUrl);

    if (!suites || suites.length === 0) return new Set();

    const suiteIds = suites.map(s => s.id);
    const { data: transitions } = await supabase
        .from('journey_transitions')
        .select('action_intent')
        .in('suite_id', suiteIds)
        .eq('was_explored', true);

    const history = new Set<string>();
    transitions?.forEach(t => {
        if (t.action_intent) history.add(t.action_intent);
    });

    console.log(`[JOURNEY] 🧠 Loaded ${history.size} historical actions for ${baseUrl}`);
    return history;
}

/**
 * Get known action fingerprints for a domain (Indestructible Memory)
 */
export async function getKnownActions(domain: string): Promise<Set<string>> {
    const normalizedDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];
    console.log(`[JOURNEY] 🧠 Loading indestructible memory for domain: ${normalizedDomain}`);

    const { data: actions } = await supabase
        .from('ui_actions')
        .select('fingerprint')
        .ilike('url_pattern', `%${normalizedDomain}%`);

    const memory = new Set<string>();
    actions?.forEach(a => {
        if (a.fingerprint) memory.add(a.fingerprint);
    });

    console.log(`[JOURNEY] 🧠 Found ${memory.size} previously learned interactions.`);
    return memory;
}
/**
 * Check if we know this domain (Stats)
 */
export async function getDomainStats(domain: string): Promise<{ known: boolean, suiteCount: number, actionCount: number }> {
    const normalizedDomain = domain.replace(/^(?:https?:\/\/)?(?:www\.)?/i, '').split('/')[0];

    // 1. Check previous suites
    const { count: suiteCount } = await supabase
        .from('test_suites')
        .select('*', { count: 'exact', head: true })
        .ilike('base_url', `%${normalizedDomain}%`); // Loose match for base_url

    // 2. Check cached actions
    const { count: actionCount } = await supabase
        .from('ui_actions')
        .select('*', { count: 'exact', head: true })
        .ilike('url_pattern', `%${normalizedDomain}%`);

    return {
        known: (suiteCount || 0) > 0 || (actionCount || 0) > 0,
        suiteCount: suiteCount || 0,
        actionCount: actionCount || 0
    };
}

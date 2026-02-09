/**
 * API: Journey Graph Data
 * Exposes state→action→state transitions for visualization
 */

import { supabase } from '@/lib/supabase/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const suiteId = searchParams.get('suite_id');

    if (!suiteId) {
        return NextResponse.json({ error: 'suite_id required' }, { status: 400 });
    }

    // Fetch states
    const { data: states } = await supabase
        .from('journey_states')
        .select('*')
        .eq('suite_id', suiteId)
        .order('created_at', { ascending: true });

    // Fetch transitions
    const { data: transitions } = await supabase
        .from('journey_transitions')
        .select('*')
        .eq('suite_id', suiteId)
        .order('created_at', { ascending: true });

    // Build graph structure
    const graph = {
        nodes: (states || []).map(s => ({
            id: s.id,
            label: s.semantic_description,
            type: s.screen_type,
            url: s.state_hash
        })),
        edges: (transitions || []).map(t => ({
            from: t.from_state_id,
            to: t.to_state_id,
            label: t.action_intent,
            explored: t.was_explored,
            effect: t.effect_description
        }))
    };

    return NextResponse.json(graph);
}

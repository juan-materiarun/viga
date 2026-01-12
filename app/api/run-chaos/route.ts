import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runChaosEvolution } from '../../actions/agents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  console.log('\n--- 🛰️ DEPLOYING SWARM: /api/run-chaos ---');

  try {
    const { url, suite_id, mode = 'chaos', goal = '' } = await request.json();

    if (!url || !suite_id) {
      return NextResponse.json(
        { success: false, error: 'Missing url or suite_id' },
        { status: 400 }
      );
    }

    console.log(`🎯 MODO: ${mode.toUpperCase()} | OBJETIVO: ${goal || 'N/A'}`);

    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;

    const apiKeys = [
      process.env.GROQ_API_KEY,
      process.env.GROQ_API_KEY_2,
      process.env.GROQ_API_KEY_3
    ].filter(Boolean);

    // Estado inicial
    await supabase
      .from('test_suites')
      .update({ status: 'running' })
      .eq('id', suite_id);

    await supabase.from('test_runs').upsert(
      {
        suite_id,
        status: 'running',
        report_data: {
          history: [],
          coverage: 0,
          discovered_nodes: []
        },
        updated_at: new Date().toISOString()
      },
      { onConflict: 'suite_id' }
    );

    // 🚀 LANZAMIENTO DEL AGENTE (UNA SOLA FUNCIÓN)
    runChaosEvolution(cleanUrl, suite_id, {
      mode,
      goal,
      apiKeys
    }).catch(async (err) => {
      console.error('🚨 SWARM CRASHED:', err.message);
      await supabase
        .from('test_suites')
        .update({ status: 'error' })
        .eq('id', suite_id);
    });

    return NextResponse.json({
      success: true,
      activeSuiteId: suite_id,
      mode,
      goal,
      agentsActive: apiKeys.length
    });

  } catch (err: any) {
    console.error('🚨 DEPLOYMENT FATAL:', err.message);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

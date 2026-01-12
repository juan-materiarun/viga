import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runChaosEvolution } from '../../actions/agents';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 300; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY 
);

export async function POST(request) {
  console.log("\n--- 🛰️ DEPLOYING SWARM: /api/run-chaos ---");
  
  try {
    // EXTRAEMOS 'mode' Y 'goal' del request
    const { url, suite_id, mode, goal } = await request.json();
    
    console.log(`🎯 Recibido modo: ${mode || 'chaos'} | Objetivo: ${goal || 'Ninguno'}`);

    // 1. Limpieza de URL
    const cleanUrl = url.startsWith('http') ? url : `https://${url}`;

    // 2. Configuración de API Keys
    const apiKeys = [
      process.env.GROQ_API_KEY,      
      process.env.GROQ_API_KEY_2,    
      process.env.GROQ_API_KEY_3     
    ].filter(Boolean);

    if (!suite_id) {
      return NextResponse.json({ success: false, error: "No suite_id" }, { status: 400 });
    }

    // 3. Inicializar el estado en la DB
    const { error: upsertError } = await supabase.from('test_runs').upsert({ 
      suite_id, 
      status: 'preparing', 
      report_data: { 
        history: [],
        coverage: 0, 
        discovered_nodes: [] 
      }, 
      updated_at: new Date().toISOString()
    }, { onConflict: 'suite_id' });

    if (upsertError) throw new Error("Database sync failed");

    // 4. LANZAMIENTO DEL ENJAMBRE
    // IMPORTANTE: Ahora pasamos el objeto config con mode y goal
    runChaosEvolution(cleanUrl, suite_id, {
      mode: mode || 'chaos',
      goal: goal || '',
      apiKeys: apiKeys
    }).catch(err => {
      console.error("🚨 SWARM CRASHED:", err.message);
    });

    return NextResponse.json({ 
      success: true, 
      message: "Swarm Fleet Deployed", 
      activeSuiteId: suite_id,
      agentsActive: apiKeys.length,
      mode: mode,
      goal: goal
    });

  } catch (error) {
    console.error("🚨 DEPLOYMENT FATAL:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
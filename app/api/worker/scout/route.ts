import { NextResponse } from 'next/server';
import { runScoutAgent } from '../../../actions/agents';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // El scout es rápido, pero le damos margen

async function handler(req: Request) {
  try {
    const body = await req.json();
    const { url, suite_id } = body;

    if (!url || !suite_id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    console.log(`[VIGA-SCOUT-WORKER] 🛰️ Iniciando Mapeo Estratégico`);
    console.log(`[VIGA-SCOUT-WORKER] Objetivo: ${url}`);

    // Ejecutamos el mapeo. Al usar await, garantizamos que la DB 
    // se llene antes de que el worker termine.
    await runScoutAgent(url, suite_id);

    console.log(`[VIGA-SCOUT-WORKER] ✅ Mapa completado para Suite: ${suite_id}`);

    return NextResponse.json({ 
      success: true, 
      message: "Scout mapping finished" 
    });

  } catch (err: any) {
    console.error("[VIGA-SCOUT-WORKER-ERROR]:", err);
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500 });
  }
}

// Protección con la firma de Upstash
export const POST = verifySignatureAppRouter(handler);
import { NextResponse } from 'next/server';
import { runChaosAgent } from '../../../actions/agents';
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";

// Configuraciones críticas para procesos largos
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// En Vercel Pro esto puede subir a 900. En Hobby el máximo real es 60s, 
// pero Upstash reintentará si se corta.
export const maxDuration = 300;

async function handler(req: Request) {
  try {
    const body = await req.json();
    const { url, suite_id, credentials } = body;

    if (!url || !suite_id) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    console.log(`[VIGA-WORKER] 🚀 Disparando Misión Chaos en Background...`);

    // 🔥 CAMBIO: Usamos await para que el worker no muera antes de tiempo
    await runChaosAgent(url, suite_id, credentials);
    console.log(`[VIGA-WORKER] ✅ Ejecución de fondo terminada: ${suite_id}`);

    // ✅ RESPONDEMOS DE INMEDIATO: QStash recibe esto y se queda tranquilo
    return NextResponse.json({
      success: true,
      message: "Agent triggered in background"
    });

  } catch (err: any) {
    console.error("[VIGA-WORKER-CRITICAL]:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
/**
 * verifySignature envuelve el handler y valida las cabeceras:
 * - upstash-signature
 * Usa las variables QSTASH_CURRENT_SIGNING_KEY y QSTASH_NEXT_SIGNING_KEY de tu .env
 */
export const POST = verifySignatureAppRouter(handler);
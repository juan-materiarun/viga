import { NextResponse } from 'next/server';
import { runChaosAgent } from '../../actions/agents';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ✅ ES5-safe, fuera de cualquier bloque
const normalizeUrl = (input: string): string => {
  try {
    return new URL(input).toString();
  } catch {
    return new URL(`https://${input}`).toString();
  }
}

export async function POST(req: Request) {
  try {
    // Log de entrada
    console.log('[CHAOS API] Request received');
    
    const { url, suite_id } = await req.json();

    if (!url || !suite_id) {
      console.error('[CHAOS API] Missing url or suite_id');
      return NextResponse.json(
        { error: 'Missing url or suite_id' },
        { status: 400 }
      );
    }

    const targetUrl = normalizeUrl(url);
    console.log('[CHAOS API] Normalized URL:', targetUrl);
    console.log('[CHAOS API] Suite ID:', suite_id);

    // 🔥 FIRE & FORGET
    console.log('[CHAOS API] Starting Chaos Agent...');
    runChaosAgent(targetUrl, suite_id)
      .then(() => {
        console.log('[CHAOS API] Chaos Agent finished successfully.');
      })
      .catch((err) => {
        console.error('[CHAOS API] Error during Chaos Agent execution:', err);
      });

    return NextResponse.json({
      success: true,
      agent: 'chaos',
      suite_id
    });
  } catch (err: any) {
    console.error('[CHAOS API] Internal error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}

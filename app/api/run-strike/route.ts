import { NextResponse } from 'next/server';
import { Client } from "@upstash/qstash";
import { processVigaTransaction } from '../../../lib/billing';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

// ✅ helper ES5-safe
const normalizeUrl = (input: string): string => {
  try {
    return new URL(input).toString()
  } catch {
    return new URL(`https://${input}`).toString()
  }
}

export async function POST(req: Request) {
  try {
    const { url, suite_id, goal, userId } = await req.json()

    if (!url || !suite_id || !goal) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const billing = await processVigaTransaction(userId, 10, 'Strike Run');
    if (!billing.success) {
      return NextResponse.json({ error: billing.error }, { status: 402 });
    }

    const targetUrl = normalizeUrl(url)

    // ✅ MODIFICACIÓN ROBUSTA: Smart URL detection
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    const isVercel = !!process.env.VERCEL_URL;
    const isNgrokConfig = baseUrl?.includes('ngrok') || baseUrl?.includes('localhost');

    if (isVercel && isNgrokConfig) {
      console.warn(`[VIGA-CONFIG] ⚠️ WARNING: NEXT_PUBLIC_APP_URL is set to '${baseUrl}' but running on Vercel. Falling back to https://${process.env.VERCEL_URL}`);
      baseUrl = `https://${process.env.VERCEL_URL}`;
    } else if (!baseUrl) {
      baseUrl = isVercel ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
    }

    // Ensure no trailing slash
    baseUrl = baseUrl.replace(/\/$/, "");

    console.log(`[VIGA-QSTASH] 🚀 Encolando STRIKE job.`);
    console.log(`[VIGA-QSTASH] 📍 Destino Worker: ${baseUrl}/api/worker/strike`);
    console.log(`[VIGA-QSTASH] 🎯 Goal: ${goal}`);

    await qstash.publishJSON({
      url: `${baseUrl}/api/worker/strike`,
      body: { url: targetUrl, suite_id, goal },
      headers: { "ngrok-skip-browser-warning": "true" }
    })

    return NextResponse.json({
      success: true,
      agent: 'strike',
      suite_id,
      goal,
      status: 'enqueued',
      debug_worker_url: `${baseUrl}/api/worker/strike`
    })
  } catch (err: any) {
    console.error('[STRIKE ENQUEUE ERROR]:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    )
  }
}

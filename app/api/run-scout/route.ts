import { NextResponse } from 'next/server';
import { Client } from "@upstash/qstash";
import { processVigaTransaction } from '../../../lib/billing';

const qstash = new Client({ token: process.env.QSTASH_TOKEN! });

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const normalizeUrl = (input: string): string => {
  try {
    const u = new URL(input.startsWith('http') ? input : `https://${input}`);
    return (u.origin + u.pathname).replace(/\/$/, "").toLowerCase();
  } catch {
    return input.toLowerCase().replace(/\/$/, "");
  }
}

export async function POST(req: Request) {
  try {
    const { url, suite_id, userId } = await req.json();

    if (!url || !suite_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const billing = await processVigaTransaction(userId, 3, 'Scout Run');
    if (!billing.success) {
      return NextResponse.json({ error: billing.error }, { status: 402 });
    }

    const targetUrl = normalizeUrl(url);

    // ✅ MODIFICACIÓN ROBUSTA:
    // 1. Si NEXT_PUBLIC_APP_URL existe y NO incluye 'ngrok' (o estamos en local), úsalo.
    // 2. Si estamos en Vercel (VERCEL_URL existe) y APP_URL parece incorrecta (ngrok), usa VERCEL_URL.
    // 3. Fallback a localhost.
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Detect if we are in a Vercel deployment but configured with a local/ngrok URL
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

    console.log(`[VIGA-QSTASH] 🚀 Encolando SCOUT job.`);
    console.log(`[VIGA-QSTASH] 📍 Destino Worker: ${baseUrl}/api/worker/scout`);
    console.log(`[VIGA-QSTASH] 🎯 Objetivo Agent: ${targetUrl}`);

    // 🚀 ENCOLAR: Enviamos el trabajo al Scout Worker
    await qstash.publishJSON({
      url: `${baseUrl}/api/worker/scout`,
      body: {
        url: targetUrl,
        suite_id: suite_id
      },
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    return NextResponse.json({
      success: true,
      agent: 'scout',
      suite_id,
      status: 'enqueued',
      normalized_url: targetUrl,
      debug_worker_url: `${baseUrl}/api/worker/scout`
    });

  } catch (err: any) {
    console.error('[SCOUT ENQUEUE ERROR]:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { Client } from "@upstash/qstash";

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
    const { url, suite_id } = await req.json();

    if (!url || !suite_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const targetUrl = normalizeUrl(url);

    // ✅ MODIFICACIÓN: Priorizamos el túnel de ngrok si existe en el .env
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL 
      ? process.env.NEXT_PUBLIC_APP_URL 
      : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

    console.log(`[VIGA-QSTASH] Encolando SCOUT hacia worker en: ${baseUrl}/api/worker/scout`);

    // 🚀 ENCOLAR: Enviamos el trabajo al Scout Worker
    await qstash.publishJSON({
      url: `${baseUrl}/api/worker/scout`, 
      body: { 
        url: targetUrl, 
        suite_id: suite_id 
      },
      // ✅ HEADER CRÍTICO PARA NGROK GRATUITO:
      headers: {
        "ngrok-skip-browser-warning": "true",
      },
    });

    return NextResponse.json({
      success: true,
      agent: 'scout',
      suite_id,
      status: 'enqueued',
      normalized_url: targetUrl
    });
    
  } catch (err: any) {
    console.error('[SCOUT ENQUEUE ERROR]:', err);
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

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
      status: 'enqueued'
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    )
  }
}

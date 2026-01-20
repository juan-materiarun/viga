import { NextResponse } from 'next/server'
import { Client } from "@upstash/qstash"
import { processVigaTransaction } from '../../../lib/billing'

const qstash = new Client({ token: process.env.QSTASH_TOKEN! })

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const normalizeUrl = (input: string): string => {
  try {
    const u = new URL(input.startsWith('http') ? input : `https://${input}`)
    return (u.origin + u.pathname).replace(/\/$/, "").toLowerCase()
  } catch {
    return input.toLowerCase().replace(/\/$/, "")
  }
}

export async function POST(req: Request) {
  try {
    const { url, suite_id, userId, credentials } = await req.json()

    if (!url || !suite_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // BACKEND VALIDATION
    const urlPattern = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/
    if (!urlPattern.test(url)) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const billing = await processVigaTransaction(userId, 20, 'Chaos Run')
    if (!billing.success) {
      return NextResponse.json({ error: billing.error }, { status: 402 })
    }

    const targetUrl = normalizeUrl(url)

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")

    await qstash.publishJSON({
      url: `${baseUrl}/api/worker/chaos`,
      body: { url: targetUrl, suite_id, credentials },
      retries: 0,
      deduplicationId: `viga-chaos-run-${suite_id}`,
      headers: { "ngrok-skip-browser-warning": "true" }
    })

    return NextResponse.json({
      success: true,
      agent: 'chaos',
      suite_id,
      status: 'enqueued',
      normalized_url: targetUrl
    })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}

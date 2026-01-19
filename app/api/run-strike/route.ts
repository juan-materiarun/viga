import { NextResponse } from 'next/server'
import { Client } from "@upstash/qstash"

const qstash = new Client({ token: process.env.QSTASH_TOKEN! })

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
    const { url, suite_id, goal } = await req.json()

    if (!url || !suite_id || !goal) {
      return NextResponse.json(
        { error: 'Missing url, suite_id or goal' },
        { status: 400 }
      )
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


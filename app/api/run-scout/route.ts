import { NextResponse } from 'next/server'
import { runScoutAgent } from '../../actions/agents'

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
    const { url, suite_id } = await req.json()

    if (!url || !suite_id) {
      return NextResponse.json(
        { error: 'Missing url or suite_id' },
        { status: 400 }
      )
    }

    const targetUrl = normalizeUrl(url)

    // 🔍 FIRE & FORGET
    runScoutAgent(targetUrl, suite_id).catch(console.error)

    return NextResponse.json({
      success: true,
      agent: 'scout',
      suite_id
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    )
  }
}

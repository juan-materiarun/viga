import { NextResponse } from 'next/server'
import { runStrikeAgent } from '../../actions/agents'

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

    // 🎯 FIRE & FORGET
    runStrikeAgent(targetUrl, suite_id, goal).catch(console.error)

    return NextResponse.json({
      success: true,
      agent: 'strike',
      suite_id,
      goal
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    )
  }
}

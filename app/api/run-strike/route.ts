import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { processVigaTransaction } from '../../../lib/billing';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const normalizeUrl = (input: string): string => {
  try {
    return new URL(input).toString();
  } catch {
    return new URL(`https://${input}`).toString();
  }
};

export async function POST(req: Request) {
  try {
    const { url, suite_id, goal, userId } = await req.json();

    if (!url || !suite_id || !goal) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Process billing BEFORE creating job
    const billing = await processVigaTransaction(userId, 10, 'Strike Run');
    if (!billing.success) {
      return NextResponse.json({
        error: billing.error,
        insufficient_funds: true
      }, { status: 402 });
    }

    const targetUrl = normalizeUrl(url);

    // Create job in database
    const jobId = crypto.randomUUID();
    const { error: jobError } = await supabase.from('jobs').insert({
      id: jobId,
      suite_id: suite_id,
      user_id: userId,
      job_type: 'strike',
      status: 'pending',
      url: targetUrl,
      goal: goal,
      created_at: new Date().toISOString()
    });

    if (jobError) {
      console.error('[STRIKE] Error creating job:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    console.log(`[STRIKE] ✅ Job created: ${jobId} for suite ${suite_id}`);

    return NextResponse.json({
      success: true,
      agent: 'strike',
      suite_id,
      job_id: jobId,
      goal,
      status: 'pending'
    });
  } catch (err: any) {
    console.error('[STRIKE] Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 }
    );
  }
}

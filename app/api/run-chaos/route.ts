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
    const u = new URL(input.startsWith('http') ? input : `https://${input}`);
    return (u.origin + u.pathname).replace(/\/$/, "").toLowerCase();
  } catch {
    return input.toLowerCase().replace(/\/$/, "");
  }
};

export async function POST(req: Request) {
  try {
    const { url, suite_id, userId, credentials } = await req.json();

    if (!url || !suite_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Backend validation
    const urlPattern = /^(https?:\/\/)?([\ da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    if (!urlPattern.test(url)) {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Process billing BEFORE creating job
    const billing = await processVigaTransaction(userId, 20, 'Chaos Run');
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
      job_type: 'chaos',
      status: 'pending',
      url: targetUrl,
      credentials: credentials || null,
      created_at: new Date().toISOString()
    });

    if (jobError) {
      console.error('[CHAOS] Error creating job:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    console.log(`[CHAOS] ✅ Job created: ${jobId} for suite ${suite_id}`);

    return NextResponse.json({
      success: true,
      agent: 'chaos',
      suite_id,
      job_id: jobId,
      status: 'pending',
      normalized_url: targetUrl
    });
  } catch (err: any) {
    console.error('[CHAOS] Error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { processVigaTransaction } from '@/lib/supabase/billing';
import crypto from 'crypto';

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
    const { url, suite_id, userId, credentials, source_suite_id } = await req.json();

    if (!url || !suite_id) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Process billing BEFORE creating job (ATLAS cost: 10 VIGAS)
    const billing = await processVigaTransaction(userId, 10, 'Atlas Run');
    if (!billing.success) {
      return NextResponse.json({
        error: billing.error,
        insufficient_funds: true
      }, { status: 402 });
    }

    const targetUrl = normalizeUrl(url);

    // Create job in database
    const jobId = crypto.randomUUID();
    const { error: jobError } = await supabaseAdmin.from('jobs').insert({
      id: jobId,
      suite_id: suite_id,
      user_id: userId,
      job_type: 'atlas',
      status: 'pending',
      url: targetUrl,
      credentials: credentials || null,
      created_at: new Date().toISOString()
    });

    if (jobError) {
      console.error('[ATLAS] Error creating job:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    console.log(`[ATLAS] ✅ Job created: ${jobId} for suite ${suite_id}`);

    return NextResponse.json({
      success: true,
      agent: 'atlas',
      suite_id,
      job_id: jobId,
      status: 'pending',
      normalized_url: targetUrl
    });
  } catch (err: any) {
    console.error('[ATLAS] Error:', err);
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
  }
}

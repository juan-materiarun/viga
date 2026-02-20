
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
        const { url, suite_id, userId, credentials, goal } = await req.json();

        if (!url || !suite_id || !goal) {
            return NextResponse.json({ error: 'Missing parameters (URL, Suite ID, or Goal)' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Process billing
        const billing = await processVigaTransaction(userId, 10, 'Strike Run'); // Strike is cheaper than Chaos? or same? Let's say 10 vigas.
        if (!billing.success) {
            return NextResponse.json({
                error: billing.error,
                insufficient_funds: true
            }, { status: 402 });
        }

        const targetUrl = normalizeUrl(url);

        // Update Suite Mode & Status
        await supabaseAdmin.from('test_suites').update({
            mode: 'strike',
            status: 'running',
            url: targetUrl
        }).eq('id', suite_id);

        // Create job in database
        const jobId = crypto.randomUUID();
        const { error: jobError } = await supabaseAdmin.from('jobs').insert({
            id: jobId,
            suite_id: suite_id,
            user_id: userId,
            job_type: 'strike',
            status: 'pending',
            url: targetUrl,
            goal: goal, // Correct column name in DB
            credentials: credentials || null,
            created_at: new Date().toISOString()
        });

        if (jobError) {
            console.error('[STRIKE] Error creating job:', jobError);
            return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
        }

        console.log(`[STRIKE] ✅ Job created: ${jobId} for Goal: "${goal}"`);

        return NextResponse.json({
            success: true,
            agent: 'strike',
            suite_id,
            job_id: jobId,
            status: 'pending',
            goal: goal
        });
    } catch (err: any) {
        console.error('[STRIKE] Error:', err);
        return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 });
    }
}

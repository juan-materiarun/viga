import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { processVigaTransaction } from '@/lib/supabase/billing';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    try {
        const { url, steps, suite_id, credentials, userId } = await req.json();

        if (!url || !steps || steps.length === 0) {
            return NextResponse.json({ success: false, error: 'URL and Steps required' }, { status: 400 });
        }

        // Backend validation
        const urlPattern = /^(https?:\/\/)?([\ da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        if (!urlPattern.test(url)) {
            return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
        }

        if (!userId) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }

        // Process billing BEFORE creating job (cheaper than agents)
        const billing = await processVigaTransaction(userId, 5, 'Regression Run');
        if (!billing.success) {
            return NextResponse.json({
                error: billing.error,
                insufficient_funds: true
            }, { status: 402 });
        }

        console.log(`[REPLAY] Triggering Regression for: ${url} (${steps.length} steps)`);

        // Create job in database
        const jobId = crypto.randomUUID();
        const { error: jobError } = await supabaseAdmin.from('jobs').insert({
            id: jobId,
            suite_id: suite_id,
            user_id: userId,
            job_type: 'replay',
            status: 'pending',
            url: url,
            steps: steps,
            credentials: credentials || null,
            created_at: new Date().toISOString()
        });

        if (jobError) {
            console.error('[REPLAY] Error creating job:', jobError);
            return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
        }

        console.log(`[REPLAY] ✅ Job created: ${jobId} for suite ${suite_id}`);

        return NextResponse.json({
            success: true,
            message: 'Regression Queued',
            job_id: jobId,
            suite_id: suite_id
        });
    } catch (error: any) {
        console.error('[REPLAY] Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

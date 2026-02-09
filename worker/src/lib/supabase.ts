import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Job {
    id: string;
    suite_id: string;
    user_id: string;
    job_type: 'chaos' | 'chaos_v5' | 'strike' | 'replay' | 'scout' | 'atlas';
    status: 'pending' | 'running' | 'completed' | 'failed';
    url: string;
    goal?: string;
    credentials?: any;
    steps?: any[];
    progress?: any;
    result?: any;
    error?: string;
    created_at: string;
    started_at?: string;
    completed_at?: string;
    updated_at: string;
}

export async function pollPendingJobs(): Promise<Job[]> {
    const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(1);

    if (error) {
        // Handle transient network/timeout errors gracefully without spamming error logs
        const isNetworkError =
            error.message?.includes('fetch failed') ||
            error.message?.includes('timeout') ||
            error.details?.includes('HeadersTimeoutError');

        if (isNetworkError) {
            console.warn('[SUPABASE] ⚠️ Network jitter detected (timeout). Retrying...');
        } else {
            console.error('[SUPABASE] Error polling jobs:', error);
        }
        return [];
    }

    return data || [];
}

export async function claimJob(jobId: string): Promise<Job | null> {
    const { data, error } = await supabase
        .from('jobs')
        .update({
            status: 'running',
            started_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId)
        .eq('status', 'pending') // Optimistic Lock: Only update if still pending
        .select()
        .single();

    if (error) {
        // If error is "PGRST116" (JSON object requested ... result) it means 0 rows updated
        // which implies race condition lost.
        if (error.code !== 'PGRST116') {
            console.error('[SUPABASE] Error claiming job:', error);
        }
        return null;
    }

    return data;
}

export async function updateJobStatus(
    jobId: string,
    status: Job['status'],
    updates: Partial<Job> = {}
) {
    const payload: any = {
        status,
        updated_at: new Date().toISOString(),
        ...updates
    };

    if (status === 'running' && !updates.started_at) {
        payload.started_at = new Date().toISOString();
    }

    if ((status === 'completed' || status === 'failed') && !updates.completed_at) {
        payload.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
        .from('jobs')
        .update(payload)
        .eq('id', jobId);

    if (error) {
        console.error('[SUPABASE] Error updating job:', error);
    }
}

export async function updateJobProgress(
    jobId: string,
    status: Job['status'] | null = null,
    result: any = null,
    progress: any = null
) {
    const payload: any = { updated_at: new Date().toISOString() };
    if (status) payload.status = status;
    if (result) payload.result = result;
    if (progress) payload.progress = progress;
    if (status === 'completed' || status === 'failed') payload.completed_at = new Date().toISOString();

    const { error } = await supabase
        .from('jobs')
        .update(payload)
        .eq('id', jobId);

    if (error) {
        console.error('[SUPABASE] Error updating progress:', error);
    }
}

export async function createLog(suiteId: string, message: string, level: 'info' | 'success' | 'error' | 'warning' = 'info') {
    const { error } = await supabase.from('test_logs').insert({
        suite_id: suiteId,
        message,
        level,
        timestamp: new Date().toISOString()
    });

    if (error) {
        console.error('[SUPABASE] Error creating log:', error);
    }
}

export async function cleanupStaleJobs() {
    console.log('[SUPABASE] 🧹 Checking for stale jobs...');

    // Aggressive cleanup: on startup, ANY job marked 'running' is orphaned
    // because this is a single-worker instance (or dev environment) restart.
    const { data: staleJobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'running');

    if (error) {
        console.error('[SUPABASE] Error fetching stale jobs:', error);
        return;
    }

    if (staleJobs && staleJobs.length > 0) {
        console.log(`[SUPABASE] ⚠️ Found ${staleJobs.length} stale jobs. Cleaning up...`);

        for (const job of staleJobs) {
            await updateJobStatus(job.id, 'failed', {
                error: 'Job timed out or worker crashed (Stale Job Cleanup)',
                result: { success: false, error: 'Worker crash protected' }
            });

            // Also fail the suite
            await supabase
                .from('test_suites')
                .update({ status: 'failed' })
                .eq('id', job.suite_id);

            await createLog(job.suite_id, '🛑 Trabajo terminado por limpieza automática (Stale Job Cleanup). Probablemente el worker se detuvo inesperadamente.', 'error');
        }
        console.log('[SUPABASE] ✅ Stale jobs cleaned up.');
    } else {
        console.log('[SUPABASE] ✨ No stale jobs found.');
    }
}

/**
 * Enforce job timeouts - Mark jobs running longer than 30 minutes as failed
 * This prevents phantom "running" jobs from polluting the UI
 */
export async function enforceJobTimeouts() {
    const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
    const cutoff = new Date(Date.now() - TIMEOUT_MS).toISOString();

    const { data: timedOutJobs, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'running')
        .lt('started_at', cutoff);

    if (error) {
        console.error('[SUPABASE] Error checking job timeouts:', error);
        return;
    }

    if (timedOutJobs && timedOutJobs.length > 0) {
        console.log(`[SUPABASE] ⏰ Found ${timedOutJobs.length} timed-out job(s). Marking as failed...`);

        for (const job of timedOutJobs) {
            await updateJobStatus(job.id, 'failed', {
                error: 'Job timeout (30min limit exceeded)',
                result: { success: false, error: 'Execution timeout' }
            });

            // Also fail the suite
            await supabase
                .from('test_suites')
                .update({ status: 'failed' })
                .eq('id', job.suite_id);

            await createLog(job.suite_id, '⏰ Trabajo terminado por timeout (30 minutos). El trabajo excedió el límite de tiempo de ejecución.', 'error');
        }

        console.log('[SUPABASE] ✅ Timed-out jobs cleaned up.');
    }
}

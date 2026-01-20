import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface Job {
    id: string;
    suite_id: string;
    user_id: string;
    job_type: 'chaos' | 'strike' | 'replay';
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
        console.error('[SUPABASE] Error polling jobs:', error);
        return [];
    }

    return data || [];
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

export async function updateJobProgress(jobId: string, progress: any) {
    const { error } = await supabase
        .from('jobs')
        .update({
            progress,
            updated_at: new Date().toISOString()
        })
        .eq('id', jobId);

    if (error) {
        console.error('[SUPABASE] Error updating progress:', error);
    }
}

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearQueue() {
    console.log('🔥 NUKING JOB QUEUE...');

    // 1. Cancel Running
    const { data: running } = await supabase
        .from('jobs')
        .update({ status: 'failed', error: 'Manually cleared by user' })
        .eq('status', 'running')
        .select();

    console.log(`❌ Killed ${running?.length || 0} running jobs.`);

    // 2. Cancel Pending
    const { data: pending } = await supabase
        .from('jobs')
        .update({ status: 'failed', error: 'Manually cleared by user' })
        .eq('status', 'pending')
        .select();

    console.log(`🗑️ Cancelled ${pending?.length || 0} pending jobs.`);

    console.log('✅ Queue cleared. Restarting worker will pick up NEW jobs only.');
}

clearQueue();

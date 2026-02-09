import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkQueue() {
    console.log('🔍 INSPECTING JOB QUEUE...');

    // 1. Get Running Job
    const { data: running } = await supabase
        .from('jobs')
        .select('id, suite_id, created_at')
        .eq('status', 'running');

    console.log('\n🏃 RUNNING JOBS:');
    if (running && running.length > 0) {
        running.forEach(j => console.log(`   - Job: ${j.id} | Suite: ${j.suite_id} | Started: ${j.created_at}`));
    } else {
        console.log('   (None)');
    }

    // 2. Get Pending Jobs
    const { data: pending } = await supabase
        .from('jobs')
        .select('id, suite_id, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    console.log('\n⏳ PENDING JOBS (Queue):');
    if (pending && pending.length > 0) {
        pending.forEach((j, i) => console.log(`   ${i + 1}. Job: ${j.id} | Suite: ${j.suite_id} | Created: ${j.created_at}`));
    } else {
        console.log('   (None)');
    }
}

checkQueue();

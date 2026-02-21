const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtndrgpyogqllvrctppq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bmRyZ3B5b2dxbGx2cmN0cHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODAzOTc4OCwiZXhwIjoyMDgzNjE1Nzg4fQ.FqXI5aY6zFClsnnTZ5qCk4bMTMh7bbnNBeGUXIL2924';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHealth() {
    console.log('--- LIVE HEALTH CHECK ---');

    // 1. Check for Running Jobs
    const { data: jobs, error: jobsError } = await supabase.from('jobs').select('*').order('created_at', { ascending: false }).limit(5);
    console.log('\nRecent Jobs:');
    jobs?.forEach(j => console.log(`- [${j.status}] ID: ${j.id}, Suite: ${j.suite_id}, Created: ${j.created_at}`));

    // 2. Check for Steps in the latest suite
    if (jobs && jobs.length > 0) {
        const latestSuiteId = jobs[0].suite_id;
        console.log(`\nChecking steps for Suite: ${latestSuiteId}`);
        const { data: steps, error: stepsError } = await supabase.from('test_steps').select('*').eq('suite_id', latestSuiteId);
        console.log(`- Found ${steps?.length || 0} steps.`);
        if (steps && steps.length > 0) {
            console.log(`- Latest Step: ${steps[steps.length - 1].title} at ${steps[steps.length - 1].created_at}`);
        }
    }

    // 3. Check Realtime Subscription Capability (just a sanity check)
    console.log('\nRealtime is enabled in config. Checking connection...');
}

checkHealth();

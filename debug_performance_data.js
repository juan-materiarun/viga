const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkData() {
    console.log('--- Checking test_suites ---');
    const { data: suites, error: suitesError } = await supabase
        .from('test_suites')
        .select('id, base_url, status, created_at')
        .in('status', ['completed', 'failed'])
        .limit(10);

    if (suitesError) {
        console.error('Error fetching suites:', suitesError);
    } else {
        console.log(`Found ${suites?.length || 0} suites.`);
        suites?.forEach(s => console.log(`ID: ${s.id}, Status: ${s.status}, URL: ${s.base_url}`));
    }

    if (suites && suites.length > 0) {
        console.log('\n--- Checking test_steps for first suite ---');
        const { data: steps, error: stepsError } = await supabase
            .from('test_steps')
            .select('id, created_at')
            .eq('suite_id', suites[0].id)
            .order('created_at', { ascending: true });

        if (stepsError) {
            console.error('Error fetching steps:', stepsError);
        } else {
            console.log(`Found ${steps?.length || 0} steps for suite ${suites[0].id}.`);
        }
    }
}

checkData();

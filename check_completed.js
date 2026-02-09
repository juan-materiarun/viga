
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkCompleted() {
    console.log('Checking COMPLETED test_suites...');

    const { data, error } = await supabase
        .from('test_suites')
        .select('id, base_url, user_id, created_at, test_steps(count)')
        .eq('status', 'completed');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const withUrl = data.filter(r => r.base_url).length;
    const validLatency = data.filter(r => r.test_steps[0].count > 1).length;
    console.log('RESULTS_START');
    console.log(`TOTAL_COMPLETED:${data.length}`);
    console.log(`WITH_URL:${withUrl}`);
    console.log(`VALID_STEPS:${validLatency}`);
    console.log(`SKIPPED_STEPS:${data.length - validLatency}`);

    // Log dates and user_ids
    const dates = data.map(r => r.created_at);
    const users = [...new Set(data.map(r => r.user_id))];

    console.log(`OLDEST:${dates[dates.length - 1]}`);
    console.log(`NEWEST:${dates[0]}`);
    console.log(`USER_IDS:${JSON.stringify(users)}`);
    console.log('RESULTS_END');
}

checkCompleted();

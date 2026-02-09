require('dotenv').config({ path: '../worker/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function cleanup() {
    console.log('🧹 Cleaning up stale jobs...');
    const { data, error } = await supabase
        .from('test_suites')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('status', 'running')
        .select();

    if (error) console.error('Error:', error);
    else console.log(`✅ Fixed ${data.length} stale jobs.`);
}

cleanup();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qtndrgpyogqllvrctppq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bmRyZ3B5b2dxbGx2cmN0cHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODAzOTc4OCwiZXhwIjoyMDgzNjE1Nzg4fQ.FqXI5aY6zFClsnnTZ5qCk4bMTMh7bbnNBeGUXIL2924';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAll() {
    console.log('--- DB DIAGNOSIS ---');
    const tables = ['test_steps', 'test_logs', 'journey_states', 'ui_actions', 'action_executions', 'test_suites'];

    for (const t of tables) {
        // Try to select 1 row just to check existence
        const { error } = await supabase.from(t).select('id').limit(1);
        if (error) {
            console.log(`❌ ${t}: DOES NOT EXIST (or error: ${error.message})`);
        } else {
            console.log(`✅ ${t}: OK`);
        }
    }
}

checkAll();

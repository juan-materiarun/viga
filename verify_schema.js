const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://qtndrgpyogqllvrctppq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bmRyZ3B5b2dxbGx2cmN0cHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODAzOTc4OCwiZXhwIjoyMDgzNjE1Nzg4fQ.FqXI5aY6zFClsnnTZ5qCk4bMTMh7bbnNBeGUXIL2924';

const supabase = createClient(supabaseUrl, supabaseKey);

async function deepInspect() {
    const tables = ['jobs', 'test_steps', 'test_suites', 'test_logs', 'ui_actions', 'action_executions'];
    const results = {};

    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            results[table] = { error: error.message };
        } else {
            results[table] = { columns: data.length > 0 ? Object.keys(data[0]) : 'EMPTY (Cannot infer columns safely without RPC)' };
        }
    }

    fs.writeFileSync('schema_dump.json', JSON.stringify(results, null, 2));
    console.log('Schema dumped to schema_dump.json');
}

deepInspect();

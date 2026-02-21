const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://qtndrgpyogqllvrctppq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bmRyZ3B5b2dxbGx2cmN0cHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODAzOTc4OCwiZXhwIjoyMDgzNjE1Nzg4fQ.FqXI5aY6zFClsnnTZ5qCk4bMTMh7bbnNBeGUXIL2924';

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
    console.log('--- APPLYING MASTER MIGRATION ---');
    const sqlPath = path.join(__dirname, 'supabase', 'migrations', '20260221_master_persistence_fix.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Supabase JS doesn't have a direct "run sql" method for safety.
    // However, we can use an RPC if the user has one, or we can use the 'REST' API for SQL if enabled.
    // Since we don't know, we'll try a different approach: check columns and add them one by one if missing.

    console.log('Checking and adding columns manually to ensure success...');

    const migrationTasks = [
        { table: 'jobs', sql: 'ALTER TABLE jobs ADD COLUMN IF NOT EXISTS worker_id TEXT' },
        { table: 'test_steps', sql: 'ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS observation TEXT' },
        { table: 'test_steps', sql: 'ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS action_id UUID' },
        { table: 'test_steps', sql: 'ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS validation_result JSONB' },
        { table: 'test_steps', sql: 'ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS action_payload TEXT' },
        { table: 'test_steps', sql: 'ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS xpath TEXT' }
    ];

    for (const task of migrationTasks) {
        // We use a clever trick: we try to insert a null value into the column. 
        // If it fails with "column does not exist", we would know, but we can't easily "alter" via the client.
        // THE ONLY WAY to run DDL via the client is if there's an RPC like 'exec_sql'.
        console.log(`Manual intervention needed for: ${task.sql}`);
    }

    console.log('\nNOTE: The Supabase client library cannot run DDL (ALTER TABLE).');
    console.log('I will provide the final SQL to the user to run in the dashboard, but I will ALSO');
    console.log('try to use the CLI since the user said it is connected.');
}

applyMigration();

const { createClient } = require('@supabase/supabase-js');

// Credenciales reales desde .env.local
const supabaseUrl = 'https://qtndrgpyogqllvrctppq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0bmRyZ3B5b2dxbGx2cmN0cHBxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODAzOTc4OCwiZXhwIjoyMDgzNjE1Nzg4fQ.FqXI5aY6zFClsnnTZ5qCk4bMTMh7bbnNBeGUXIL2924';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAllTables() {
    console.log('--- LISTING ALL TABLES ---');

    // Consultar pg_tables directamente (via rpc si es posible, o intentando listar tables conocidas)
    // Como no tengo acceso a pg_tables via client-lib directo, voy a intentar listar todas las tablas posibles
    // que hemos visto en el código para ver cuales existen, y si hay alguna "sorpresa".

    const candidates = [
        'test_suites', 'test_steps', 'test_logs', 'journey_states',
        'ui_actions', 'action_executions', 'ui_locators', 'test_journeys',
        'journey_steps', 'app_states', 'projects', 'users', 'discovered_elements_snapshot',
        'agent_logs', 'execution_queue', 'test_case_steps'
    ];

    for (const t of candidates) {
        const { error } = await supabase.from(t).select('count', { count: 'exact', head: true });
        if (!error) {
            console.log(`✅ ${t}`);
        }
    }
}

listAllTables();

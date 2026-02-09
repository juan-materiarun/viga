import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function resetState() {
    console.log('🧹 Starting Emergency Reset...');

    // 1. Reset stuck suites
    const { error: errorSuites } = await supabase
        .from('test_suites')
        .update({ status: 'failed', updated_at: new Date().toISOString() })
        .eq('status', 'running');

    if (errorSuites) console.error('Error resetting suites:', errorSuites);
    else console.log('✅ Stuck suites marked as failed.');

    // 2. Clear job locks (if you have a locks table, or just by virtue of the job logic relying on status)
    // Assuming optimistic locking uses 'running' status, so resetting to failed/pending frees them.

    // 3. Log the reset
    await supabase.from('test_logs').insert({
        suite_id: '00000000-0000-0000-0000-000000000000', // System log
        message: '🛑 SYSTEM RESET TRIGGERED BY USER',
        level: 'warn',
        timestamp: new Date().toISOString()
    });

    console.log('✨ System state cleared. You can now restart the worker.');
}

resetState();

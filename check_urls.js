
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUrls() {
    console.log('Checking URLs...');

    const { data, error } = await supabase
        .from('test_suites')
        .select('id, base_url, status')
        .limit(1000);

    if (error) {
        console.error('Error:', error);
        return;
    }

    let bad = 0;
    data.forEach(r => {
        if (!r.base_url) return;
        try {
            new URL(r.base_url);
        } catch (e) {
            console.log(`BAD URL (${r.status}): "${r.base_url}" (ID: ${r.id})`);
            bad++;
        }
    });

    console.log(`Total checked: ${data.length}`);
    console.log(`Bad URLs: ${bad}`);
    console.log('RESULTS_END');
}

checkUrls();

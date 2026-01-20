import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function hasSeenDom(
    suiteId: string,
    url: string,
    domHash: string
): Promise<boolean> {
    const { data } = await supabase
        .from('test_runs')
        .select('id')
        .eq('suite_id', suiteId)
        .eq('target_url', url)
        .eq('report_data->>domHash', domHash)
        .limit(1);

    return !!data?.length;
}

export async function rememberDom(
    suiteId: string,
    url: string,
    domHash: string,
    summary: string
) {
    await supabase.from('dom_memory').insert({
        suite_id: suiteId,
        url,
        dom_hash: domHash,
        summary
    });
}

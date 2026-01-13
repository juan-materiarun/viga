import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function hasSeenDom(
  url: string,
  domHash: string
): Promise<boolean> {
  const { data } = await supabase
    .from('test_runs')
    .select('id')
    .eq('report_data->>domHash', domHash)
    .limit(1)

  return !!data && data.length > 0
}

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

/**
 * Browser-safe Supabase client
 * Uses ANON key - safe to expose to the browser
 * Has Row Level Security (RLS) enforced
 */
export const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)



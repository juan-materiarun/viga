import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

/**
 * Server-only Supabase client (Admin)
 * Uses SERVICE_ROLE key - NEVER expose to browser
 * Bypasses Row Level Security (RLS)
 * 
 * ⚠️ ONLY use in:
 * - API routes (app/api/*)
 * - Server components
 * - Server actions
 */
export const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

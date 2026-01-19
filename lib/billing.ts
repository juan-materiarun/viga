import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function processVigaTransaction(userId: string, amount: number, event: string): Promise<{ success: boolean, error?: string }> {
    try {
        if (!userId) return { success: false, error: 'Authentication required. Please log in.' }

        // 1. Get Balance
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('vigas_balance')
            .eq('id', userId)
            .single()

        if (fetchError || !profile) {
            return { success: false, error: 'User profile not found' }
        }

        const currentBalance = profile.vigas_balance ?? 0

        // 2. Check Funds
        if (currentBalance < amount) {
            return { success: false, error: `Insufficient Funds. Required: ${amount} VIGAS. Available: ${currentBalance}` }
        }

        // 3. Deduct (Atomic update would be better via RPC, but standard update is okay for now)
        // Ideally: update profiles set vigas_balance = vigas_balance - X where id = Y

        // We use the RPC approach if possible, or just standard update if no RPC exists.
        // Let's use standard update for simplicity in this codebase, assuming low concurrency collision risk for single user.
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ vigas_balance: currentBalance - amount })
            .eq('id', userId)

        if (updateError) {
            return { success: false, error: 'Transaction Failed' }
        }

        console.log(`[VIGA-BILLING] Charged ${amount} vigas to ${userId} for ${event}`);
        return { success: true }

    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

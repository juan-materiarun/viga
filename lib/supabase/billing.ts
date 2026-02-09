import { supabaseAdmin } from './admin'

/**
 * Process VIGA transaction (billing)
 * Deducts VIGAs from user balance
 */
export async function processVigaTransaction(
    userId: string,
    amount: number,
    event: string
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!userId) {
            return { success: false, error: 'Authentication required. Please log in.' }
        }

        // 1. Get Balance
        const { data: profile, error: fetchError } = await supabaseAdmin
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
            return {
                success: false,
                error: `Insufficient Funds. Required: ${amount} VIGAS. Available: ${currentBalance}`
            }
        }

        // 3. Deduct (Atomic update)
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ vigas_balance: currentBalance - amount })
            .eq('id', userId)

        if (updateError) {
            return { success: false, error: 'Transaction Failed' }
        }

        console.log(`[VIGA-BILLING] Charged ${amount} vigas to ${userId} for ${event}`)
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

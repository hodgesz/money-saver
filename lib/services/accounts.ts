import { createClient } from '@/lib/supabase/client'
import type { Account, CreateAccountInput, AccountType } from '@/types'

const VALID_ACCOUNT_TYPES: AccountType[] = ['checking', 'savings', 'credit_card', 'investment', 'other']

export const accountsService = {
  /**
   * Fetch all accounts for the authenticated user
   */
  async getAccounts() {
    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        data: null,
        error: { message: 'User not authenticated' }
      }
    }

    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true })

    return { data, error }
  },

  /**
   * Fetch a single account by ID
   */
  async getAccount(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single()

    return { data, error }
  },

  /**
   * Create a new account
   */
  async createAccount(accountData: CreateAccountInput) {
    // Validate account type
    if (!VALID_ACCOUNT_TYPES.includes(accountData.type)) {
      return {
        data: null,
        error: { message: `Invalid account type: ${accountData.type}. Must be one of: ${VALID_ACCOUNT_TYPES.join(', ')}` }
      }
    }

    const supabase = createClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        data: null,
        error: { message: 'User not authenticated' }
      }
    }

    const accountWithUser = {
      ...accountData,
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('accounts')
      .insert([accountWithUser])
      .select()

    return { data: data?.[0] || null, error }
  },

  /**
   * Update an existing account
   */
  async updateAccount(id: string, updates: Partial<Account>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()

    return { data: data?.[0] || null, error }
  },

  /**
   * Delete an account
   */
  async deleteAccount(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)

    return { data, error }
  },

  /**
   * Calculate account balance from transactions
   */
  async getAccountBalance(accountId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('amount, is_income')
      .eq('account_id', accountId)

    if (error) {
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return { data: 0, error: null }
    }

    const balance = data.reduce((sum, tx) => {
      return tx.is_income ? sum + tx.amount : sum - tx.amount
    }, 0)

    return { data: balance, error: null }
  },
}

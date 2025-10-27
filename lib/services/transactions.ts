import { createClient } from '@/lib/supabase/client'
import type { Transaction, TransactionFormData } from '@/types'
import { alertDetectionService } from './alertDetection'

interface TransactionFilters {
  startDate?: string
  endDate?: string
  categoryId?: string
  search?: string
  page?: number
  limit?: number
}

interface TransactionStats {
  totalIncome: number
  totalExpenses: number
  netBalance: number
  transactionCount: number
}

export const transactionService = {
  /**
   * Fetch all transactions with default ordering (newest first)
   */
  async getTransactions() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })

    return { data, error }
  },

  /**
   * Fetch transactions with filters (date range, category, search, pagination)
   */
  async getTransactionsWithFilters(filters: TransactionFilters = {}) {
    const supabase = createClient()
    let query = supabase.from('transactions').select('*')

    // Apply date range filter
    if (filters.startDate) {
      query = query.gte('date', filters.startDate)
    }
    if (filters.endDate) {
      query = query.lte('date', filters.endDate)
    }

    // Apply category filter
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId)
    }

    // Apply search filter (searches in description)
    // TODO: Add merchant search - requires client-side filtering or raw SQL
    if (filters.search) {
      query = query.ilike('description', `%${filters.search}%`)
    }

    // Apply pagination
    const page = filters.page || 1
    const limit = filters.limit || 50
    const start = (page - 1) * limit
    const end = start + limit - 1
    query = query.range(start, end)

    // Order by date descending
    const { data, error } = await query.order('date', { ascending: false })

    return { data, error }
  },

  /**
   * Fetch a single transaction by ID
   */
  async getTransactionById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()

    return { data, error }
  },

  /**
   * Create a new transaction
   *
   * Automatically triggers alert detection for:
   * - Large purchases (configurable threshold)
   * - Anomalies (statistical outliers)
   * - Budget warnings (if transaction has a category)
   */
  async createTransaction(transactionData: TransactionFormData) {
    const supabase = createClient()

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        data: null,
        error: { message: 'User not authenticated', details: authError?.message }
      }
    }

    // Add user_id to the transaction data
    const transactionWithUser = {
      ...transactionData,
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionWithUser])
      .select()

    const createdTransaction = data?.[0] || null

    // Trigger alert detection after successful transaction creation
    if (createdTransaction) {
      try {
        // Run alert detection in background (non-blocking)
        // Failures in alert detection should not prevent transaction creation
        await Promise.allSettled([
          alertDetectionService.checkLargePurchaseAlert(createdTransaction),
          alertDetectionService.checkAnomalyAlert(createdTransaction),
        ])

        // Check budget warnings only if transaction has a category
        if (createdTransaction.category_id) {
          await alertDetectionService.checkBudgetWarningAlert(createdTransaction.category_id)
        }
      } catch (alertError) {
        // Log error but don't fail transaction creation
        console.error('Alert detection failed:', alertError)
      }
    }

    // Return the first item or null
    return { data: createdTransaction, error }
  },

  /**
   * Update an existing transaction
   */
  async updateTransaction(id: string, updateData: Partial<TransactionFormData>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .update(updateData)
      .eq('id', id)
      .select()

    // Return the first item or null
    return { data: data?.[0] || null, error }
  },

  /**
   * Delete a transaction
   */
  async deleteTransaction(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)

    return { data, error }
  },

  /**
   * Fetch transactions by category ID
   */
  async getTransactionsByCategory(categoryId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('category_id', categoryId)
      .order('date', { ascending: false })

    return { data, error }
  },

  /**
   * Calculate transaction statistics (total income, expenses, net balance)
   */
  async getTransactionStats() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      return { data: null, error }
    }

    if (!data || data.length === 0) {
      return {
        data: {
          totalIncome: 0,
          totalExpenses: 0,
          netBalance: 0,
          transactionCount: 0,
        },
        error: null,
      }
    }

    const stats: TransactionStats = {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      transactionCount: data.length,
    }

    data.forEach((transaction: Transaction) => {
      if (transaction.is_income) {
        stats.totalIncome += transaction.amount
      } else {
        stats.totalExpenses += transaction.amount
      }
    })

    stats.netBalance = stats.totalIncome - stats.totalExpenses

    return { data: stats, error: null }
  },
}

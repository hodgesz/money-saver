import { createClient } from '@/lib/supabase/client'
import type { Budget, BudgetFormData } from '@/types'

export interface BudgetStatus {
  budget: Budget
  spent: number
  remaining: number
  percentage: number
  status: 'under' | 'at' | 'over'
}

export const budgetService = {
  /**
   * Get all budgets for the current user
   */
  async getBudgets() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .order('created_at', { ascending: false })

    return { data: data || null, error }
  },

  /**
   * Get a single budget by ID
   */
  async getBudgetById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', id)
      .single()

    return { data, error }
  },

  /**
   * Create a new budget with user_id
   */
  async createBudget(budgetData: BudgetFormData) {
    const supabase = createClient()

    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        data: null,
        error: { message: 'User not authenticated', details: authError?.message }
      }
    }

    // Add user_id to the budget data
    const budgetWithUser = {
      ...budgetData,
      user_id: user.id,
    }

    const { data, error } = await supabase
      .from('budgets')
      .insert([budgetWithUser])
      .select()

    return { data: data?.[0] || null, error }
  },

  /**
   * Update an existing budget
   */
  async updateBudget(id: string, budgetData: Partial<BudgetFormData>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('budgets')
      .update(budgetData)
      .eq('id', id)
      .select()

    return { data: data?.[0] || null, error }
  },

  /**
   * Delete a budget
   */
  async deleteBudget(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)

    return { data, error }
  },

  /**
   * Get budgets for a specific category
   */
  async getBudgetsByCategory(categoryId: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })

    return { data: data || null, error }
  },

  /**
   * Calculate budget status with actual spending
   */
  async getBudgetStatus(budgetId: string): Promise<{ data: BudgetStatus | null, error: any }> {
    const supabase = createClient()

    // Get the budget
    const { data: budget, error: budgetError } = await this.getBudgetById(budgetId)

    if (budgetError || !budget) {
      return { data: null, error: budgetError }
    }

    // Calculate date range
    const startDate = budget.start_date
    const endDate = budget.end_date || new Date().toISOString().split('T')[0]

    // Get transactions for this category within the date range
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('amount, is_income')
      .eq('category_id', budget.category_id)
      .eq('is_income', false)  // Only count expenses
      .gte('date', startDate)
      .lte('date', endDate)

    if (transError) {
      return { data: null, error: transError }
    }

    // Calculate total spent (only expenses, not income)
    const spent = transactions?.reduce((sum, t) => {
      return t.is_income ? sum : sum + Number(t.amount)
    }, 0) || 0

    const remaining = budget.amount - spent
    const percentage = Math.round((spent / budget.amount) * 100)

    let status: 'under' | 'at' | 'over'
    if (percentage < 100) {
      status = 'under'
    } else if (percentage === 100) {
      status = 'at'
    } else {
      status = 'over'
    }

    return {
      data: {
        budget,
        spent,
        remaining,
        percentage,
        status,
      },
      error: null,
    }
  },
}

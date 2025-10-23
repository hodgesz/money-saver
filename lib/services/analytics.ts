import { createClient } from '@/lib/supabase/client'

export interface MonthlySpending {
  income: number
  expenses: number
  net: number
  transactionCount: number
  month: number
  year: number
}

export interface CategoryBreakdownItem {
  total: number
  count: number
  percentage: number
}

export interface CategoryBreakdown {
  [categoryId: string]: CategoryBreakdownItem
}

export interface MonthlyTrend {
  month: string
  total: number
  count: number
}

export interface BudgetStatus {
  budget: any
  spent: number
  remaining: number
  percentage: number
  status: 'under' | 'at' | 'over'
}

export const analyticsService = {
  /**
   * Get monthly spending for a specific month
   */
  async getMonthlySpending(year: number, month: number): Promise<{ data: MonthlySpending | null; error: any }> {
    try {
      const supabase = createClient()

      // Create date range for the specified month
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 1).toISOString()

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lt('date', endDate)

      if (error) {
        return { data: null, error }
      }

      if (!transactions || transactions.length === 0) {
        return {
          data: {
            income: 0,
            expenses: 0,
            net: 0,
            transactionCount: 0,
            month,
            year,
          },
          error: null,
        }
      }

      // Separate income and expenses
      const incomeTransactions = transactions.filter((tx) => tx.is_income)
      const expenseTransactions = transactions.filter((tx) => !tx.is_income)

      const income = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0)
      const expenses = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0)
      const net = income - expenses

      return {
        data: {
          income,
          expenses,
          net,
          transactionCount: transactions.length,
          month,
          year,
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error }
    }
  },

  /**
   * Get category breakdown for a specific month
   */
  async getCategoryBreakdown(year: number, month: number): Promise<{ data: CategoryBreakdown | null; error: any }> {
    try {
      const supabase = createClient()

      // Create date range for the specified month
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 1).toISOString()

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_income', false) // Only expenses
        .gte('date', startDate)
        .lt('date', endDate)

      if (error) {
        return { data: null, error }
      }

      if (!transactions || transactions.length === 0) {
        return { data: {}, error: null }
      }

      // Filter out income transactions (in case mock doesn't filter)
      const expenses = transactions.filter((tx) => !tx.is_income)

      if (expenses.length === 0) {
        return { data: {}, error: null }
      }

      // Group by category
      const categoryMap = new Map<string, CategoryBreakdownItem>()
      let totalExpenses = 0

      expenses.forEach((transaction) => {
        totalExpenses += transaction.amount

        if (categoryMap.has(transaction.category_id)) {
          const existing = categoryMap.get(transaction.category_id)!
          existing.total += transaction.amount
          existing.count += 1
        } else {
          categoryMap.set(transaction.category_id, {
            total: transaction.amount,
            count: 1,
            percentage: 0,
          })
        }
      })

      // Calculate percentages and round to 2 decimal places
      const breakdown: CategoryBreakdown = {}
      categoryMap.forEach((value, key) => {
        breakdown[key] = {
          total: value.total,
          count: value.count,
          percentage: totalExpenses > 0 ? parseFloat(((value.total / totalExpenses) * 100).toFixed(2)) : 0,
        }
      })

      return { data: breakdown, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  /**
   * Get spending trends over a date range
   */
  async getSpendingTrends(startDate: string, endDate: string): Promise<{ data: MonthlyTrend[] | null; error: any }> {
    try {
      const supabase = createClient()

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('is_income', false) // Only expenses
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      if (error) {
        return { data: null, error }
      }

      if (!transactions || transactions.length === 0) {
        return { data: [], error: null }
      }

      // Filter out income transactions (in case mock doesn't filter)
      const expenses = transactions.filter((tx) => !tx.is_income)

      if (expenses.length === 0) {
        return { data: [], error: null }
      }

      // Group by month
      const monthMap = new Map<string, { total: number; count: number }>()

      expenses.forEach((transaction) => {
        // Extract year-month directly from ISO string to avoid timezone issues
        const monthKey = transaction.date.substring(0, 7) // 'YYYY-MM-DD' -> 'YYYY-MM'

        if (monthMap.has(monthKey)) {
          const existing = monthMap.get(monthKey)!
          existing.total += transaction.amount
          existing.count += 1
        } else {
          monthMap.set(monthKey, {
            total: transaction.amount,
            count: 1,
          })
        }
      })

      // Convert to array
      const trends: MonthlyTrend[] = Array.from(monthMap.entries()).map(([month, data]) => ({
        month,
        total: data.total,
        count: data.count,
      }))

      // Sort by month
      trends.sort((a, b) => a.month.localeCompare(b.month))

      return { data: trends, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  /**
   * Get budget summary for all active budgets
   */
  async getBudgetSummary(): Promise<{ data: BudgetStatus[] | null; error: any }> {
    try {
      const supabase = createClient()

      // Get all budgets
      const { data: budgets, error: budgetError } = await supabase
        .from('budgets')
        .select('*')
        .order('start_date', { ascending: false })

      if (budgetError) {
        return { data: null, error: budgetError }
      }

      if (!budgets || budgets.length === 0) {
        return { data: [], error: null }
      }

      const summaries: BudgetStatus[] = []

      for (const budget of budgets) {
        // Get transactions for this budget's category
        const { data: transactions, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('category_id', budget.category_id)
          .eq('is_income', false)
          .gte('date', budget.start_date)
          .lte('date', budget.end_date || new Date().toISOString())

        if (txError) {
          continue
        }

        // Filter out income in case mock doesn't
        const expenses = transactions?.filter((tx) => !tx.is_income) || []
        const spent = expenses.reduce((sum, tx) => sum + tx.amount, 0)
        const remaining = budget.amount - spent
        const percentage = budget.amount > 0 ? parseFloat(((spent / budget.amount) * 100).toFixed(2)) : 0

        let status: 'under' | 'at' | 'over'
        if (percentage < 100) {
          status = 'under'
        } else if (percentage === 100) {
          status = 'at'
        } else {
          status = 'over'
        }

        summaries.push({
          budget,
          spent,
          remaining,
          percentage,
          status,
        })
      }

      return { data: summaries, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
}

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
  name: string
  color?: string
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

export interface YearOverYearComparison {
  current: MonthlySpending
  previous: MonthlySpending
  percentChange: number
  trend: 'increasing' | 'decreasing' | 'stable' | 'no-data'
}

export interface MonthOverMonthComparison {
  current: MonthlySpending
  previous: MonthlySpending
  percentChange: number
  trend: 'increasing' | 'decreasing' | 'stable' | 'no-data'
}

export interface SavingsRate {
  savingsRate: number
  totalIncome: number
  totalExpenses: number
  netSavings: number
}

// Phase 2.3 - Charts & Visualizations Types
export interface MonthlySpendingTrend {
  month: string // YYYY-MM format
  monthLabel: string // e.g., "Jan 2024"
  income: number
  expenses: number
  net: number
  transactionCount: number
}

export interface CategoryTrendData {
  name: string
  total: number
  color?: string
}

export interface CategoryTrendMonth {
  month: string // YYYY-MM format
  monthLabel: string // e.g., "Jan 2024"
  categories: {
    [categoryId: string]: CategoryTrendData
  }
}

export interface IncomeExpenseTimelineData {
  month: string // YYYY-MM format
  monthLabel: string // e.g., "Jan 2024"
  income: number
  expenses: number
  net: number
}

export const analyticsService = {
  /**
   * Get monthly spending for a specific month
   */
  async getMonthlySpending(year: number, month: number, accountId?: string): Promise<{ data: MonthlySpending | null; error: any }> {
    try {
      const supabase = createClient()

      // Create date range for the specified month
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 1).toISOString()

      let query = supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lt('date', endDate)

      // Apply account filter if provided
      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data: transactions, error } = await query

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
  async getCategoryBreakdown(year: number, month: number, accountId?: string): Promise<{ data: CategoryBreakdown | null; error: any }> {
    try {
      const supabase = createClient()

      // Create date range for the specified month
      const startDate = new Date(year, month - 1, 1).toISOString()
      const endDate = new Date(year, month, 1).toISOString()

      // Fetch transactions with category details
      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories (
            id,
            name,
            color
          )
        `)
        .eq('is_income', false) // Only expenses
        .gte('date', startDate)
        .lt('date', endDate)

      // Apply account filter if provided
      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data: transactions, error } = await query

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
        const categoryId = transaction.category_id
        const categoryName = transaction.category?.name || 'Uncategorized'
        const categoryColor = transaction.category?.color || undefined

        if (categoryMap.has(categoryId)) {
          const existing = categoryMap.get(categoryId)!
          existing.total += transaction.amount
          existing.count += 1
        } else {
          categoryMap.set(categoryId, {
            total: transaction.amount,
            count: 1,
            percentage: 0,
            name: categoryName,
            color: categoryColor,
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
          name: value.name,
          color: value.color,
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
  async getSpendingTrends(startDate: string, endDate: string, accountId?: string): Promise<{ data: MonthlyTrend[] | null; error: any }> {
    try {
      const supabase = createClient()

      let query = supabase
        .from('transactions')
        .select('*')
        .eq('is_income', false) // Only expenses
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      // Apply account filter if provided
      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data: transactions, error } = await query

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

  /**
   * Get year-over-year comparison for a specific month
   */
  async getYearOverYearComparison(year: number, month: number): Promise<{ data: YearOverYearComparison | null; error: any }> {
    try {
      // Get current year data
      const currentResult = await this.getMonthlySpending(year, month)
      if (currentResult.error) {
        return { data: null, error: currentResult.error }
      }

      // Get previous year data
      const previousResult = await this.getMonthlySpending(year - 1, month)
      if (previousResult.error) {
        return { data: null, error: previousResult.error }
      }

      const current = currentResult.data!
      const previous = previousResult.data!

      // Calculate percent change based on expenses
      let percentChange = 0
      let trend: 'increasing' | 'decreasing' | 'stable' | 'no-data' = 'stable'

      if (previous.expenses === 0 && current.expenses === 0) {
        trend = 'stable'
        percentChange = 0
      } else if (previous.expenses === 0) {
        trend = 'no-data'
        percentChange = 0
      } else {
        percentChange = parseFloat((((current.expenses - previous.expenses) / previous.expenses) * 100).toFixed(2))

        if (percentChange > 0) {
          trend = 'increasing'
        } else if (percentChange < 0) {
          trend = 'decreasing'
        } else {
          trend = 'stable'
        }
      }

      return {
        data: {
          current,
          previous,
          percentChange,
          trend,
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error }
    }
  },

  /**
   * Get month-over-month comparison
   */
  async getMonthOverMonthComparison(year: number, month: number): Promise<{ data: MonthOverMonthComparison | null; error: any }> {
    try {
      // Get current month data
      const currentResult = await this.getMonthlySpending(year, month)
      if (currentResult.error) {
        return { data: null, error: currentResult.error }
      }

      // Calculate previous month and year (handle year boundary)
      let previousMonth = month - 1
      let previousYear = year

      if (previousMonth === 0) {
        previousMonth = 12
        previousYear = year - 1
      }

      // Get previous month data
      const previousResult = await this.getMonthlySpending(previousYear, previousMonth)
      if (previousResult.error) {
        return { data: null, error: previousResult.error }
      }

      const current = currentResult.data!
      const previous = previousResult.data!

      // Calculate percent change based on expenses
      let percentChange = 0
      let trend: 'increasing' | 'decreasing' | 'stable' | 'no-data' = 'stable'

      if (previous.expenses === 0 && current.expenses === 0) {
        trend = 'stable'
        percentChange = 0
      } else if (previous.expenses === 0) {
        trend = 'no-data'
        percentChange = 0
      } else {
        percentChange = parseFloat((((current.expenses - previous.expenses) / previous.expenses) * 100).toFixed(2))

        if (percentChange > 0) {
          trend = 'increasing'
        } else if (percentChange < 0) {
          trend = 'decreasing'
        } else {
          trend = 'stable'
        }
      }

      return {
        data: {
          current,
          previous,
          percentChange,
          trend,
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error }
    }
  },

  /**
   * Calculate savings rate for a date range
   */
  async getSavingsRate(startDate: string, endDate: string, accountId?: string): Promise<{ data: SavingsRate | null; error: any }> {
    try {
      const supabase = createClient()

      let query = supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)

      // Apply account filter if provided
      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data: transactions, error } = await query

      if (error) {
        return { data: null, error }
      }

      if (!transactions || transactions.length === 0) {
        return {
          data: {
            savingsRate: 0,
            totalIncome: 0,
            totalExpenses: 0,
            netSavings: 0,
          },
          error: null,
        }
      }

      // Separate income and expenses
      const incomeTransactions = transactions.filter((tx) => tx.is_income)
      const expenseTransactions = transactions.filter((tx) => !tx.is_income)

      const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0)
      const totalExpenses = expenseTransactions.reduce((sum, tx) => sum + tx.amount, 0)
      const netSavings = totalIncome - totalExpenses

      // Calculate savings rate
      let savingsRate = 0
      if (totalIncome > 0) {
        savingsRate = parseFloat(((netSavings / totalIncome) * 100).toFixed(2))
      }

      return {
        data: {
          savingsRate,
          totalIncome,
          totalExpenses,
          netSavings,
        },
        error: null,
      }
    } catch (error) {
      return { data: null, error }
    }
  },

  /**
   * Get monthly spending trends with income and expenses for chart visualization
   * Phase 2.3 - Monthly Spending Trends Bar Chart
   */
  async getMonthlySpendingTrends(
    startDate: string,
    endDate: string,
    accountId?: string
  ): Promise<{ data: MonthlySpendingTrend[] | null; error: any }> {
    try {
      const supabase = createClient()

      let query = supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      // Apply account filter if provided
      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data: transactions, error } = await query

      if (error) {
        return { data: null, error }
      }

      if (!transactions || transactions.length === 0) {
        return { data: [], error: null }
      }

      // Group by month
      const monthMap = new Map<
        string,
        { income: number; expenses: number; count: number }
      >()

      transactions.forEach((transaction) => {
        // Extract year-month directly from ISO string to avoid timezone issues
        const monthKey = transaction.date.substring(0, 7) // 'YYYY-MM-DD' -> 'YYYY-MM'

        if (monthMap.has(monthKey)) {
          const existing = monthMap.get(monthKey)!
          if (transaction.is_income) {
            existing.income += transaction.amount
          } else {
            existing.expenses += transaction.amount
          }
          existing.count += 1
        } else {
          monthMap.set(monthKey, {
            income: transaction.is_income ? transaction.amount : 0,
            expenses: transaction.is_income ? 0 : transaction.amount,
            count: 1,
          })
        }
      })

      // Convert to array with formatted labels
      const trends: MonthlySpendingTrend[] = Array.from(monthMap.entries()).map(([month, data]) => {
        // Format month label (2024-01 -> Jan 2024)
        const [year, monthNum] = month.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`

        return {
          month,
          monthLabel,
          income: data.income,
          expenses: data.expenses,
          net: data.income - data.expenses,
          transactionCount: data.count,
        }
      })

      // Sort by month chronologically
      trends.sort((a, b) => a.month.localeCompare(b.month))

      return { data: trends, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  /**
   * Get category spending trends over time
   * Phase 2.3 - Category Comparison Chart
   */
  async getCategoryTrends(
    startDate: string,
    endDate: string,
    accountId?: string
  ): Promise<{ data: CategoryTrendMonth[] | null; error: any }> {
    try {
      const supabase = createClient()

      let query = supabase
        .from('transactions')
        .select(`
          *,
          category:categories (
            id,
            name,
            color
          )
        `)
        .eq('is_income', false) // Only expenses for category comparison
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      // Apply account filter if provided
      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data: transactions, error } = await query

      if (error) {
        return { data: null, error }
      }

      if (!transactions || transactions.length === 0) {
        return { data: [], error: null }
      }

      // Group by month, then by category
      const monthMap = new Map<
        string,
        Map<string, { name: string; total: number; color?: string }>
      >()

      transactions.forEach((transaction) => {
        // Extract year-month
        const monthKey = transaction.date.substring(0, 7)

        // Get category info
        const categoryId = transaction.category_id || 'uncategorized'
        const categoryName = transaction.category?.name || 'Uncategorized'
        const categoryColor = transaction.category?.color || '#6b7280'

        // Initialize month map if needed
        if (!monthMap.has(monthKey)) {
          monthMap.set(monthKey, new Map())
        }

        const categoryMap = monthMap.get(monthKey)!

        // Aggregate by category
        if (categoryMap.has(categoryId)) {
          const existing = categoryMap.get(categoryId)!
          existing.total += transaction.amount
        } else {
          categoryMap.set(categoryId, {
            name: categoryName,
            total: transaction.amount,
            color: categoryColor,
          })
        }
      })

      // Convert to array format
      const trends: CategoryTrendMonth[] = Array.from(monthMap.entries()).map(([month, categoryMap]) => {
        // Format month label
        const [year, monthNum] = month.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`

        // Convert category map to object
        const categories: { [categoryId: string]: CategoryTrendData } = {}
        categoryMap.forEach((data, categoryId) => {
          categories[categoryId] = data
        })

        return {
          month,
          monthLabel,
          categories,
        }
      })

      // Sort by month chronologically
      trends.sort((a, b) => a.month.localeCompare(b.month))

      return { data: trends, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },

  /**
   * Get income vs expenses timeline
   * Phase 2.3 - Income vs Expenses Area Chart
   */
  async getIncomeExpenseTimeline(
    startDate: string,
    endDate: string,
    accountId?: string
  ): Promise<{ data: IncomeExpenseTimelineData[] | null; error: any }> {
    try {
      const supabase = createClient()

      let query = supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true })

      // Apply account filter if provided
      if (accountId) {
        query = query.eq('account_id', accountId)
      }

      const { data: transactions, error } = await query

      if (error) {
        return { data: null, error }
      }

      if (!transactions || transactions.length === 0) {
        return { data: [], error: null }
      }

      // Group by month
      const monthMap = new Map<string, { income: number; expenses: number }>()

      transactions.forEach((transaction) => {
        const monthKey = transaction.date.substring(0, 7)

        if (monthMap.has(monthKey)) {
          const existing = monthMap.get(monthKey)!
          if (transaction.is_income) {
            existing.income += transaction.amount
          } else {
            existing.expenses += transaction.amount
          }
        } else {
          monthMap.set(monthKey, {
            income: transaction.is_income ? transaction.amount : 0,
            expenses: transaction.is_income ? 0 : transaction.amount,
          })
        }
      })

      // Convert to array format
      const timeline: IncomeExpenseTimelineData[] = Array.from(monthMap.entries()).map(([month, data]) => {
        // Format month label
        const [year, monthNum] = month.split('-')
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        const monthLabel = `${monthNames[parseInt(monthNum) - 1]} ${year}`

        return {
          month,
          monthLabel,
          income: data.income,
          expenses: data.expenses,
          net: data.income - data.expenses,
        }
      })

      // Sort by month chronologically
      timeline.sort((a, b) => a.month.localeCompare(b.month))

      return { data: timeline, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
}

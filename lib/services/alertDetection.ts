import { createClient } from '@/lib/supabase/client'
import type { Transaction, Budget, AlertEvent, AlertSeverity } from '@/types'
import { alertEventsService } from './alertEvents'
import { alertSettingsService } from './alertSettings'

/**
 * Alert Detection Service
 *
 * Business logic to detect when alerts should be triggered.
 *
 * Features:
 * - Large purchase detection with configurable threshold
 * - Statistical anomaly detection using historical data
 * - Budget warning detection with percentage thresholds
 * - Budget status calculation
 */

interface ServiceResponse<T> {
  data: T | null
  error: any
}

interface BudgetStatus {
  spent: number
  limit: number
  percentage: number
}

export const alertDetectionService = {
  /**
   * Check if a transaction should trigger a large purchase alert
   */
  async checkLargePurchaseAlert(transaction: Transaction): Promise<ServiceResponse<AlertEvent>> {
    // Skip income transactions
    if (transaction.is_income) {
      return { data: null, error: null }
    }

    // Get user's large purchase alert settings
    const { data: alertSetting, error: settingError } = await alertSettingsService.getAlertSettingByType('large_purchase')

    if (settingError || !alertSetting || !alertSetting.is_enabled) {
      return { data: null, error: null }
    }

    const threshold = alertSetting.threshold || 100.00

    // Check if transaction amount exceeds threshold
    if (transaction.amount < threshold) {
      return { data: null, error: null }
    }

    // Determine severity based on how much threshold was exceeded
    const multiplier = transaction.amount / threshold
    const severity: AlertSeverity = multiplier >= 2 ? 'high' : 'medium'

    // Create alert event
    const message = `Large purchase detected: $${transaction.amount.toFixed(2)}${
      transaction.merchant ? ` at ${transaction.merchant}` : ''
    }`

    const { data: alertEvent, error: eventError } = await alertEventsService.createAlertEvent({
      alert_id: alertSetting.id,
      transaction_id: transaction.id,
      type: 'large_purchase',
      message,
      severity,
      metadata: {
        amount: transaction.amount,
        threshold,
        merchant: transaction.merchant,
      },
    })

    return { data: alertEvent, error: eventError }
  },

  /**
   * Check if a budget should trigger a warning alert
   */
  async checkBudgetWarningAlert(budgetId: string): Promise<ServiceResponse<AlertEvent>> {
    // Get user's budget warning alert settings
    const { data: alertSetting, error: settingError } = await alertSettingsService.getAlertSettingByType('budget_warning')

    if (settingError || !alertSetting || !alertSetting.is_enabled) {
      return { data: null, error: null }
    }

    const threshold = alertSetting.threshold || 80.00

    // Calculate current budget status
    const { data: budgetStatus, error: statusError } = await this.calculateBudgetStatus(budgetId)

    if (statusError || !budgetStatus) {
      return { data: null, error: statusError }
    }

    // Check if spending percentage exceeds threshold
    if (budgetStatus.percentage < threshold) {
      return { data: null, error: null }
    }

    // Determine severity
    const severity: AlertSeverity = budgetStatus.percentage >= 100 ? 'high' : 'medium'

    // Create alert event
    const message = budgetStatus.percentage >= 100
      ? `Budget exceeded: ${budgetStatus.percentage}% spent ($${budgetStatus.spent.toFixed(2)} of $${budgetStatus.limit.toFixed(2)})`
      : `Budget warning: ${budgetStatus.percentage}% spent ($${budgetStatus.spent.toFixed(2)} of $${budgetStatus.limit.toFixed(2)})`

    const { data: alertEvent, error: eventError } = await alertEventsService.createAlertEvent({
      alert_id: alertSetting.id,
      budget_id: budgetId,
      type: 'budget_warning',
      message,
      severity,
      metadata: {
        budgetId,
        spent: budgetStatus.spent,
        limit: budgetStatus.limit,
        percentage: budgetStatus.percentage,
      },
    })

    return { data: alertEvent, error: eventError }
  },

  /**
   * Calculate current budget spending status
   */
  async calculateBudgetStatus(budgetId: string): Promise<ServiceResponse<BudgetStatus>> {
    const supabase = createClient()

    // Get budget details
    const { data: budget, error: budgetError } = await supabase
      .from('budgets')
      .select('*')
      .eq('id', budgetId)
      .single()

    if (budgetError && budgetError.code === 'PGRST116') {
      return { data: null, error: null }
    }

    if (budgetError || !budget) {
      return { data: null, error: budgetError }
    }

    // Calculate date range for budget period
    const startDate = new Date(budget.start_date)
    const endDate = budget.end_date ? new Date(budget.end_date) : new Date()

    // Get total spending for this budget's category in the period
    const { data: transactions, error: txnError } = await supabase
      .from('transactions')
      .select('amount')
      .eq('category_id', budget.category_id)
      .eq('is_income', false)
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString())

    if (txnError) {
      return { data: null, error: txnError }
    }

    // Calculate total spent
    const spent = transactions?.reduce((sum, txn) => {
      const amount = typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount
      return sum + (amount || 0)
    }, 0) || 0

    const limit = typeof budget.amount === 'string' ? parseFloat(budget.amount) : budget.amount
    const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0

    return {
      data: {
        spent,
        limit,
        percentage,
      },
      error: null,
    }
  },

  /**
   * Detect if a transaction is anomalous based on historical spending patterns
   *
   * Uses statistical analysis (mean and standard deviation) to identify outliers.
   * A transaction is considered anomalous if it's 3+ standard deviations from the mean.
   */
  async detectAnomalies(transaction: Transaction): Promise<ServiceResponse<boolean>> {
    // Skip income transactions
    if (transaction.is_income) {
      return { data: false, error: null }
    }

    const supabase = createClient()

    // Get historical transactions for the same category (last 90 days)
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const { data: historicalTransactions, error } = await supabase
      .from('transactions')
      .select('amount')
      .eq('category_id', transaction.category_id)
      .eq('is_income', false)
      .gte('date', ninetyDaysAgo.toISOString())

    if (error) {
      return { data: false, error }
    }

    // Need at least 10 transactions for meaningful statistical analysis
    if (!historicalTransactions || historicalTransactions.length < 10) {
      return { data: false, error: null }
    }

    // Calculate mean and standard deviation
    const amounts = historicalTransactions.map(txn => {
      return typeof txn.amount === 'string' ? parseFloat(txn.amount) : txn.amount
    })

    const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length

    const variance = amounts.reduce((sum, amt) => {
      return sum + Math.pow(amt - mean, 2)
    }, 0) / amounts.length

    const stdDev = Math.sqrt(variance)

    // Check if transaction is 3+ standard deviations from mean
    const zScore = Math.abs(transaction.amount - mean) / stdDev
    const isAnomalous = zScore >= 3

    return { data: isAnomalous, error: null }
  },

  /**
   * Check if a transaction should trigger an anomaly alert
   */
  async checkAnomalyAlert(transaction: Transaction): Promise<ServiceResponse<AlertEvent>> {
    // Get user's anomaly alert settings
    const { data: alertSetting, error: settingError } = await alertSettingsService.getAlertSettingByType('anomaly')

    if (settingError || !alertSetting || !alertSetting.is_enabled) {
      return { data: null, error: null }
    }

    // Detect if transaction is anomalous
    const { data: isAnomalous, error: detectionError } = await this.detectAnomalies(transaction)

    if (detectionError || !isAnomalous) {
      return { data: null, error: detectionError }
    }

    // Create alert event
    const message = `Unusual spending detected: $${transaction.amount.toFixed(2)}${
      transaction.merchant ? ` at ${transaction.merchant}` : ''
    }`

    const { data: alertEvent, error: eventError } = await alertEventsService.createAlertEvent({
      alert_id: alertSetting.id,
      transaction_id: transaction.id,
      type: 'anomaly',
      message,
      severity: 'medium',
      metadata: {
        amount: transaction.amount,
        merchant: transaction.merchant,
      },
    })

    return { data: alertEvent, error: eventError }
  },
}

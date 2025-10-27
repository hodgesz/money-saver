import { createClient } from '@/lib/supabase/client'
import type { Transaction } from '@/types'

/**
 * Duplicate Detection Service
 *
 * Checks for duplicate transactions before import to prevent
 * importing the same transaction multiple times.
 */

export interface DuplicateCheckResult {
  isDuplicate: boolean
  matchedTransaction?: Transaction
  confidence: number // 0-1 score indicating match confidence
}

export interface TransactionToCheck {
  date: string
  amount: number
  merchant: string
  description: string
}

export const duplicateDetectionService = {
  /**
   * Check if a transaction is a duplicate
   *
   * A transaction is considered a duplicate if it has:
   * - Same date (exact match)
   * - Same amount (exact match to 2 decimal places)
   * - Same merchant (case-insensitive match)
   *
   * @param transaction Transaction to check
   * @param existingTransactions Optional array of existing transactions to check against
   * @returns DuplicateCheckResult with match info
   */
  async checkDuplicate(
    transaction: TransactionToCheck,
    existingTransactions?: Transaction[]
  ): Promise<DuplicateCheckResult> {
    // If existing transactions provided, check against them
    if (existingTransactions) {
      return this.checkAgainstList(transaction, existingTransactions)
    }

    // Otherwise, query the database
    const supabase = createClient()

    // Query for transactions on the same date with same amount
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('date', transaction.date)
      .eq('amount', transaction.amount)

    if (error || !data || data.length === 0) {
      return { isDuplicate: false, confidence: 0 }
    }

    // Check merchant match
    return this.checkAgainstList(transaction, data)
  },

  /**
   * Check transaction against a list of existing transactions
   */
  checkAgainstList(
    transaction: TransactionToCheck,
    existingTransactions: Transaction[]
  ): DuplicateCheckResult {
    const normalizedMerchant = transaction.merchant.toLowerCase().trim()
    const normalizedDesc = transaction.description.toLowerCase().trim()

    for (const existing of existingTransactions) {
      // Check date match - extract just the date part from timestamp
      // existing.date is a timestamptz like "2024-12-25 00:00:00+00"
      // transaction.date is a string like "2024-12-25"
      const existingDate = existing.date.split('T')[0].split(' ')[0]
      if (existingDate !== transaction.date) continue

      // Check amount match (to 2 decimal places)
      // Convert existing.amount to number if it's a string
      const existingAmount = typeof existing.amount === 'string'
        ? parseFloat(existing.amount)
        : existing.amount
      if (Math.abs(existingAmount - transaction.amount) > 0.01) continue

      // Check merchant match (case-insensitive)
      const existingMerchant = (existing.merchant || '').toLowerCase().trim()
      const merchantMatch = existingMerchant === normalizedMerchant

      // Check description similarity
      const existingDesc = existing.description.toLowerCase().trim()
      const descMatch = existingDesc === normalizedDesc

      // If merchant and description both match, it's a duplicate
      if (merchantMatch && descMatch) {
        return {
          isDuplicate: true,
          matchedTransaction: existing,
          confidence: 1.0,
        }
      }

      // If merchant matches but description differs slightly, it's likely a duplicate
      if (merchantMatch) {
        return {
          isDuplicate: true,
          matchedTransaction: existing,
          confidence: 0.9,
        }
      }

      // If description matches but merchant differs, it might be a duplicate
      // BUT: only if both merchants have values (not null/empty)
      // This prevents false positives when merchant data is missing
      if (descMatch && existingMerchant && normalizedMerchant) {
        return {
          isDuplicate: true,
          matchedTransaction: existing,
          confidence: 0.8,
        }
      }
    }

    return { isDuplicate: false, confidence: 0 }
  },

  /**
   * Batch check multiple transactions for duplicates
   * This is more efficient than checking one at a time
   *
   * @param transactions Array of transactions to check
   * @returns Array of DuplicateCheckResults in same order
   */
  async batchCheckDuplicates(
    transactions: TransactionToCheck[]
  ): Promise<DuplicateCheckResult[]> {
    if (transactions.length === 0) return []

    const supabase = createClient()

    // Get unique dates from transactions and sort them
    const dates = [...new Set(transactions.map(t => t.date))].sort()
    const earliestDate = dates[0]
    const latestDate = dates[dates.length - 1]

    console.log('[DuplicateDetection] Checking', transactions.length, 'transactions')
    console.log('[DuplicateDetection] Date range:', earliestDate, 'to', latestDate)

    // Fetch all transactions for this date range
    // The date column is timestamptz, so we need to use full timestamp strings
    const { data: existingTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', earliestDate + 'T00:00:00.000Z')
      .lte('date', latestDate + 'T23:59:59.999Z')
      .order('date', { ascending: false })

    console.log('[DuplicateDetection] Query result:', {
      count: existingTransactions?.length || 0,
      error: error?.message,
      sample: existingTransactions?.slice(0, 2)
    })

    if (error) {
      console.error('[DuplicateDetection] Error querying transactions:', error)
      // If error, mark all as not duplicates
      return transactions.map(() => ({ isDuplicate: false, confidence: 0 }))
    }

    if (!existingTransactions || existingTransactions.length === 0) {
      console.log('[DuplicateDetection] No existing transactions found')
      return transactions.map(() => ({ isDuplicate: false, confidence: 0 }))
    }

    // Check each transaction against the existing ones
    const results = transactions.map(transaction =>
      this.checkAgainstList(transaction, existingTransactions)
    )

    const duplicateCount = results.filter(r => r.isDuplicate).length
    console.log('[DuplicateDetection] Found', duplicateCount, 'duplicates out of', transactions.length)

    return results
  },

  /**
   * Get duplicate statistics for a batch of transactions
   */
  getDuplicateStats(results: DuplicateCheckResult[]): {
    total: number
    duplicates: number
    new: number
    duplicatePercentage: number
  } {
    const total = results.length
    const duplicates = results.filter(r => r.isDuplicate).length
    const newCount = total - duplicates

    return {
      total,
      duplicates,
      new: newCount,
      duplicatePercentage: total > 0 ? (duplicates / total) * 100 : 0,
    }
  },
}

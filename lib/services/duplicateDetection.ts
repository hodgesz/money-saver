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
      // Check date match (exact)
      if (existing.date !== transaction.date) continue

      // Check amount match (to 2 decimal places)
      if (Math.abs(existing.amount - transaction.amount) > 0.01) continue

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
      if (descMatch) {
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

    // Get unique dates from transactions
    const dates = [...new Set(transactions.map(t => t.date))]

    // Fetch all transactions for these dates
    const { data: existingTransactions, error } = await supabase
      .from('transactions')
      .select('*')
      .in('date', dates)
      .order('date', { ascending: false })

    if (error || !existingTransactions) {
      // If error, mark all as not duplicates
      return transactions.map(() => ({ isDuplicate: false, confidence: 0 }))
    }

    // Check each transaction against the existing ones
    return transactions.map(transaction =>
      this.checkAgainstList(transaction, existingTransactions)
    )
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

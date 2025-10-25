import { duplicateDetectionService } from '../duplicateDetection'
import type { Transaction } from '@/types'
import type { TransactionToCheck } from '../duplicateDetection'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        in: jest.fn(() => ({
          order: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  })),
}))

describe('duplicateDetectionService', () => {
  describe('checkAgainstList', () => {
    const existingTransactions: Transaction[] = [
      {
        id: '1',
        user_id: 'user-1',
        date: '2025-01-15',
        amount: 45.99,
        merchant: 'Amazon',
        description: 'Books',
        category_id: null,
        account_id: null,
        receipt_url: null,
        is_income: false,
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      },
      {
        id: '2',
        user_id: 'user-1',
        date: '2025-01-15',
        amount: 100.00,
        merchant: 'Target',
        description: 'Groceries',
        category_id: null,
        account_id: null,
        receipt_url: null,
        is_income: false,
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      },
    ]

    it('detects exact duplicate with confidence 1.0 (date + amount + merchant + description)', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.99,
        merchant: 'Amazon',
        description: 'Books',
      }

      const result = duplicateDetectionService.checkAgainstList(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.confidence).toBe(1.0)
      expect(result.matchedTransaction?.id).toBe('1')
    })

    it('detects duplicate with confidence 0.9 (date + amount + merchant)', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.99,
        merchant: 'Amazon',
        description: 'Different description',
      }

      const result = duplicateDetectionService.checkAgainstList(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.confidence).toBe(0.9)
      expect(result.matchedTransaction?.id).toBe('1')
    })

    it('detects duplicate with confidence 0.8 (date + amount + description)', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.99,
        merchant: 'Different Merchant',
        description: 'Books',
      }

      const result = duplicateDetectionService.checkAgainstList(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.confidence).toBe(0.8)
      expect(result.matchedTransaction?.id).toBe('1')
    })

    it('returns no duplicate when date does not match', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-16', // Different date
        amount: 45.99,
        merchant: 'Amazon',
        description: 'Books',
      }

      const result = duplicateDetectionService.checkAgainstList(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(false)
      expect(result.confidence).toBe(0)
      expect(result.matchedTransaction).toBeUndefined()
    })

    it('returns no duplicate when amount does not match', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 50.99, // Different amount
        merchant: 'Amazon',
        description: 'Books',
      }

      const result = duplicateDetectionService.checkAgainstList(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(false)
      expect(result.confidence).toBe(0)
    })

    it('returns no duplicate when both merchant and description differ', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.99,
        merchant: 'Different Store',
        description: 'Different item',
      }

      const result = duplicateDetectionService.checkAgainstList(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(false)
      expect(result.confidence).toBe(0)
    })

    it('handles case-insensitive merchant matching', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.99,
        merchant: 'AMAZON', // Different case
        description: 'Books',
      }

      const result = duplicateDetectionService.checkAgainstList(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.confidence).toBe(1.0)
    })

    it('handles whitespace in merchant names', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.99,
        merchant: '  Amazon  ', // Extra whitespace
        description: 'Books',
      }

      const result = duplicateDetectionService.checkAgainstList(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.confidence).toBe(1.0)
    })

    it('handles amount difference within $0.01 tolerance', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.995, // $0.005 difference (well within $0.01 tolerance)
        merchant: 'Amazon',
        description: 'Books',
      }

      const result = duplicateDetectionService.checkAgainstList(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.confidence).toBe(1.0)
    })

    it('rejects amount difference beyond $0.01 tolerance', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.97, // $0.02 difference
        merchant: 'Amazon',
        description: 'Books',
      }

      const result = duplicateDetectionService.checkAgainstList(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(false)
      expect(result.confidence).toBe(0)
    })

    it('returns no duplicate when checking against empty list', () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.99,
        merchant: 'Amazon',
        description: 'Books',
      }

      const result = duplicateDetectionService.checkAgainstList(transaction, [])

      expect(result.isDuplicate).toBe(false)
      expect(result.confidence).toBe(0)
    })

    it('handles null merchant in existing transaction', () => {
      const transactionWithNullMerchant: Transaction = {
        ...existingTransactions[0],
        merchant: null as any,
      }

      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.99,
        merchant: 'Amazon',
        description: 'Books',
      }

      const result = duplicateDetectionService.checkAgainstList(transaction, [
        transactionWithNullMerchant,
      ])

      expect(result.isDuplicate).toBe(false)
      expect(result.confidence).toBe(0)
    })
  })

  describe('checkDuplicate', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('checks against provided existing transactions', async () => {
      const existingTransactions: Transaction[] = [
        {
          id: '1',
          user_id: 'user-1',
          date: '2025-01-15',
          amount: 45.99,
          merchant: 'Amazon',
          description: 'Books',
          category_id: null,
          account_id: null,
          receipt_url: null,
          is_income: false,
          created_at: '2025-01-15T00:00:00Z',
          updated_at: '2025-01-15T00:00:00Z',
        },
      ]

      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.99,
        merchant: 'Amazon',
        description: 'Books',
      }

      const result = await duplicateDetectionService.checkDuplicate(
        transaction,
        existingTransactions
      )

      expect(result.isDuplicate).toBe(true)
      expect(result.confidence).toBe(1.0)
    })

    it('queries database when no existing transactions provided', async () => {
      const transaction: TransactionToCheck = {
        date: '2025-01-15',
        amount: 45.99,
        merchant: 'Amazon',
        description: 'Books',
      }

      const result = await duplicateDetectionService.checkDuplicate(transaction)

      expect(result.isDuplicate).toBe(false)
      expect(result.confidence).toBe(0)
    })
  })

  describe('batchCheckDuplicates', () => {
    it('returns empty array for empty input', async () => {
      const result = await duplicateDetectionService.batchCheckDuplicates([])

      expect(result).toEqual([])
    })

    it('returns all non-duplicates when database returns empty', async () => {
      const transactions: TransactionToCheck[] = [
        {
          date: '2025-01-15',
          amount: 45.99,
          merchant: 'Amazon',
          description: 'Books',
        },
        {
          date: '2025-01-16',
          amount: 100.00,
          merchant: 'Target',
          description: 'Groceries',
        },
      ]

      const results = await duplicateDetectionService.batchCheckDuplicates(
        transactions
      )

      expect(results).toHaveLength(2)
      expect(results[0].isDuplicate).toBe(false)
      expect(results[1].isDuplicate).toBe(false)
    })

    it('handles database errors gracefully', async () => {
      const { createClient } = require('@/lib/supabase/client')
      createClient.mockReturnValueOnce({
        from: () => ({
          select: () => ({
            in: () => ({
              order: () => Promise.resolve({ data: null, error: { message: 'DB error' } }),
            }),
          }),
        }),
      })

      const transactions: TransactionToCheck[] = [
        {
          date: '2025-01-15',
          amount: 45.99,
          merchant: 'Amazon',
          description: 'Books',
        },
      ]

      const results = await duplicateDetectionService.batchCheckDuplicates(
        transactions
      )

      expect(results).toHaveLength(1)
      expect(results[0].isDuplicate).toBe(false)
      expect(results[0].confidence).toBe(0)
    })
  })

  describe('getDuplicateStats', () => {
    it('calculates stats correctly with mixed results', () => {
      const results = [
        { isDuplicate: false, confidence: 0 },
        { isDuplicate: true, confidence: 1.0 },
        { isDuplicate: false, confidence: 0 },
        { isDuplicate: true, confidence: 0.9 },
      ]

      const stats = duplicateDetectionService.getDuplicateStats(results)

      expect(stats.total).toBe(4)
      expect(stats.duplicates).toBe(2)
      expect(stats.new).toBe(2)
      expect(stats.duplicatePercentage).toBe(50)
    })

    it('calculates stats correctly with all duplicates', () => {
      const results = [
        { isDuplicate: true, confidence: 1.0 },
        { isDuplicate: true, confidence: 0.9 },
      ]

      const stats = duplicateDetectionService.getDuplicateStats(results)

      expect(stats.total).toBe(2)
      expect(stats.duplicates).toBe(2)
      expect(stats.new).toBe(0)
      expect(stats.duplicatePercentage).toBe(100)
    })

    it('calculates stats correctly with no duplicates', () => {
      const results = [
        { isDuplicate: false, confidence: 0 },
        { isDuplicate: false, confidence: 0 },
      ]

      const stats = duplicateDetectionService.getDuplicateStats(results)

      expect(stats.total).toBe(2)
      expect(stats.duplicates).toBe(0)
      expect(stats.new).toBe(2)
      expect(stats.duplicatePercentage).toBe(0)
    })

    it('handles empty results array', () => {
      const stats = duplicateDetectionService.getDuplicateStats([])

      expect(stats.total).toBe(0)
      expect(stats.duplicates).toBe(0)
      expect(stats.new).toBe(0)
      expect(stats.duplicatePercentage).toBe(0)
    })

    it('calculates percentage correctly with single item', () => {
      const results = [{ isDuplicate: true, confidence: 1.0 }]

      const stats = duplicateDetectionService.getDuplicateStats(results)

      expect(stats.total).toBe(1)
      expect(stats.duplicates).toBe(1)
      expect(stats.new).toBe(0)
      expect(stats.duplicatePercentage).toBe(100)
    })
  })
})

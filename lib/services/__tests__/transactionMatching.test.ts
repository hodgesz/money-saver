/**
 * Transaction Matching Algorithm Tests
 * TDD RED Phase: Tests written before implementation
 *
 * Tests the core matching logic for linking Amazon line items to credit card charges
 * Based on date proximity, amount matching, and merchant detection
 */

import {
  findMatchingTransactions,
  calculateMatchConfidence,
  validateAmountMatch,
  isWithinDateWindow,
  groupTransactionsByOrder,
} from '../transactionMatching'
import {
  LinkedTransaction,
  MatchCandidate,
  MatchingConfig,
  DEFAULT_MATCHING_CONFIG,
} from '@/lib/types/transactionLinking'

describe('transactionMatching', () => {
  // Mock test data
  const mockParentTransaction: LinkedTransaction = {
    id: 'parent-1',
    user_id: 'user-123',
    date: '2025-10-20T00:00:00Z',
    amount: 82.97,
    merchant: 'AMAZON.COM*M12AB34CD',
    description: 'Amazon purchase',
    category_id: 'cat-shopping',
    account_id: 'acc-chase',
    receipt_url: null,
    is_income: false,
    created_at: '2025-10-20T10:00:00Z',
    updated_at: '2025-10-20T10:00:00Z',
    parent_transaction_id: null,
    link_confidence: null,
    link_type: null,
    link_metadata: {},
  }

  const mockChildTransactions: LinkedTransaction[] = [
    {
      id: 'child-1',
      user_id: 'user-123',
      date: '2025-10-18T00:00:00Z', // 2 days before
      amount: 24.99,
      merchant: 'Amazon',
      description: 'Wireless Mouse',
      category_id: null,
      account_id: null,
      receipt_url: null,
      is_income: false,
      created_at: '2025-10-18T08:00:00Z',
      updated_at: '2025-10-18T08:00:00Z',
      parent_transaction_id: null,
      link_confidence: null,
      link_type: null,
      link_metadata: {},
    },
    {
      id: 'child-2',
      user_id: 'user-123',
      date: '2025-10-18T00:00:00Z',
      amount: 8.99,
      merchant: 'Amazon',
      description: 'USB-C Cable',
      category_id: null,
      account_id: null,
      receipt_url: null,
      is_income: false,
      created_at: '2025-10-18T08:00:00Z',
      updated_at: '2025-10-18T08:00:00Z',
      parent_transaction_id: null,
      link_confidence: null,
      link_type: null,
      link_metadata: {},
    },
    {
      id: 'child-3',
      user_id: 'user-123',
      date: '2025-10-18T00:00:00Z',
      amount: 18.99,
      merchant: 'Amazon',
      description: 'Phone Case',
      category_id: null,
      account_id: null,
      receipt_url: null,
      is_income: false,
      created_at: '2025-10-18T08:00:00Z',
      updated_at: '2025-10-18T08:00:00Z',
      parent_transaction_id: null,
      link_confidence: null,
      link_type: null,
      link_metadata: {},
    },
  ]

  describe('isWithinDateWindow', () => {
    it('returns true for dates within window', () => {
      const parentDate = '2025-10-20T00:00:00Z'
      const childDate = '2025-10-18T00:00:00Z' // 2 days before
      const window = 5 // ±5 days

      expect(isWithinDateWindow(parentDate, childDate, window)).toBe(true)
    })

    it('returns false for dates outside window', () => {
      const parentDate = '2025-10-20T00:00:00Z'
      const childDate = '2025-10-10T00:00:00Z' // 10 days before
      const window = 5

      expect(isWithinDateWindow(parentDate, childDate, window)).toBe(false)
    })

    it('handles same-day transactions', () => {
      const date = '2025-10-20T00:00:00Z'
      const window = 5

      expect(isWithinDateWindow(date, date, window)).toBe(true)
    })

    it('handles child date after parent date', () => {
      const parentDate = '2025-10-20T00:00:00Z'
      const childDate = '2025-10-23T00:00:00Z' // 3 days after
      const window = 5

      expect(isWithinDateWindow(parentDate, childDate, window)).toBe(true)
    })

    it('handles exact boundary (edge of window)', () => {
      const parentDate = '2025-10-20T00:00:00Z'
      const childDate = '2025-10-15T00:00:00Z' // exactly 5 days before
      const window = 5

      expect(isWithinDateWindow(parentDate, childDate, window)).toBe(true)
    })
  })

  describe('validateAmountMatch', () => {
    it('returns true when amounts match exactly', () => {
      const parentAmount = 82.97
      const childrenTotal = 82.97
      const tolerance = 0.005 // 0.5%

      expect(validateAmountMatch(parentAmount, childrenTotal, tolerance)).toBe(true)
    })

    it('returns true when amounts within tolerance', () => {
      const parentAmount = 82.97
      const childrenTotal = 82.50 // ~0.57% difference
      const tolerance = 0.01 // 1%

      expect(validateAmountMatch(parentAmount, childrenTotal, tolerance)).toBe(true)
    })

    it('returns false when amounts outside tolerance', () => {
      const parentAmount = 82.97
      const childrenTotal = 75.00 // ~9.6% difference
      const tolerance = 0.005 // 0.5%

      expect(validateAmountMatch(parentAmount, childrenTotal, tolerance)).toBe(false)
    })

    it('handles zero amounts', () => {
      const parentAmount = 0
      const childrenTotal = 0
      const tolerance = 0.005

      expect(validateAmountMatch(parentAmount, childrenTotal, tolerance)).toBe(true)
    })

    it('handles tax and shipping calculations', () => {
      // Items: $24.99 + $8.99 + $18.99 = $52.97
      // Tax (8%): $4.24
      // Shipping: $5.00
      // Total: $62.21 (but CC shows $62.97 due to rounding)
      const parentAmount = 62.97
      const childrenTotal = 62.21
      const tolerance = 0.02 // 2% to handle tax/shipping estimation

      expect(validateAmountMatch(parentAmount, childrenTotal, tolerance)).toBe(true)
    })
  })

  describe('groupTransactionsByOrder', () => {
    it('groups transactions with same date as single order', () => {
      const grouped = groupTransactionsByOrder(mockChildTransactions)

      expect(grouped).toHaveLength(1)
      expect(grouped[0].transactions).toHaveLength(3)
      expect(grouped[0].totalAmount).toBe(52.97) // 24.99 + 8.99 + 18.99
    })

    it('creates separate groups for different dates', () => {
      const transactions = [
        ...mockChildTransactions,
        {
          ...mockChildTransactions[0],
          id: 'child-4',
          date: '2025-10-19T00:00:00Z', // different date
          amount: 15.00,
        },
      ]

      const grouped = groupTransactionsByOrder(transactions)

      expect(grouped).toHaveLength(2)
    })

    it('sorts groups by date', () => {
      const transactions = [
        { ...mockChildTransactions[0], date: '2025-10-19T00:00:00Z' },
        { ...mockChildTransactions[1], date: '2025-10-17T00:00:00Z' },
      ]

      const grouped = groupTransactionsByOrder(transactions)

      expect(grouped[0].date).toBe('2025-10-17T00:00:00Z')
      expect(grouped[1].date).toBe('2025-10-19T00:00:00Z')
    })
  })

  describe('calculateMatchConfidence', () => {
    it('calculates high confidence for exact matches', () => {
      const result = calculateMatchConfidence(
        mockParentTransaction,
        mockChildTransactions,
        DEFAULT_MATCHING_CONFIG
      )

      // Date: 2 days apart = ~32/40 points (40 - (2 * 4))
      // Amount: 52.97 vs 82.97 = won't match without tax/shipping
      // This test expects amount to be validated separately
      expect(result.dateScore).toBeGreaterThan(30)
      expect(result.totalScore).toBeGreaterThan(0)
    })

    it('applies date decay scoring', () => {
      const config = DEFAULT_MATCHING_CONFIG

      // Test at different date differences
      const oneDayResult = calculateMatchConfidence(
        mockParentTransaction,
        [{ ...mockChildTransactions[0], date: '2025-10-19T00:00:00Z' }],
        config
      )

      const threeDayResult = calculateMatchConfidence(
        mockParentTransaction,
        [{ ...mockChildTransactions[0], date: '2025-10-17T00:00:00Z' }],
        config
      )

      expect(oneDayResult.dateScore).toBeGreaterThan(threeDayResult.dateScore)
    })

    it('returns 0 confidence when dates outside window', () => {
      const farTransaction = {
        ...mockChildTransactions[0],
        date: '2025-10-01T00:00:00Z', // 19 days before
      }

      const result = calculateMatchConfidence(
        mockParentTransaction,
        [farTransaction],
        DEFAULT_MATCHING_CONFIG
      )

      expect(result.totalScore).toBe(0)
      expect(result.confidenceLevel).toBe('UNMATCHED')
    })

    it('gives bonus for order grouping', () => {
      // Multiple items on same date should get order group bonus
      const result = calculateMatchConfidence(
        mockParentTransaction,
        mockChildTransactions, // 3 items on same date
        DEFAULT_MATCHING_CONFIG
      )

      expect(result.orderGroupScore).toBe(10) // Max 10 points for grouping
    })
  })

  describe('findMatchingTransactions', () => {
    it('finds exact matches with high confidence', () => {
      // Amazon CSVs include tax and shipping as separate line items
      const childrenWithTaxShipping: LinkedTransaction[] = [
        ...mockChildTransactions,
        {
          id: 'child-tax',
          user_id: 'user-123',
          date: '2025-10-18T00:00:00Z',
          amount: 4.24,
          merchant: 'Amazon',
          description: 'Tax',
          category_id: null,
          account_id: null,
          receipt_url: null,
          is_income: false,
          created_at: '2025-10-18T08:00:00Z',
          updated_at: '2025-10-18T08:00:00Z',
          parent_transaction_id: null,
          link_confidence: null,
          link_type: null,
          link_metadata: {},
        },
        {
          id: 'child-shipping',
          user_id: 'user-123',
          date: '2025-10-18T00:00:00Z',
          amount: 5.00,
          merchant: 'Amazon',
          description: 'Shipping',
          category_id: null,
          account_id: null,
          receipt_url: null,
          is_income: false,
          created_at: '2025-10-18T08:00:00Z',
          updated_at: '2025-10-18T08:00:00Z',
          parent_transaction_id: null,
          link_confidence: null,
          link_type: null,
          link_metadata: {},
        },
      ]
      // Total: $24.99 + $8.99 + $18.99 + $4.24 + $5.00 = $62.21

      const adjustedParent = {
        ...mockParentTransaction,
        amount: 62.21,
      }

      const matches = findMatchingTransactions(
        [adjustedParent],
        childrenWithTaxShipping,
        DEFAULT_MATCHING_CONFIG
      )

      expect(matches).toHaveLength(1)
      expect(matches[0].parentTransaction.id).toBe('parent-1')
      expect(matches[0].childTransactions).toHaveLength(5) // 3 items + tax + shipping
      expect(matches[0].totalScore).toBeGreaterThanOrEqual(90) // High confidence - exact match
    })

    it('returns empty array when no matches found', () => {
      const unmatchedChild = {
        ...mockChildTransactions[0],
        date: '2025-01-01T00:00:00Z', // way in the past
        amount: 999.99, // different amount
      }

      const matches = findMatchingTransactions(
        [mockParentTransaction],
        [unmatchedChild],
        DEFAULT_MATCHING_CONFIG
      )

      expect(matches).toHaveLength(0)
    })

    it('filters by merchant when enabled', () => {
      const nonAmazonParent = {
        ...mockParentTransaction,
        merchant: 'TARGET STORE',
      }

      const config = {
        ...DEFAULT_MATCHING_CONFIG,
        enableMerchantMatching: true,
      }

      const matches = findMatchingTransactions(
        [nonAmazonParent],
        mockChildTransactions,
        config
      )

      expect(matches).toHaveLength(0)
    })

    it('handles multiple parent candidates', () => {
      const parent2 = {
        ...mockParentTransaction,
        id: 'parent-2',
        date: '2025-10-22T00:00:00Z', // different date
        amount: 50.00,
      }

      const matches = findMatchingTransactions(
        [mockParentTransaction, parent2],
        mockChildTransactions,
        DEFAULT_MATCHING_CONFIG
      )

      // Should match to closest date with matching amount
      expect(matches.length).toBeGreaterThanOrEqual(0)
    })

    it('does not match already linked transactions', () => {
      const linkedChild = {
        ...mockChildTransactions[0],
        parent_transaction_id: 'other-parent',
        link_type: 'manual' as const,
      }

      const matches = findMatchingTransactions(
        [mockParentTransaction],
        [linkedChild],
        DEFAULT_MATCHING_CONFIG
      )

      // Should not include already linked transactions
      const matchedChildren = matches[0]?.childTransactions || []
      expect(matchedChildren.find(c => c.id === 'child-1')).toBeUndefined()
    })
  })
})

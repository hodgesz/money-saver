/**
 * Automatic Linking Service Tests
 * Tests the automatic transaction linking that runs after CSV imports
 */

import { autoLinkAmazonTransactions, shouldRunAutoLink } from '../automaticLinking'
import { getLinkSuggestions } from '../transactionLinking'
import { transactionLinkingService } from '../transactionLinking'
import type { LinkSuggestion } from '@/lib/types/transactionLinking'

// Mock the transactionLinking module
jest.mock('../transactionLinking', () => ({
  getLinkSuggestions: jest.fn(),
  transactionLinkingService: {
    createLink: jest.fn(),
  },
}))

describe('automaticLinking service', () => {
  const mockHighConfidenceSuggestion: LinkSuggestion = {
    parentTransaction: {
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
    },
    childTransactions: [
      {
        id: 'child-1',
        user_id: 'user-123',
        date: '2025-10-18T00:00:00Z',
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
    ],
    confidence: 95,
    confidenceLevel: 'EXACT',
    matchScores: {
      dateScore: 36,
      amountScore: 48,
      orderGroupScore: 10,
      total: 94,
    },
  }

  const mockMediumConfidenceSuggestion: LinkSuggestion = {
    ...mockHighConfidenceSuggestion,
    parentTransaction: {
      ...mockHighConfidenceSuggestion.parentTransaction,
      id: 'parent-2',
      amount: 45.50,
    },
    childTransactions: [
      {
        ...mockHighConfidenceSuggestion.childTransactions[0],
        id: 'child-3',
        amount: 45.00,
      },
    ],
    confidence: 75,
    confidenceLevel: 'PARTIAL',
    matchScores: {
      dateScore: 32,
      amountScore: 38,
      orderGroupScore: 5,
      total: 75,
    },
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('autoLinkAmazonTransactions', () => {
    it('auto-links high confidence matches (≥90)', async () => {
      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([
        mockHighConfidenceSuggestion,
      ])
      ;(transactionLinkingService.createLink as jest.Mock).mockResolvedValue({
        success: true,
        linkedCount: 2,
        errors: [],
      })

      const result = await autoLinkAmazonTransactions('user-123')

      expect(result.success).toBe(true)
      expect(result.autoLinkedCount).toBe(1)
      expect(result.suggestedCount).toBe(0)
      expect(transactionLinkingService.createLink).toHaveBeenCalledWith({
        parentTransactionId: 'parent-1',
        childTransactionIds: ['child-1', 'child-2'],
        linkType: 'auto',
        confidence: 95,
        metadata: expect.objectContaining({
          matchScores: mockHighConfidenceSuggestion.matchScores,
          linkedAt: expect.any(String),
        }),
      })
    })

    it('keeps medium confidence matches as suggestions (70-89)', async () => {
      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([
        mockMediumConfidenceSuggestion,
      ])

      const result = await autoLinkAmazonTransactions('user-123')

      expect(result.success).toBe(true)
      expect(result.autoLinkedCount).toBe(0)
      expect(result.suggestedCount).toBe(1)
      expect(result.suggestedTransactions).toHaveLength(1)
      expect(transactionLinkingService.createLink).not.toHaveBeenCalled()
    })

    it('handles mixed confidence levels', async () => {
      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([
        mockHighConfidenceSuggestion,
        mockMediumConfidenceSuggestion,
      ])
      ;(transactionLinkingService.createLink as jest.Mock).mockResolvedValue({
        success: true,
        linkedCount: 2,
        errors: [],
      })

      const result = await autoLinkAmazonTransactions('user-123')

      expect(result.success).toBe(true)
      expect(result.autoLinkedCount).toBe(1)
      expect(result.suggestedCount).toBe(1)
      expect(result.totalMatches).toBe(2)
      expect(transactionLinkingService.createLink).toHaveBeenCalledTimes(1)
    })

    it('returns empty result when no suggestions found', async () => {
      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([])

      const result = await autoLinkAmazonTransactions('user-123')

      expect(result.success).toBe(true)
      expect(result.totalMatches).toBe(0)
      expect(result.autoLinkedCount).toBe(0)
      expect(result.suggestedCount).toBe(0)
      expect(transactionLinkingService.createLink).not.toHaveBeenCalled()
    })

    it('handles linking errors gracefully', async () => {
      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([
        mockHighConfidenceSuggestion,
      ])
      ;(transactionLinkingService.createLink as jest.Mock).mockResolvedValue({
        success: false,
        linkedCount: 0,
        errors: ['Database error'],
      })

      const result = await autoLinkAmazonTransactions('user-123')

      expect(result.success).toBe(false)
      expect(result.autoLinkedCount).toBe(0)
      expect(result.errors).toContain(
        'Failed to auto-link AMAZON.COM*M12AB34CD: Database error'
      )
    })

    it('continues linking on partial failures', async () => {
      const suggestion2 = {
        ...mockHighConfidenceSuggestion,
        parentTransaction: {
          ...mockHighConfidenceSuggestion.parentTransaction,
          id: 'parent-3',
        },
      }

      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([
        mockHighConfidenceSuggestion,
        suggestion2,
      ])

      // First link succeeds, second fails
      ;(transactionLinkingService.createLink as jest.Mock)
        .mockResolvedValueOnce({
          success: true,
          linkedCount: 2,
          errors: [],
        })
        .mockResolvedValueOnce({
          success: false,
          linkedCount: 0,
          errors: ['Database error'],
        })

      const result = await autoLinkAmazonTransactions('user-123')

      expect(result.autoLinkedCount).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(transactionLinkingService.createLink).toHaveBeenCalledTimes(2)
    })

    it('calls getLinkSuggestions with correct threshold (70)', async () => {
      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([])

      await autoLinkAmazonTransactions('user-123')

      expect(getLinkSuggestions).toHaveBeenCalledWith('user-123', 70)
    })

    it('includes metadata with linkedAt timestamp', async () => {
      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([
        mockHighConfidenceSuggestion,
      ])
      ;(transactionLinkingService.createLink as jest.Mock).mockResolvedValue({
        success: true,
        linkedCount: 2,
        errors: [],
      })

      const beforeTime = Date.now()
      await autoLinkAmazonTransactions('user-123')
      const afterTime = Date.now()

      const createLinkCall = (transactionLinkingService.createLink as jest.Mock)
        .mock.calls[0][0]
      const linkedAtTime = new Date(createLinkCall.metadata.linkedAt).getTime()

      expect(createLinkCall.metadata.linkedAt).toBeDefined()
      expect(linkedAtTime).toBeGreaterThanOrEqual(beforeTime)
      expect(linkedAtTime).toBeLessThanOrEqual(afterTime)
    })

    it('handles unexpected errors', async () => {
      ;(getLinkSuggestions as jest.Mock).mockRejectedValue(
        new Error('Network error')
      )

      const result = await autoLinkAmazonTransactions('user-123')

      expect(result.success).toBe(false)
      expect(result.totalMatches).toBe(0)
      expect(result.errors).toContain('Network error')
    })
  })

  describe('shouldRunAutoLink', () => {
    it('returns true when suggestions are available', async () => {
      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([
        mockHighConfidenceSuggestion,
      ])

      const result = await shouldRunAutoLink('user-123')

      expect(result).toBe(true)
      expect(getLinkSuggestions).toHaveBeenCalledWith('user-123', 70)
    })

    it('returns false when no suggestions are available', async () => {
      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([])

      const result = await shouldRunAutoLink('user-123')

      expect(result).toBe(false)
    })

    it('returns false on error', async () => {
      ;(getLinkSuggestions as jest.Mock).mockRejectedValue(
        new Error('Database error')
      )

      const result = await shouldRunAutoLink('user-123')

      expect(result).toBe(false)
    })
  })

  describe('Confidence Threshold Boundaries', () => {
    it('auto-links at exactly 90 confidence', async () => {
      const exactThresholdSuggestion = {
        ...mockHighConfidenceSuggestion,
        confidence: 90,
      }

      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([
        exactThresholdSuggestion,
      ])
      ;(transactionLinkingService.createLink as jest.Mock).mockResolvedValue({
        success: true,
        linkedCount: 2,
        errors: [],
      })

      const result = await autoLinkAmazonTransactions('user-123')

      expect(result.autoLinkedCount).toBe(1)
      expect(result.suggestedCount).toBe(0)
    })

    it('suggests at exactly 70 confidence', async () => {
      const lowThresholdSuggestion = {
        ...mockMediumConfidenceSuggestion,
        confidence: 70,
      }

      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([
        lowThresholdSuggestion,
      ])

      const result = await autoLinkAmazonTransactions('user-123')

      expect(result.autoLinkedCount).toBe(0)
      expect(result.suggestedCount).toBe(1)
    })

    it('suggests at 89 confidence (just below auto-link threshold)', async () => {
      const almostHighSuggestion = {
        ...mockMediumConfidenceSuggestion,
        confidence: 89,
      }

      ;(getLinkSuggestions as jest.Mock).mockResolvedValue([
        almostHighSuggestion,
      ])

      const result = await autoLinkAmazonTransactions('user-123')

      expect(result.autoLinkedCount).toBe(0)
      expect(result.suggestedCount).toBe(1)
    })
  })
})

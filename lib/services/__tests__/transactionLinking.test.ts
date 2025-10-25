/**
 * Transaction Linking Service Integration Tests
 * TDD RED Phase: Tests written before implementation
 *
 * Tests database CRUD operations for transaction linking
 * Uses mocked Supabase client
 */

import {
  createLink,
  removeLink,
  updateLink,
  getLinkedTransactions,
  getLinkSuggestions,
  bulkCreateLinks,
  validateLink,
} from '../transactionLinking'
import {
  LinkedTransaction,
  CreateLinkRequest,
  UpdateLinkRequest,
} from '@/lib/types/transactionLinking'
import { createClient } from '@supabase/supabase-js'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(),
  },
}))

describe('transactionLinking service', () => {
  const mockParent: LinkedTransaction = {
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

  const mockChildren: LinkedTransaction[] = [
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
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateLink', () => {
    it('validates a valid link request', async () => {
      const request: CreateLinkRequest = {
        parentTransactionId: 'parent-1',
        childTransactionIds: ['child-1', 'child-2'],
        linkType: 'manual',
      }

      const result = await validateLink(request, mockParent, mockChildren)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects link when parent is already a child', async () => {
      const linkedParent = {
        ...mockParent,
        parent_transaction_id: 'other-parent',
      }

      const request: CreateLinkRequest = {
        parentTransactionId: 'parent-1',
        childTransactionIds: ['child-1'],
        linkType: 'manual',
      }

      const result = await validateLink(request, linkedParent, mockChildren)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Parent transaction is already a child of another transaction')
    })

    it('rejects link when child is already linked', async () => {
      const linkedChild = [
        {
          ...mockChildren[0],
          parent_transaction_id: 'other-parent',
        },
      ]

      const request: CreateLinkRequest = {
        parentTransactionId: 'parent-1',
        childTransactionIds: ['child-1'],
        linkType: 'manual',
      }

      const result = await validateLink(request, mockParent, linkedChild)

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Child transaction child-1 is already linked')
    })

    it('rejects self-referencing links', async () => {
      const request: CreateLinkRequest = {
        parentTransactionId: 'parent-1',
        childTransactionIds: ['parent-1'], // same as parent
        linkType: 'manual',
      }

      const result = await validateLink(request, mockParent, [mockParent])

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Transaction cannot link to itself')
    })

    it('warns when amounts differ significantly', async () => {
      const differentAmountChild = [
        {
          ...mockChildren[0],
          amount: 500.00, // very different from parent
        },
      ]

      const request: CreateLinkRequest = {
        parentTransactionId: 'parent-1',
        childTransactionIds: ['child-1'],
        linkType: 'manual',
      }

      const result = await validateLink(request, mockParent, differentAmountChild)

      expect(result.valid).toBe(true) // Still valid, just warns
      expect(result.warnings).toContain('Child amounts ($500.00) differ significantly from parent ($82.97)')
    })
  })

  describe('createLink', () => {
    it('creates links for child transactions', async () => {
      const { supabase } = require('@/lib/supabase/client')

      const mockUpdate = jest.fn().mockResolvedValue({
        data: mockChildren.map(c => ({ ...c, parent_transaction_id: 'parent-1' })),
        error: null,
      })

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: mockChildren.map(c => ({ ...c, parent_transaction_id: 'parent-1' })),
              error: null,
            }),
          }),
        }),
      })

      const request: CreateLinkRequest = {
        parentTransactionId: 'parent-1',
        childTransactionIds: ['child-1', 'child-2'],
        linkType: 'manual',
        confidence: 95,
      }

      const result = await createLink(request)

      expect(result.success).toBe(true)
      expect(result.linkedCount).toBe(2)
      expect(supabase.from).toHaveBeenCalledWith('transactions')
    })

    it('handles database errors gracefully', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      const request: CreateLinkRequest = {
        parentTransactionId: 'parent-1',
        childTransactionIds: ['child-1'],
        linkType: 'manual',
      }

      const result = await createLink(request)

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Database error')
    })

    it('stores metadata with link', async () => {
      const { supabase } = require('@/lib/supabase/client')

      const mockUpdateFn = jest.fn().mockReturnValue({
        in: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockChildren,
            error: null,
          }),
        }),
      })

      supabase.from.mockReturnValue({
        update: mockUpdateFn,
      })

      const request: CreateLinkRequest = {
        parentTransactionId: 'parent-1',
        childTransactionIds: ['child-1'],
        linkType: 'auto',
        confidence: 92,
        metadata: {
          matchScores: {
            dateScore: 36,
            amountScore: 48,
            orderGroupScore: 8,
            total: 92,
          },
          orderId: 'AMZ-12345',
        },
      }

      await createLink(request)

      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          parent_transaction_id: 'parent-1',
          link_type: 'auto',
          link_confidence: 92,
          link_metadata: expect.objectContaining({
            matchScores: expect.any(Object),
            orderId: 'AMZ-12345',
          }),
        })
      )
    })
  })

  describe('removeLink', () => {
    it('removes link by setting parent_transaction_id to null', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ ...mockChildren[0], parent_transaction_id: null }],
            error: null,
          }),
        }),
      })

      const result = await removeLink('child-1')

      expect(result.success).toBe(true)
      expect(supabase.from).toHaveBeenCalledWith('transactions')
    })

    it('handles removal errors', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      })

      const result = await removeLink('nonexistent')

      expect(result.success).toBe(false)
      expect(result.errors).toContain('Not found')
    })
  })

  describe('updateLink', () => {
    it('updates link confidence and metadata', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ ...mockChildren[0], link_confidence: 85 }],
            error: null,
          }),
        }),
      })

      const request: UpdateLinkRequest = {
        transactionId: 'child-1',
        confidence: 85,
        metadata: {
          userNotes: 'Manually verified',
        },
      }

      const result = await updateLink(request)

      expect(result.success).toBe(true)
    })

    it('allows changing link type from auto to manual', async () => {
      const { supabase } = require('@/lib/supabase/client')

      const mockUpdateFn = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [mockChildren[0]],
          error: null,
        }),
      })

      supabase.from.mockReturnValue({
        update: mockUpdateFn,
      })

      const request: UpdateLinkRequest = {
        transactionId: 'child-1',
        linkType: 'manual',
        metadata: {
          originalConfidence: 85,
        },
      }

      await updateLink(request)

      expect(mockUpdateFn).toHaveBeenCalledWith(
        expect.objectContaining({
          link_type: 'manual',
        })
      )
    })
  })

  describe('getLinkedTransactions', () => {
    it('retrieves parent with all children', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // Mock parent query
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [mockParent],
            error: null,
          }),
        }),
      })

      // Mock children query
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockChildren.map(c => ({ ...c, parent_transaction_id: 'parent-1' })),
            error: null,
          }),
        }),
      })

      const result = await getLinkedTransactions('parent-1')

      expect(result.parent).toBeDefined()
      expect(result.children).toHaveLength(2)
      expect(result.totalChildren).toBe(2)
    })

    it('calculates total amounts correctly', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [mockParent],
            error: null,
          }),
        }),
      })

      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: mockChildren.map(c => ({ ...c, parent_transaction_id: 'parent-1' })),
            error: null,
          }),
        }),
      })

      const result = await getLinkedTransactions('parent-1')

      expect(result.totalAmount).toBe(mockParent.amount) // 82.97
      expect(result.childrenAmount).toBe(33.98) // 24.99 + 8.99
    })
  })

  describe('getLinkSuggestions', () => {
    it('returns suggestions with high confidence', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // Mock unlinked parent transactions
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            ilike: jest.fn().mockResolvedValue({
              data: [mockParent],
              error: null,
            }),
          }),
        }),
      })

      // Mock unlinked child transactions
      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          is: jest.fn().mockResolvedValue({
            data: mockChildren,
            error: null,
          }),
        }),
      })

      const suggestions = await getLinkSuggestions('user-123')

      expect(Array.isArray(suggestions)).toBe(true)
    })

    it('filters by minimum confidence threshold', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            ilike: jest.fn().mockResolvedValue({
              data: [mockParent],
              error: null,
            }),
          }),
        }),
      })

      supabase.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          is: jest.fn().mockResolvedValue({
            data: mockChildren,
            error: null,
          }),
        }),
      })

      const suggestions = await getLinkSuggestions('user-123', 80)

      // Only suggestions with 80+ confidence should be returned
      suggestions.forEach(suggestion => {
        expect(suggestion.confidence).toBeGreaterThanOrEqual(80)
      })
    })
  })

  describe('bulkCreateLinks', () => {
    it('creates multiple links in batch', async () => {
      const { supabase } = require('@/lib/supabase/client')

      supabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: mockChildren,
              error: null,
            }),
          }),
        }),
      })

      const requests: CreateLinkRequest[] = [
        {
          parentTransactionId: 'parent-1',
          childTransactionIds: ['child-1'],
          linkType: 'auto',
          confidence: 95,
        },
        {
          parentTransactionId: 'parent-2',
          childTransactionIds: ['child-2'],
          linkType: 'auto',
          confidence: 92,
        },
      ]

      const results = await bulkCreateLinks(requests)

      expect(results).toHaveLength(2)
      expect(results.filter(r => r.success)).toHaveLength(2)
    })

    it('continues on individual failures', async () => {
      const { supabase } = require('@/lib/supabase/client')

      // First call succeeds, second fails
      supabase.from
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: [mockChildren[0]],
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          update: jest.fn().mockReturnValue({
            in: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Error' },
              }),
            }),
          }),
        })

      const requests: CreateLinkRequest[] = [
        {
          parentTransactionId: 'parent-1',
          childTransactionIds: ['child-1'],
          linkType: 'auto',
        },
        {
          parentTransactionId: 'parent-2',
          childTransactionIds: ['child-2'],
          linkType: 'auto',
        },
      ]

      const results = await bulkCreateLinks(requests)

      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
    })
  })
})

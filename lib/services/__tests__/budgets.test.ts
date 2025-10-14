import { budgetService } from '../budgets'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockSupabaseClient = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
}

describe('budgetService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('getBudgets', () => {
    it('fetches all budgets for the user', async () => {
      const mockBudgets = [
        {
          id: '1',
          user_id: 'user-123',
          category_id: 'cat-1',
          amount: 500,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: 'user-123',
          category_id: 'cat-2',
          amount: 200,
          period: 'weekly',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockBudgets,
            error: null,
          }),
        }),
      })

      const result = await budgetService.getBudgets()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('budgets')
      expect(result.data).toEqual(mockBudgets)
      expect(result.error).toBeNull()
    })

    it('handles fetch error', async () => {
      const mockError = { message: 'Database error' }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      })

      const result = await budgetService.getBudgets()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('getBudgetById', () => {
    it('fetches a single budget by ID', async () => {
      const mockBudget = {
        id: '1',
        user_id: 'user-123',
        category_id: 'cat-1',
        amount: 500,
        period: 'monthly',
        start_date: '2024-01-01',
        end_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockSingle = jest.fn().mockResolvedValue({
        data: mockBudget,
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: mockSingle,
          }),
        }),
      })

      const result = await budgetService.getBudgetById('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('budgets')
      expect(result.data).toEqual(mockBudget)
      expect(result.error).toBeNull()
    })

    it('returns error when budget not found', async () => {
      const mockError = { message: 'Not found' }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      })

      const result = await budgetService.getBudgetById('invalid-id')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('createBudget', () => {
    it('creates a new budget with user_id', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const budgetData = {
        category_id: 'cat-1',
        amount: 500,
        period: 'monthly' as const,
        start_date: '2024-01-01',
      }

      const mockBudget = {
        id: '1',
        user_id: 'user-123',
        ...budgetData,
        end_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockSelect = jest.fn().mockResolvedValue({
        data: [mockBudget],
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: mockSelect,
        }),
      })

      const result = await budgetService.createBudget(budgetData)

      expect(mockSupabaseClient.auth.getUser).toHaveBeenCalled()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('budgets')
      expect(result.data).toEqual(mockBudget)
      expect(result.error).toBeNull()
    })

    it('returns error when user not authenticated', async () => {
      const budgetData = {
        category_id: 'cat-1',
        amount: 500,
        period: 'monthly' as const,
        start_date: '2024-01-01',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      })

      const result = await budgetService.createBudget(budgetData)

      expect(result.data).toBeNull()
      expect(result.error).toEqual({
        message: 'User not authenticated',
        details: 'Not authenticated',
      })
    })

    it('handles duplicate budget error', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      const budgetData = {
        category_id: 'cat-1',
        amount: 500,
        period: 'monthly' as const,
        start_date: '2024-01-01',
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const mockError = { message: 'Unique constraint violation' }

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      })

      const result = await budgetService.createBudget(budgetData)

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('updateBudget', () => {
    it('updates an existing budget', async () => {
      const updateData = {
        amount: 600,
        period: 'monthly' as const,
        start_date: '2024-01-01',
      }

      const mockUpdatedBudget = {
        id: '1',
        user_id: 'user-123',
        category_id: 'cat-1',
        ...updateData,
        end_date: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      const mockSelect = jest.fn().mockResolvedValue({
        data: [mockUpdatedBudget],
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: mockSelect,
          }),
        }),
      })

      const result = await budgetService.updateBudget('1', updateData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('budgets')
      expect(result.data).toEqual(mockUpdatedBudget)
      expect(result.error).toBeNull()
    })

    it('returns error when budget not found', async () => {
      const updateData = {
        amount: 600,
        period: 'monthly' as const,
        start_date: '2024-01-01',
      }

      const mockError = { message: 'Not found' }

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      })

      const result = await budgetService.updateBudget('invalid-id', updateData)

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('deleteBudget', () => {
    it('deletes a budget', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      })

      const result = await budgetService.deleteBudget('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('budgets')
      expect(result.error).toBeNull()
    })

    it('returns error when delete fails', async () => {
      const mockError = { message: 'Delete failed' }

      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      })

      const result = await budgetService.deleteBudget('1')

      expect(result.error).toEqual(mockError)
    })
  })

  describe('getBudgetsByCategory', () => {
    it('fetches budgets for a specific category', async () => {
      const mockBudgets = [
        {
          id: '1',
          user_id: 'user-123',
          category_id: 'cat-1',
          amount: 500,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: mockBudgets,
              error: null,
            }),
          }),
        }),
      })

      const result = await budgetService.getBudgetsByCategory('cat-1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('budgets')
      expect(result.data).toEqual(mockBudgets)
      expect(result.error).toBeNull()
    })
  })

  describe('getBudgetStatus', () => {
    it('calculates budget status with actual spending', async () => {
      const mockBudget = {
        id: '1',
        user_id: 'user-123',
        category_id: 'cat-1',
        amount: 500,
        period: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockTransactions = [
        { amount: 50, is_income: false },
        { amount: 100, is_income: false },
        { amount: 75, is_income: false },
      ]

      // Mock getBudgetById
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockBudget,
              error: null,
            }),
          }),
        }),
      })

      // Mock transaction query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: mockTransactions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await budgetService.getBudgetStatus('1')

      expect(result.data).toEqual({
        budget: mockBudget,
        spent: 225,
        remaining: 275,
        percentage: 45,
        status: 'under',
      })
      expect(result.error).toBeNull()
    })

    it('returns over budget status', async () => {
      const mockBudget = {
        id: '1',
        user_id: 'user-123',
        category_id: 'cat-1',
        amount: 500,
        period: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockTransactions = [
        { amount: 300, is_income: false },
        { amount: 250, is_income: false },
      ]

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockBudget,
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: mockTransactions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await budgetService.getBudgetStatus('1')

      expect(result.data).toEqual({
        budget: mockBudget,
        spent: 550,
        remaining: -50,
        percentage: 110,
        status: 'over',
      })
    })

    it('returns at budget status when exactly at limit', async () => {
      const mockBudget = {
        id: '1',
        user_id: 'user-123',
        category_id: 'cat-1',
        amount: 500,
        period: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockTransactions = [
        { amount: 500, is_income: false },
      ]

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockBudget,
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: mockTransactions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await budgetService.getBudgetStatus('1')

      expect(result.data?.status).toBe('at')
      expect(result.data?.percentage).toBe(100)
    })

    it('returns error when budget not found', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      })

      const result = await budgetService.getBudgetStatus('invalid-id')

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
    })

    it('excludes income transactions from spent calculation', async () => {
      const mockBudget = {
        id: '1',
        user_id: 'user-123',
        category_id: 'cat-1',
        amount: 500,
        period: 'monthly',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockTransactions = [
        { amount: 100, is_income: false },  // Should count
        { amount: 200, is_income: true },   // Should NOT count
        { amount: 50, is_income: false },   // Should count
      ]

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockBudget,
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: mockTransactions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await budgetService.getBudgetStatus('1')

      expect(result.data?.spent).toBe(150)  // Only expenses, not income
      expect(result.data?.remaining).toBe(350)
    })
  })
})

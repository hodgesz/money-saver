import { analyticsService } from '../analytics'
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

describe('analyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('getMonthlySpending', () => {
    it('calculates total spending for a specific month', async () => {
      const mockTransactions = [
        { amount: 100, is_income: false, date: '2024-01-15' },
        { amount: 250, is_income: false, date: '2024-01-20' },
        { amount: 75.50, is_income: false, date: '2024-01-25' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getMonthlySpending(2024, 1)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
      expect(result.data).toEqual({
        income: 0,
        expenses: 425.50,
        net: -425.50,
        transactionCount: 3,
        month: 1,
        year: 2024,
      })
      expect(result.error).toBeNull()
    })

    it('returns zero for empty month', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getMonthlySpending(2024, 1)

      expect(result.data).toEqual({
        income: 0, expenses: 0, net: 0,
        transactionCount: 0,
        month: 1,
        year: 2024,
      })
    })

    it('separates income and expenses correctly', async () => {
      const mockTransactions = [
        { amount: 100, is_income: false, date: '2024-01-15' },
        { amount: 500, is_income: true, date: '2024-01-16' },
        { amount: 75, is_income: false, date: '2024-01-25' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getMonthlySpending(2024, 1)

      expect(result.data?.income).toBe(500)
      expect(result.data?.expenses).toBe(175)
      expect(result.data?.net).toBe(325)
      expect(result.data?.transactionCount).toBe(3)
    })

    it('handles database errors gracefully', async () => {
      const mockError = { message: 'Database connection failed' }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      })

      const result = await analyticsService.getMonthlySpending(2024, 1)

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('handles authentication errors', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not authenticated' },
            }),
          }),
        }),
      })

      const result = await analyticsService.getMonthlySpending(2024, 1)

      expect(result.error).toBeDefined()
    })
  })

  describe('getCategoryBreakdown', () => {
    it('groups spending by category', async () => {
      const mockTransactions = [
        { category_id: 'cat-1', amount: 100, is_income: false, category: { id: 'cat-1', name: 'Category 1', color: '#3b82f6' } },
        { category_id: 'cat-1', amount: 50, is_income: false, category: { id: 'cat-1', name: 'Category 1', color: '#3b82f6' } },
        { category_id: 'cat-2', amount: 200, is_income: false, category: { id: 'cat-2', name: 'Category 2', color: '#10b981' } },
        { category_id: 'cat-3', amount: 75, is_income: false, category: { id: 'cat-3', name: 'Category 3', color: '#f59e0b' } },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: mockTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getCategoryBreakdown(2024, 1)

      expect(result.data).toEqual({
        'cat-1': { total: 150, count: 2, percentage: 35.29, name: 'Category 1', color: '#3b82f6' },
        'cat-2': { total: 200, count: 1, percentage: 47.06, name: 'Category 2', color: '#10b981' },
        'cat-3': { total: 75, count: 1, percentage: 17.65, name: 'Category 3', color: '#f59e0b' },
      })
    })

    it('returns empty object when no transactions', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getCategoryBreakdown(2024, 1)

      expect(result.data).toEqual({})
    })

    it('excludes income transactions from breakdown', async () => {
      const mockTransactions = [
        { category_id: 'cat-1', amount: 100, is_income: false, category: { id: 'cat-1', name: 'Category 1', color: '#3b82f6' } },
        { category_id: 'cat-1', amount: 500, is_income: true, category: { id: 'cat-1', name: 'Category 1', color: '#3b82f6' } }, // Should be excluded
        { category_id: 'cat-2', amount: 200, is_income: false, category: { id: 'cat-2', name: 'Category 2', color: '#10b981' } },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: mockTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getCategoryBreakdown(2024, 1)

      expect(result.data?.['cat-1'].total).toBe(100)
      expect(result.data?.['cat-1'].count).toBe(1)
    })

    it('calculates correct percentages', async () => {
      const mockTransactions = [
        { category_id: 'cat-1', amount: 500, is_income: false, category: { id: 'cat-1', name: 'Category 1', color: '#3b82f6' } }, // 50%
        { category_id: 'cat-2', amount: 300, is_income: false, category: { id: 'cat-2', name: 'Category 2', color: '#10b981' } }, // 30%
        { category_id: 'cat-3', amount: 200, is_income: false, category: { id: 'cat-3', name: 'Category 3', color: '#f59e0b' } }, // 20%
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: mockTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getCategoryBreakdown(2024, 1)

      expect(result.data?.['cat-1'].percentage).toBe(50)
      expect(result.data?.['cat-2'].percentage).toBe(30)
      expect(result.data?.['cat-3'].percentage).toBe(20)
    })

    it('handles database errors', async () => {
      const mockError = { message: 'Query failed' }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lt: jest.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getCategoryBreakdown(2024, 1)

      expect(result.error).toEqual(mockError)
    })
  })

  describe('getSpendingTrends', () => {
    it('calculates spending trends over multiple months', async () => {
      const mockTransactions = [
        { date: '2024-01-15', amount: 100, is_income: false },
        { date: '2024-01-25', amount: 150, is_income: false },
        { date: '2024-02-10', amount: 200, is_income: false },
        { date: '2024-02-20', amount: 100, is_income: false },
        { date: '2024-03-05', amount: 350, is_income: false },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockTransactions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getSpendingTrends(
        '2024-01-01',
        '2024-03-31'
      )

      expect(result.data).toEqual([
        { month: '2024-01', total: 250, count: 2 },
        { month: '2024-02', total: 300, count: 2 },
        { month: '2024-03', total: 350, count: 1 },
      ])
    })

    it('returns empty array when no data in range', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getSpendingTrends(
        '2024-01-01',
        '2024-03-31'
      )

      expect(result.data).toEqual([])
    })

    it('excludes income from trends', async () => {
      const mockTransactions = [
        { date: '2024-01-15', amount: 100, is_income: false },
        { date: '2024-01-16', amount: 500, is_income: true }, // Should be excluded
        { date: '2024-01-25', amount: 150, is_income: false },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockTransactions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getSpendingTrends(
        '2024-01-01',
        '2024-01-31'
      )

      expect(result.data?.[0].total).toBe(250)
      expect(result.data?.[0].count).toBe(2)
    })

    it('handles date range errors', async () => {
      const mockError = { message: 'Invalid date range' }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: null,
                  error: mockError,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getSpendingTrends(
        '2024-03-01',
        '2024-01-01'
      )

      expect(result.error).toEqual(mockError)
    })

    it('groups transactions correctly by month', async () => {
      const mockTransactions = [
        { date: '2024-01-01', amount: 100, is_income: false },
        { date: '2024-01-31', amount: 100, is_income: false },
        { date: '2024-02-01', amount: 100, is_income: false },
        { date: '2024-02-28', amount: 100, is_income: false },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            gte: jest.fn().mockReturnValue({
              lte: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockTransactions,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getSpendingTrends(
        '2024-01-01',
        '2024-02-29'
      )

      expect(result.data).toHaveLength(2)
      expect(result.data?.[0].month).toBe('2024-01')
      expect(result.data?.[0].total).toBe(200)
      expect(result.data?.[0].count).toBe(2)
      expect(result.data?.[1].month).toBe('2024-02')
      expect(result.data?.[1].total).toBe(200)
      expect(result.data?.[1].count).toBe(2)
    })
  })

  describe('getBudgetSummary', () => {
    it('returns summary of all budgets with spending', async () => {
      const mockBudgets = [
        {
          id: '1',
          category_id: 'cat-1',
          amount: 500,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
        {
          id: '2',
          category_id: 'cat-2',
          amount: 300,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      ]

      const mockTransactionsCat1 = [
        { amount: 250, is_income: false },
      ]

      const mockTransactionsCat2 = [
        { amount: 350, is_income: false },
      ]

      // Mock getBudgets
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockBudgets,
            error: null,
          }),
        }),
      })

      // Mock transactions for cat-1
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: mockTransactionsCat1,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      // Mock transactions for cat-2
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: mockTransactionsCat2,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getBudgetSummary()

      expect(result.data).toHaveLength(2)
      expect(result.data?.[0]).toEqual({
        budget: mockBudgets[0],
        spent: 250,
        remaining: 250,
        percentage: 50,
        status: 'under',
      })
      expect(result.data?.[1]).toEqual({
        budget: mockBudgets[1],
        spent: 350,
        remaining: -50,
        percentage: 116.67,
        status: 'over',
      })
    })

    it('returns empty array when no budgets', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const result = await analyticsService.getBudgetSummary()

      expect(result.data).toEqual([])
    })

    it('handles budgets with no transactions', async () => {
      const mockBudgets = [
        {
          id: '1',
          category_id: 'cat-1',
          amount: 500,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      ]

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockBudgets,
            error: null,
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getBudgetSummary()

      expect(result.data?.[0].spent).toBe(0)
      expect(result.data?.[0].remaining).toBe(500)
      expect(result.data?.[0].percentage).toBe(0)
      expect(result.data?.[0].status).toBe('under')
    })

    it('calculates correct percentages for all budgets', async () => {
      const mockBudgets = [
        {
          id: '1',
          category_id: 'cat-1',
          amount: 1000,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      ]

      const mockTransactions = [
        { amount: 750, is_income: false },
      ]

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockBudgets,
            error: null,
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

      const result = await analyticsService.getBudgetSummary()

      expect(result.data?.[0].percentage).toBe(75)
    })

    it('handles database errors when fetching budgets', async () => {
      const mockError = { message: 'Failed to fetch budgets' }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      })

      const result = await analyticsService.getBudgetSummary()

      expect(result.error).toEqual(mockError)
    })

    it('handles errors when fetching transactions for budgets', async () => {
      const mockBudgets = [
        {
          id: '1',
          category_id: 'cat-1',
          amount: 500,
          period: 'monthly',
          start_date: '2024-01-01',
          end_date: '2024-01-31',
        },
      ]

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockBudgets,
            error: null,
          }),
        }),
      })

      const mockError = { message: 'Transaction fetch failed' }

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: jest.fn().mockResolvedValue({
                  data: null,
                  error: mockError,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await analyticsService.getBudgetSummary()

      // Should handle error gracefully, possibly treating as 0 spending
      expect(result.data).toBeDefined()
    })
  })
})

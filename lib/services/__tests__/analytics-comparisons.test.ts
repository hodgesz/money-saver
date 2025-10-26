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

describe('analyticsService - Phase 2.3 Comparisons', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('getYearOverYearComparison', () => {
    it('calculates year-over-year spending comparison', async () => {
      // Current year (2024-03): $500
      const currentYearTransactions = [
        { amount: 300, is_income: false, date: '2024-03-10' },
        { amount: 200, is_income: false, date: '2024-03-20' },
      ]

      // Previous year (2023-03): $400
      const previousYearTransactions = [
        { amount: 250, is_income: false, date: '2023-03-15' },
        { amount: 150, is_income: false, date: '2023-03-25' },
      ]

      // Mock call for current year
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: currentYearTransactions,
              error: null,
            }),
          }),
        }),
      })

      // Mock call for previous year
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: previousYearTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getYearOverYearComparison(2024, 3)

      expect(result.data).toEqual({
        current: {
          income: 0,
          expenses: 500,
          net: -500,
          transactionCount: 2,
          month: 3,
          year: 2024,
        },
        previous: {
          income: 0,
          expenses: 400,
          net: -400,
          transactionCount: 2,
          month: 3,
          year: 2023,
        },
        percentChange: 25, // (500 - 400) / 400 * 100
        trend: 'increasing',
      })
      expect(result.error).toBeNull()
    })

    it('returns decreasing trend when spending decreased', async () => {
      // Current: $300
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [{ amount: 300, is_income: false, date: '2024-03-10' }],
              error: null,
            }),
          }),
        }),
      })

      // Previous: $500
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [{ amount: 500, is_income: false, date: '2023-03-10' }],
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getYearOverYearComparison(2024, 3)

      expect(result.data?.percentChange).toBe(-40) // (300 - 500) / 500 * 100
      expect(result.data?.trend).toBe('decreasing')
    })

    it('handles no previous year data', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [{ amount: 300, is_income: false, date: '2024-03-10' }],
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getYearOverYearComparison(2024, 3)

      expect(result.data?.percentChange).toBe(0)
      expect(result.data?.trend).toBe('no-data')
    })

    it('returns stable trend when spending unchanged', async () => {
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [{ amount: 500, is_income: false, date: '2024-03-10' }],
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [{ amount: 500, is_income: false, date: '2023-03-10' }],
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getYearOverYearComparison(2024, 3)

      expect(result.data?.percentChange).toBe(0)
      expect(result.data?.trend).toBe('stable')
    })
  })

  describe('getMonthOverMonthComparison', () => {
    it('calculates month-over-month spending comparison', async () => {
      // Current month (2024-03): $600
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [{ amount: 600, is_income: false, date: '2024-03-15' }],
              error: null,
            }),
          }),
        }),
      })

      // Previous month (2024-02): $500
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [{ amount: 500, is_income: false, date: '2024-02-15' }],
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getMonthOverMonthComparison(2024, 3)

      expect(result.data?.current.expenses).toBe(600)
      expect(result.data?.previous.expenses).toBe(500)
      expect(result.data?.percentChange).toBe(20) // (600 - 500) / 500 * 100
      expect(result.data?.trend).toBe('increasing')
    })

    it('handles year boundary correctly (Jan to Dec)', async () => {
      // Current: January 2024
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [{ amount: 400, is_income: false, date: '2024-01-15' }],
              error: null,
            }),
          }),
        }),
      })

      // Previous: December 2023
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lt: jest.fn().mockResolvedValue({
              data: [{ amount: 500, is_income: false, date: '2023-12-15' }],
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getMonthOverMonthComparison(2024, 1)

      expect(result.data?.current.year).toBe(2024)
      expect(result.data?.current.month).toBe(1)
      expect(result.data?.previous.year).toBe(2023)
      expect(result.data?.previous.month).toBe(12)
      expect(result.data?.percentChange).toBe(-20)
    })
  })

  describe('getSavingsRate', () => {
    it('calculates savings rate correctly', async () => {
      const mockTransactions = [
        { amount: 5000, is_income: true, date: '2024-03-01' },
        { amount: 3000, is_income: false, date: '2024-03-10' },
        { amount: 500, is_income: false, date: '2024-03-15' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getSavingsRate('2024-03-01', '2024-03-31')

      // Income: $5000, Expenses: $3500, Savings: $1500
      // Savings Rate: (1500 / 5000) * 100 = 30%
      expect(result.data).toEqual({
        savingsRate: 30,
        totalIncome: 5000,
        totalExpenses: 3500,
        netSavings: 1500,
      })
      expect(result.error).toBeNull()
    })

    it('returns 0% savings rate when income equals expenses', async () => {
      const mockTransactions = [
        { amount: 1000, is_income: true, date: '2024-03-01' },
        { amount: 1000, is_income: false, date: '2024-03-10' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getSavingsRate('2024-03-01', '2024-03-31')

      expect(result.data?.savingsRate).toBe(0)
      expect(result.data?.netSavings).toBe(0)
    })

    it('returns negative savings rate when expenses exceed income', async () => {
      const mockTransactions = [
        { amount: 1000, is_income: true, date: '2024-03-01' },
        { amount: 1500, is_income: false, date: '2024-03-10' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getSavingsRate('2024-03-01', '2024-03-31')

      // Savings: -$500, Rate: (-500 / 1000) * 100 = -50%
      expect(result.data?.savingsRate).toBe(-50)
      expect(result.data?.netSavings).toBe(-500)
    })

    it('returns 0% when no income', async () => {
      const mockTransactions = [
        { amount: 500, is_income: false, date: '2024-03-10' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getSavingsRate('2024-03-01', '2024-03-31')

      expect(result.data?.savingsRate).toBe(0)
      expect(result.data?.totalIncome).toBe(0)
    })

    it('returns 100% savings rate when no expenses', async () => {
      const mockTransactions = [
        { amount: 5000, is_income: true, date: '2024-03-01' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getSavingsRate('2024-03-01', '2024-03-31')

      expect(result.data?.savingsRate).toBe(100)
      expect(result.data?.netSavings).toBe(5000)
    })

    it('handles multiple income and expense transactions', async () => {
      const mockTransactions = [
        { amount: 3000, is_income: true, date: '2024-03-01' },
        { amount: 2000, is_income: true, date: '2024-03-15' },
        { amount: 1000, is_income: false, date: '2024-03-05' },
        { amount: 500, is_income: false, date: '2024-03-10' },
        { amount: 500, is_income: false, date: '2024-03-20' },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockResolvedValue({
              data: mockTransactions,
              error: null,
            }),
          }),
        }),
      })

      const result = await analyticsService.getSavingsRate('2024-03-01', '2024-03-31')

      // Income: $5000, Expenses: $2000, Savings: $3000
      // Rate: (3000 / 5000) * 100 = 60%
      expect(result.data?.totalIncome).toBe(5000)
      expect(result.data?.totalExpenses).toBe(2000)
      expect(result.data?.netSavings).toBe(3000)
      expect(result.data?.savingsRate).toBe(60)
    })
  })
})

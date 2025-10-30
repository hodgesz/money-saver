/**
 * Analytics Charts Service Tests
 * Phase 2.3: Charts & Visualizations
 *
 * Tests for:
 * - Monthly Spending Trends (bar chart data)
 * - Category Comparison Over Time (line chart data)
 * - Income vs Expenses Timeline (area chart data)
 */

import { analyticsService } from '../analytics'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

const mockSupabase = {
  from: jest.fn(),
  auth: {
    getUser: jest.fn(),
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  ;(createClient as jest.Mock).mockReturnValue(mockSupabase)

  // Mock authenticated user
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id' } },
    error: null,
  })
})

describe('analyticsService - Charts & Visualizations', () => {
  describe('getMonthlySpendingTrends', () => {
    it('should return monthly spending trends with income and expenses', async () => {
      // Arrange: Mock transactions for multiple months
      const mockTransactions = [
        // January 2024
        { id: '1', date: '2024-01-15T00:00:00Z', amount: 1000, is_income: true },
        { id: '2', date: '2024-01-20T00:00:00Z', amount: 500, is_income: false },
        { id: '3', date: '2024-01-25T00:00:00Z', amount: 300, is_income: false },
        // February 2024
        { id: '4', date: '2024-02-10T00:00:00Z', amount: 1200, is_income: true },
        { id: '5', date: '2024-02-15T00:00:00Z', amount: 600, is_income: false },
        // March 2024
        { id: '6', date: '2024-03-05T00:00:00Z', amount: 1100, is_income: true },
        { id: '7', date: '2024-03-10T00:00:00Z', amount: 700, is_income: false },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await analyticsService.getMonthlySpendingTrends('2024-01-01', '2024-03-31')

      // Assert
      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(3)

      // Check January
      expect(result.data![0]).toEqual({
        month: '2024-01',
        monthLabel: 'Jan 2024',
        income: 1000,
        expenses: 800,
        net: 200,
        transactionCount: 3,
      })

      // Check February
      expect(result.data![1]).toEqual({
        month: '2024-02',
        monthLabel: 'Feb 2024',
        income: 1200,
        expenses: 600,
        net: 600,
        transactionCount: 2,
      })

      // Check March
      expect(result.data![2]).toEqual({
        month: '2024-03',
        monthLabel: 'Mar 2024',
        income: 1100,
        expenses: 700,
        net: 400,
        transactionCount: 2,
      })
    })

    it('should return empty array when no transactions exist', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await analyticsService.getMonthlySpendingTrends('2024-01-01', '2024-12-31')

      // Assert
      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockError = { message: 'Database connection failed' }
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await analyticsService.getMonthlySpendingTrends('2024-01-01', '2024-12-31')

      // Assert
      expect(result.error).toEqual(mockError)
      expect(result.data).toBeNull()
    })

    it('should sort months chronologically', async () => {
      // Arrange: Unsorted transactions
      const mockTransactions = [
        { id: '1', date: '2024-03-15T00:00:00Z', amount: 1100, is_income: true },
        { id: '2', date: '2024-01-15T00:00:00Z', amount: 1000, is_income: true },
        { id: '3', date: '2024-02-10T00:00:00Z', amount: 1200, is_income: true },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await analyticsService.getMonthlySpendingTrends('2024-01-01', '2024-03-31')

      // Assert
      expect(result.data).toHaveLength(3)
      expect(result.data![0].month).toBe('2024-01')
      expect(result.data![1].month).toBe('2024-02')
      expect(result.data![2].month).toBe('2024-03')
    })
  })

  describe('getCategoryTrends', () => {
    it('should return category spending trends over time', async () => {
      // Arrange: Mock transactions with categories across months
      const mockTransactions = [
        // January - Groceries
        { id: '1', date: '2024-01-15T00:00:00Z', amount: 300, is_income: false, category_id: 'cat-1', category: { name: 'Groceries', color: '#10b981' } },
        { id: '2', date: '2024-01-20T00:00:00Z', amount: 200, is_income: false, category_id: 'cat-1', category: { name: 'Groceries', color: '#10b981' } },
        // January - Dining
        { id: '3', date: '2024-01-25T00:00:00Z', amount: 150, is_income: false, category_id: 'cat-2', category: { name: 'Dining', color: '#f59e0b' } },
        // February - Groceries
        { id: '4', date: '2024-02-10T00:00:00Z', amount: 350, is_income: false, category_id: 'cat-1', category: { name: 'Groceries', color: '#10b981' } },
        // February - Dining
        { id: '5', date: '2024-02-15T00:00:00Z', amount: 200, is_income: false, category_id: 'cat-2', category: { name: 'Dining', color: '#f59e0b' } },
      ]

      mockSupabase.from.mockReturnValue({
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

      // Act
      const result = await analyticsService.getCategoryTrends('2024-01-01', '2024-02-28')

      // Assert
      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)

      // Check data structure
      const monthlyData = result.data!
      expect(monthlyData[0]).toEqual({
        month: '2024-01',
        monthLabel: 'Jan 2024',
        categories: {
          'cat-1': { name: 'Groceries', total: 500, color: '#10b981' },
          'cat-2': { name: 'Dining', total: 150, color: '#f59e0b' },
        },
      })

      expect(monthlyData[1]).toEqual({
        month: '2024-02',
        monthLabel: 'Feb 2024',
        categories: {
          'cat-1': { name: 'Groceries', total: 350, color: '#10b981' },
          'cat-2': { name: 'Dining', total: 200, color: '#f59e0b' },
        },
      })
    })

    it('should handle uncategorized transactions', async () => {
      // Arrange
      const mockTransactions = [
        { id: '1', date: '2024-01-15T00:00:00Z', amount: 100, is_income: false, category_id: null, category: null },
      ]

      mockSupabase.from.mockReturnValue({
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

      // Act
      const result = await analyticsService.getCategoryTrends('2024-01-01', '2024-01-31')

      // Assert
      expect(result.error).toBeNull()
      expect(result.data![0].categories['uncategorized']).toEqual({
        name: 'Uncategorized',
        total: 100,
        color: '#6b7280',
      })
    })

    it('should return empty array when no transactions exist', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
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

      // Act
      const result = await analyticsService.getCategoryTrends('2024-01-01', '2024-12-31')

      // Assert
      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockError = { message: 'Database query failed' }
      mockSupabase.from.mockReturnValue({
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

      // Act
      const result = await analyticsService.getCategoryTrends('2024-01-01', '2024-12-31')

      // Assert
      expect(result.error).toEqual(mockError)
      expect(result.data).toBeNull()
    })
  })

  describe('getIncomeExpenseTimeline', () => {
    it('should return income and expense timeline data', async () => {
      // Arrange: Mock transactions with both income and expenses
      const mockTransactions = [
        // January
        { id: '1', date: '2024-01-15T00:00:00Z', amount: 3000, is_income: true },
        { id: '2', date: '2024-01-20T00:00:00Z', amount: 1200, is_income: false },
        { id: '3', date: '2024-01-25T00:00:00Z', amount: 800, is_income: false },
        // February
        { id: '4', date: '2024-02-10T00:00:00Z', amount: 3200, is_income: true },
        { id: '5', date: '2024-02-15T00:00:00Z', amount: 1500, is_income: false },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await analyticsService.getIncomeExpenseTimeline('2024-01-01', '2024-02-28')

      // Assert
      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(2)

      // Check January
      expect(result.data![0]).toEqual({
        month: '2024-01',
        monthLabel: 'Jan 2024',
        income: 3000,
        expenses: 2000,
        net: 1000,
      })

      // Check February
      expect(result.data![1]).toEqual({
        month: '2024-02',
        monthLabel: 'Feb 2024',
        income: 3200,
        expenses: 1500,
        net: 1700,
      })
    })

    it('should handle months with only income', async () => {
      // Arrange
      const mockTransactions = [
        { id: '1', date: '2024-01-15T00:00:00Z', amount: 5000, is_income: true },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await analyticsService.getIncomeExpenseTimeline('2024-01-01', '2024-01-31')

      // Assert
      expect(result.error).toBeNull()
      expect(result.data![0]).toEqual({
        month: '2024-01',
        monthLabel: 'Jan 2024',
        income: 5000,
        expenses: 0,
        net: 5000,
      })
    })

    it('should handle months with only expenses', async () => {
      // Arrange
      const mockTransactions = [
        { id: '1', date: '2024-01-20T00:00:00Z', amount: 1000, is_income: false },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await analyticsService.getIncomeExpenseTimeline('2024-01-01', '2024-01-31')

      // Assert
      expect(result.error).toBeNull()
      expect(result.data![0]).toEqual({
        month: '2024-01',
        monthLabel: 'Jan 2024',
        income: 0,
        expenses: 1000,
        net: -1000,
      })
    })

    it('should return empty array when no transactions exist', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await analyticsService.getIncomeExpenseTimeline('2024-01-01', '2024-12-31')

      // Assert
      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    it('should handle database errors gracefully', async () => {
      // Arrange
      const mockError = { message: 'Connection timeout' }
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await analyticsService.getIncomeExpenseTimeline('2024-01-01', '2024-12-31')

      // Assert
      expect(result.error).toEqual(mockError)
      expect(result.data).toBeNull()
    })

    it('should correctly calculate net (income - expenses)', async () => {
      // Arrange
      const mockTransactions = [
        { id: '1', date: '2024-01-15T00:00:00Z', amount: 2000, is_income: true },
        { id: '2', date: '2024-01-20T00:00:00Z', amount: 2500, is_income: false },
      ]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnValue({
            lte: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: mockTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await analyticsService.getIncomeExpenseTimeline('2024-01-01', '2024-01-31')

      // Assert
      expect(result.data![0].net).toBe(-500) // Negative net (spending more than earning)
    })
  })
})

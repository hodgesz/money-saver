import { alertDetectionService } from '../alertDetection'
import { createClient } from '@/lib/supabase/client'
import type { Transaction, Budget, Alert } from '@/types'

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

describe('alertDetectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('checkLargePurchaseAlert', () => {
    const mockTransaction: Transaction = {
      id: 'txn-1',
      user_id: 'user-123',
      amount: 150.00,
      date: '2024-01-15T10:00:00Z',
      category_id: 'cat-1',
      description: 'Large purchase',
      merchant: 'Best Buy',
      is_income: false,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    }

    it('returns null when large_purchase alert is disabled', async () => {
      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'large_purchase',
        threshold: 100.00,
        is_enabled: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAlert,
              error: null,
            }),
          }),
        }),
      })

      const result = await alertDetectionService.checkLargePurchaseAlert(mockTransaction)

      expect(result.data).toBeNull()
    })

    it('returns null when no large_purchase alert exists', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      })

      const result = await alertDetectionService.checkLargePurchaseAlert(mockTransaction)

      expect(result.data).toBeNull()
    })

    it('returns null when transaction amount is below threshold', async () => {
      const smallTransaction: Transaction = {
        ...mockTransaction,
        amount: 50.00,
      }

      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'large_purchase',
        threshold: 100.00,
        is_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAlert,
              error: null,
            }),
          }),
        }),
      })

      const result = await alertDetectionService.checkLargePurchaseAlert(smallTransaction)

      expect(result.data).toBeNull()
    })

    it('creates alert event when transaction exceeds threshold', async () => {
      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'large_purchase',
        threshold: 100.00,
        is_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockAlertEvent = {
        id: 'event-1',
        user_id: 'user-123',
        alert_id: 'alert-1',
        transaction_id: 'txn-1',
        budget_id: null,
        type: 'large_purchase',
        message: 'Large purchase detected: $150.00 at Best Buy',
        severity: 'medium',
        is_read: false,
        metadata: {
          amount: 150.00,
          threshold: 100.00,
          merchant: 'Best Buy',
        },
        created_at: '2024-01-15T10:00:00Z',
      }

      // Mock alert settings lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAlert,
              error: null,
            }),
          }),
        }),
      })

      // Mock alert event creation
      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAlertEvent,
              error: null,
            }),
          }),
        }),
      })

      const result = await alertDetectionService.checkLargePurchaseAlert(mockTransaction)

      expect(result.data).toEqual(mockAlertEvent)
      expect(result.data?.message).toContain('$150.00')
      expect(result.data?.severity).toBe('medium')
    })

    it('returns null for income transactions', async () => {
      const incomeTransaction: Transaction = {
        ...mockTransaction,
        amount: 200.00,
        is_income: true,
      }

      const result = await alertDetectionService.checkLargePurchaseAlert(incomeTransaction)

      expect(result.data).toBeNull()
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })

    it('uses high severity for purchases 2x threshold', async () => {
      const veryLargeTransaction: Transaction = {
        ...mockTransaction,
        amount: 250.00,
      }

      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'large_purchase',
        threshold: 100.00,
        is_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockAlertEvent = {
        id: 'event-1',
        user_id: 'user-123',
        alert_id: 'alert-1',
        transaction_id: 'txn-1',
        budget_id: null,
        type: 'large_purchase',
        message: 'Large purchase detected: $250.00',
        severity: 'high',
        is_read: false,
        metadata: { amount: 250.00, threshold: 100.00 },
        created_at: '2024-01-15T10:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAlert,
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAlertEvent,
              error: null,
            }),
          }),
        }),
      })

      const result = await alertDetectionService.checkLargePurchaseAlert(veryLargeTransaction)

      expect(result.data?.severity).toBe('high')
    })
  })

  describe('checkBudgetWarningAlert', () => {
    const mockBudget: Budget = {
      id: 'budget-1',
      user_id: 'user-123',
      category_id: 'cat-1',
      amount: 500.00,
      period: 'monthly',
      start_date: '2024-01-01',
      end_date: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('returns null when budget_warning alert is disabled', async () => {
      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'budget_warning',
        threshold: 80.00,
        is_enabled: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAlert,
              error: null,
            }),
          }),
        }),
      })

      const result = await alertDetectionService.checkBudgetWarningAlert('budget-1')

      expect(result.data).toBeNull()
    })

    it('returns null when spending is below threshold', async () => {
      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'budget_warning',
        threshold: 80.00,
        is_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      let callCount = 0

      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        if (callCount === 1) {
          // First call: alert settings
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAlert,
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          // Second call: budget lookup
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockBudget,
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Third call: transactions
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    lte: jest.fn().mockResolvedValue({
                      data: [{ amount: 375.00 }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        }
      })

      const result = await alertDetectionService.checkBudgetWarningAlert('budget-1')

      expect(result.data).toBeNull()
    })

    it('creates alert event when spending reaches threshold', async () => {
      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'budget_warning',
        threshold: 80.00,
        is_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockAlertEvent = {
        id: 'event-1',
        user_id: 'user-123',
        alert_id: 'alert-1',
        transaction_id: null,
        budget_id: 'budget-1',
        type: 'budget_warning',
        message: 'Budget warning: 85% spent ($425.00 of $500.00)',
        severity: 'medium',
        is_read: false,
        metadata: {
          budgetId: 'budget-1',
          spent: 425.00,
          limit: 500.00,
          percentage: 85,
        },
        created_at: '2024-01-15T10:00:00Z',
      }

      let callCount = 0

      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        if (callCount === 1) {
          // First call: alert settings
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAlert,
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          // Second call: budget lookup
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockBudget,
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 3) {
          // Third call: transactions
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    lte: jest.fn().mockResolvedValue({
                      data: [{ amount: 425.00 }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        } else {
          // Fourth call: create alert event
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAlertEvent,
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      const result = await alertDetectionService.checkBudgetWarningAlert('budget-1')

      expect(result.data).toEqual(mockAlertEvent)
      expect(result.data?.severity).toBe('medium')
    })

    it('uses high severity when budget is exceeded', async () => {
      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'budget_warning',
        threshold: 80.00,
        is_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockAlertEvent = {
        id: 'event-1',
        user_id: 'user-123',
        alert_id: 'alert-1',
        transaction_id: null,
        budget_id: 'budget-1',
        type: 'budget_warning',
        message: 'Budget exceeded: 110% spent ($550.00 of $500.00)',
        severity: 'high',
        is_read: false,
        metadata: {
          budgetId: 'budget-1',
          spent: 550.00,
          limit: 500.00,
          percentage: 110,
        },
        created_at: '2024-01-15T10:00:00Z',
      }

      let callCount = 0

      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAlert,
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockBudget,
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 3) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockReturnValue({
                    lte: jest.fn().mockResolvedValue({
                      data: [{ amount: 550.00 }],
                      error: null,
                    }),
                  }),
                }),
              }),
            }),
          }
        } else {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAlertEvent,
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      const result = await alertDetectionService.checkBudgetWarningAlert('budget-1')

      expect(result.data?.severity).toBe('high')
    })
  })

  describe('calculateBudgetStatus', () => {
    const mockBudget: Budget = {
      id: 'budget-1',
      user_id: 'user-123',
      category_id: 'cat-1',
      amount: 500.00,
      period: 'monthly',
      start_date: '2024-01-01',
      end_date: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    }

    it('calculates budget status correctly', async () => {
      // Mock budget lookup
      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockBudget,
          error: null,
        }),
      })

      // Mock transactions query
      const mockLte = jest.fn().mockResolvedValue({
        data: [{ amount: 375.00 }],
        error: null,
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockReturnValue({
                lte: mockLte,
              }),
            }),
          }),
        }),
      })

      const result = await alertDetectionService.calculateBudgetStatus('budget-1')

      expect(result.data).toEqual({
        spent: 375.00,
        limit: 500.00,
        percentage: 75,
      })
    })

    it('handles zero spending', async () => {
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
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await alertDetectionService.calculateBudgetStatus('budget-1')

      expect(result.data).toEqual({
        spent: 0,
        limit: 500.00,
        percentage: 0,
      })
    })

    it('handles budget not found', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116' },
            }),
          }),
        }),
      })

      const result = await alertDetectionService.calculateBudgetStatus('nonexistent')

      expect(result.data).toBeNull()
    })

    it('calculates percentage over 100% correctly', async () => {
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
                  data: [{ amount: 650.00 }], // 130% of 500
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const result = await alertDetectionService.calculateBudgetStatus('budget-1')

      expect(result.data).toEqual({
        spent: 650.00,
        limit: 500.00,
        percentage: 130,
      })
    })
  })

  describe('detectAnomalies', () => {
    const mockTransaction: Transaction = {
      id: 'txn-1',
      user_id: 'user-123',
      amount: 500.00,
      date: '2024-01-15T10:00:00Z',
      category_id: 'cat-1',
      description: 'Large unusual purchase',
      merchant: 'Unknown Merchant',
      is_income: false,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    }

    it('returns false when insufficient historical data', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await alertDetectionService.detectAnomalies(mockTransaction)

      expect(result.data).toBe(false)
    })

    it('returns false when transaction is within normal range', async () => {
      // Historical transactions with similar amounts
      const historicalTransactions = Array(10).fill(null).map((_, i) => ({
        amount: 45 + (i * 5), // 45, 50, 55, 60, etc.
      }))

      const normalTransaction: Transaction = {
        ...mockTransaction,
        amount: 55.00,
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: historicalTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await alertDetectionService.detectAnomalies(normalTransaction)

      expect(result.data).toBe(false)
    })

    it('returns true when transaction is anomalous (3+ standard deviations)', async () => {
      // Historical transactions with consistent low amounts
      const historicalTransactions = Array(20).fill(null).map(() => ({
        amount: 50.00,
      }))

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              gte: jest.fn().mockResolvedValue({
                data: historicalTransactions,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await alertDetectionService.detectAnomalies(mockTransaction)

      expect(result.data).toBe(true)
    })

    it('returns false for income transactions', async () => {
      const incomeTransaction: Transaction = {
        ...mockTransaction,
        is_income: true,
      }

      const result = await alertDetectionService.detectAnomalies(incomeTransaction)

      expect(result.data).toBe(false)
      expect(mockSupabaseClient.from).not.toHaveBeenCalled()
    })
  })

  describe('checkAnomalyAlert', () => {
    const mockTransaction: Transaction = {
      id: 'txn-1',
      user_id: 'user-123',
      amount: 500.00,
      date: '2024-01-15T10:00:00Z',
      category_id: 'cat-1',
      description: 'Anomalous purchase',
      merchant: 'Unknown',
      is_income: false,
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-15T10:00:00Z',
    }

    it('returns null when anomaly alert is disabled', async () => {
      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'anomaly',
        threshold: null,
        is_enabled: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockAlert,
              error: null,
            }),
          }),
        }),
      }))

      const result = await alertDetectionService.checkAnomalyAlert(mockTransaction)

      expect(result.data).toBeNull()
    })

    it('returns null when no anomaly detected', async () => {
      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'anomaly',
        threshold: null,
        is_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      let callCount = 0

      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          // First call: get alert settings
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAlert,
                  error: null,
                }),
              }),
            }),
          }
        } else {
          // Second call: get historical transactions
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({
                    data: Array(20).fill({ amount: 50.00 }),
                    error: null,
                  }),
                }),
              }),
            }),
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      const normalTransaction: Transaction = {
        ...mockTransaction,
        amount: 55.00,
      }

      const result = await alertDetectionService.checkAnomalyAlert(normalTransaction)

      expect(result.data).toBeNull()
    })

    it('creates alert event when anomaly is detected', async () => {
      const mockAlert: Alert = {
        id: 'alert-1',
        user_id: 'user-123',
        type: 'anomaly',
        threshold: null,
        is_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockAlertEvent = {
        id: 'event-1',
        user_id: 'user-123',
        alert_id: 'alert-1',
        transaction_id: 'txn-1',
        budget_id: null,
        type: 'anomaly',
        message: 'Unusual spending detected: $500.00 at Unknown',
        severity: 'medium',
        is_read: false,
        metadata: {
          amount: 500.00,
          merchant: 'Unknown',
        },
        created_at: '2024-01-15T10:00:00Z',
      }

      let callCount = 0

      mockSupabaseClient.from.mockImplementation(() => {
        callCount++

        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAlert,
                  error: null,
                }),
              }),
            }),
          }
        } else if (callCount === 2) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  gte: jest.fn().mockResolvedValue({
                    data: Array(20).fill({ amount: 50.00 }),
                    error: null,
                  }),
                }),
              }),
            }),
          }
        } else {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockAlertEvent,
                  error: null,
                }),
              }),
            }),
          }
        }
      })

      const result = await alertDetectionService.checkAnomalyAlert(mockTransaction)

      expect(result.data).toEqual(mockAlertEvent)
      expect(result.data?.message).toContain('Unusual spending')
    })
  })
})

import { createClient } from '@/lib/supabase/client'
import { transactionService } from '../transactions'
import { alertDetectionService } from '../alertDetection'
import type { Transaction, TransactionFormData } from '@/types'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

// Mock alert detection service
jest.mock('../alertDetection', () => ({
  alertDetectionService: {
    checkLargePurchaseAlert: jest.fn(),
    checkAnomalyAlert: jest.fn(),
    checkBudgetWarningAlert: jest.fn(),
  },
}))

describe('Transaction Service', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)

    // Reset alert detection mocks
    ;(alertDetectionService.checkLargePurchaseAlert as jest.Mock).mockResolvedValue({ data: null, error: null })
    ;(alertDetectionService.checkAnomalyAlert as jest.Mock).mockResolvedValue({ data: null, error: null })
    ;(alertDetectionService.checkBudgetWarningAlert as jest.Mock).mockResolvedValue({ data: null, error: null })
  })

  describe('getTransactions', () => {
    it('should fetch transactions with default ordering', async () => {
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          user_id: 'user-123',
          date: '2024-01-15T00:00:00Z',
          amount: 50.00,
          merchant: 'Grocery Store',
          description: 'Weekly groceries',
          category_id: 'cat-1',
          account_id: null,
          receipt_url: null,
          is_income: false,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          user_id: 'user-123',
          date: '2024-01-14T00:00:00Z',
          amount: 1200.00,
          merchant: 'Employer',
          description: 'Salary',
          category_id: 'cat-income',
          account_id: null,
          receipt_url: null,
          is_income: true,
          created_at: '2024-01-14T10:00:00Z',
          updated_at: '2024-01-14T10:00:00Z',
        },
      ]

      mockSupabaseClient.order.mockResolvedValue({
        data: mockTransactions,
        error: null,
      })

      const result = await transactionService.getTransactions()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('date', { ascending: false })
      expect(result.data).toEqual(mockTransactions)
      expect(result.error).toBeNull()
    })

    it('should handle errors when fetching transactions', async () => {
      const mockError = { message: 'Database connection failed' }

      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await transactionService.getTransactions()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('getTransactionsWithFilters', () => {
    it('should filter transactions by date range', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      }

      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      })

      await transactionService.getTransactionsWithFilters(filters)

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('date', '2024-01-01')
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('date', '2024-01-31')
    })

    it('should filter transactions by category', async () => {
      const filters = {
        categoryId: 'cat-groceries',
      }

      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      })

      await transactionService.getTransactionsWithFilters(filters)

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('category_id', 'cat-groceries')
    })

    it('should search transactions by description or merchant', async () => {
      const filters = {
        search: 'grocery',
      }

      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      })

      await transactionService.getTransactionsWithFilters(filters)

      expect(mockSupabaseClient.ilike).toHaveBeenCalledWith('description', '%grocery%')
    })

    it('should support pagination', async () => {
      const filters = {
        page: 2,
        limit: 50,
      }

      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      })

      await transactionService.getTransactionsWithFilters(filters)

      // page 2, limit 50 means range(50, 99)
      expect(mockSupabaseClient.range).toHaveBeenCalledWith(50, 99)
    })

    it('should apply multiple filters together', async () => {
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        categoryId: 'cat-groceries',
        search: 'store',
        page: 1,
        limit: 25,
      }

      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      })

      await transactionService.getTransactionsWithFilters(filters)

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('date', '2024-01-01')
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('date', '2024-01-31')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('category_id', 'cat-groceries')
      expect(mockSupabaseClient.ilike).toHaveBeenCalledWith('description', '%store%')
      expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 24)
    })
  })

  describe('getTransactionById', () => {
    it('should fetch a single transaction by ID', async () => {
      const mockTransaction: Transaction = {
        id: '1',
        user_id: 'user-123',
        date: '2024-01-15T00:00:00Z',
        amount: 50.00,
        merchant: 'Grocery Store',
        description: 'Weekly groceries',
        category_id: 'cat-1',
        account_id: null,
        receipt_url: null,
        is_income: false,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: mockTransaction,
        error: null,
      })

      const result = await transactionService.getTransactionById('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1')
      expect(mockSupabaseClient.single).toHaveBeenCalled()
      expect(result.data).toEqual(mockTransaction)
      expect(result.error).toBeNull()
    })

    it('should handle errors when transaction not found', async () => {
      const mockError = { message: 'Transaction not found', code: 'PGRST116' }

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await transactionService.getTransactionById('nonexistent-id')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('createTransaction', () => {
    it('should create a new transaction', async () => {
      const transactionData: TransactionFormData = {
        date: '2024-01-15',
        amount: 50.00,
        merchant: 'Coffee Shop',
        description: 'Morning coffee',
        category_id: 'cat-dining',
      }

      const mockCreatedTransaction: Transaction = {
        id: 'new-id',
        user_id: 'user-123',
        date: '2024-01-15T00:00:00Z',
        amount: 50.00,
        merchant: 'Coffee Shop',
        description: 'Morning coffee',
        category_id: 'cat-dining',
        account_id: null,
        receipt_url: null,
        is_income: false,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: [mockCreatedTransaction],
        error: null,
      })

      const result = await transactionService.createTransaction(transactionData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([{
        ...transactionData,
        user_id: 'user-123',
      }])
      expect(mockSupabaseClient.select).toHaveBeenCalled()
      expect(result.data).toEqual(mockCreatedTransaction)
      expect(result.error).toBeNull()
    })

    it('should handle validation errors', async () => {
      const invalidData: TransactionFormData = {
        date: '2024-01-15',
        amount: -50.00, // Invalid negative amount
        description: 'Test',
        category_id: 'cat-1',
      }

      const mockError = {
        message: 'Amount must be positive',
        code: 'VALIDATION_ERROR',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await transactionService.createTransaction(invalidData)

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('should trigger alert detection after creating transaction', async () => {
      const transactionData: TransactionFormData = {
        date: '2024-01-15',
        amount: 150.00, // Large purchase
        merchant: 'Electronics Store',
        description: 'New laptop',
        category_id: 'cat-electronics',
      }

      const mockCreatedTransaction: Transaction = {
        id: 'new-id',
        user_id: 'user-123',
        date: '2024-01-15T00:00:00Z',
        amount: 150.00,
        merchant: 'Electronics Store',
        description: 'New laptop',
        category_id: 'cat-electronics',
        account_id: null,
        receipt_url: null,
        is_income: false,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: [mockCreatedTransaction],
        error: null,
      })

      await transactionService.createTransaction(transactionData)

      // Verify alert detection was called with the created transaction
      expect(alertDetectionService.checkLargePurchaseAlert).toHaveBeenCalledWith(mockCreatedTransaction)
      expect(alertDetectionService.checkAnomalyAlert).toHaveBeenCalledWith(mockCreatedTransaction)
      expect(alertDetectionService.checkBudgetWarningAlert).toHaveBeenCalledWith('cat-electronics')
    })

    it('should still create transaction even if alert detection fails', async () => {
      const transactionData: TransactionFormData = {
        date: '2024-01-15',
        amount: 200.00,
        merchant: 'Store',
        description: 'Purchase',
        category_id: 'cat-1',
      }

      const mockCreatedTransaction: Transaction = {
        id: 'new-id',
        user_id: 'user-123',
        date: '2024-01-15T00:00:00Z',
        amount: 200.00,
        merchant: 'Store',
        description: 'Purchase',
        category_id: 'cat-1',
        account_id: null,
        receipt_url: null,
        is_income: false,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: [mockCreatedTransaction],
        error: null,
      })

      // Mock alert detection to throw error
      ;(alertDetectionService.checkLargePurchaseAlert as jest.Mock).mockRejectedValue(
        new Error('Alert service unavailable')
      )

      const result = await transactionService.createTransaction(transactionData)

      // Transaction should still be created successfully
      expect(result.data).toEqual(mockCreatedTransaction)
      expect(result.error).toBeNull()
    })

    it('should not trigger alert detection if transaction creation fails', async () => {
      const transactionData: TransactionFormData = {
        date: '2024-01-15',
        amount: 50.00,
        merchant: 'Store',
        description: 'Purchase',
        category_id: 'cat-1',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: null,
        error: { message: 'Insert failed' },
      })

      await transactionService.createTransaction(transactionData)

      // Alert detection should not be called if transaction creation failed
      expect(alertDetectionService.checkLargePurchaseAlert).not.toHaveBeenCalled()
      expect(alertDetectionService.checkAnomalyAlert).not.toHaveBeenCalled()
      expect(alertDetectionService.checkBudgetWarningAlert).not.toHaveBeenCalled()
    })

    it('should not check budget warnings if transaction has no category', async () => {
      const transactionData: TransactionFormData = {
        date: '2024-01-15',
        amount: 50.00,
        merchant: 'Store',
        description: 'Purchase',
        category_id: null,
      }

      const mockCreatedTransaction: Transaction = {
        id: 'new-id',
        user_id: 'user-123',
        date: '2024-01-15T00:00:00Z',
        amount: 50.00,
        merchant: 'Store',
        description: 'Purchase',
        category_id: null,
        account_id: null,
        receipt_url: null,
        is_income: false,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T10:00:00Z',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: [mockCreatedTransaction],
        error: null,
      })

      await transactionService.createTransaction(transactionData)

      // Should check purchase and anomaly alerts but not budget warnings
      expect(alertDetectionService.checkLargePurchaseAlert).toHaveBeenCalled()
      expect(alertDetectionService.checkAnomalyAlert).toHaveBeenCalled()
      expect(alertDetectionService.checkBudgetWarningAlert).not.toHaveBeenCalled()
    })
  })

  describe('updateTransaction', () => {
    it('should update an existing transaction', async () => {
      const updateData: Partial<TransactionFormData> = {
        amount: 55.00,
        description: 'Updated coffee expense',
      }

      const mockUpdatedTransaction: Transaction = {
        id: '1',
        user_id: 'user-123',
        date: '2024-01-15T00:00:00Z',
        amount: 55.00,
        merchant: 'Coffee Shop',
        description: 'Updated coffee expense',
        category_id: 'cat-dining',
        account_id: null,
        receipt_url: null,
        is_income: false,
        created_at: '2024-01-15T10:00:00Z',
        updated_at: '2024-01-15T12:00:00Z',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: [mockUpdatedTransaction],
        error: null,
      })

      const result = await transactionService.updateTransaction('1', updateData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updateData)
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1')
      expect(mockSupabaseClient.select).toHaveBeenCalled()
      expect(result.data).toEqual(mockUpdatedTransaction)
      expect(result.error).toBeNull()
    })

    it('should handle errors when updating transaction', async () => {
      const updateData = { amount: 100.00 }
      const mockError = { message: 'Update failed' }

      mockSupabaseClient.select.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await transactionService.updateTransaction('1', updateData)

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('deleteTransaction', () => {
    it('should delete a transaction', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await transactionService.deleteTransaction('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1')
      expect(result.error).toBeNull()
    })

    it('should handle errors when deleting transaction', async () => {
      const mockError = { message: 'Delete failed' }

      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await transactionService.deleteTransaction('1')

      expect(result.error).toEqual(mockError)
    })
  })

  describe('getTransactionsByCategory', () => {
    it('should fetch transactions for a specific category', async () => {
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          user_id: 'user-123',
          date: '2024-01-15T00:00:00Z',
          amount: 50.00,
          merchant: 'Store A',
          description: 'Purchase',
          category_id: 'cat-groceries',
          account_id: null,
          receipt_url: null,
          is_income: false,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
      ]

      mockSupabaseClient.order.mockResolvedValue({
        data: mockTransactions,
        error: null,
      })

      const result = await transactionService.getTransactionsByCategory('cat-groceries')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('transactions')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('category_id', 'cat-groceries')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('date', { ascending: false })
      expect(result.data).toEqual(mockTransactions)
    })
  })

  describe('getTransactionStats', () => {
    it('should calculate total spending and income', async () => {
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          user_id: 'user-123',
          date: '2024-01-15T00:00:00Z',
          amount: 50.00,
          merchant: 'Store',
          description: 'Expense',
          category_id: 'cat-1',
          account_id: null,
          receipt_url: null,
          is_income: false,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          user_id: 'user-123',
          date: '2024-01-14T00:00:00Z',
          amount: 1000.00,
          merchant: 'Employer',
          description: 'Income',
          category_id: 'cat-income',
          account_id: null,
          receipt_url: null,
          is_income: true,
          created_at: '2024-01-14T10:00:00Z',
          updated_at: '2024-01-14T10:00:00Z',
        },
      ]

      mockSupabaseClient.order.mockResolvedValue({
        data: mockTransactions,
        error: null,
      })

      const result = await transactionService.getTransactionStats()

      expect(result.data).toEqual({
        totalIncome: 1000.00,
        totalExpenses: 50.00,
        netBalance: 950.00,
        transactionCount: 2,
      })
      expect(result.error).toBeNull()
    })

    it('should handle empty transaction list', async () => {
      mockSupabaseClient.order.mockResolvedValue({
        data: [],
        error: null,
      })

      const result = await transactionService.getTransactionStats()

      expect(result.data).toEqual({
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        transactionCount: 0,
      })
    })

    it('should handle errors when calculating stats', async () => {
      const mockError = { message: 'Failed to fetch transactions' }

      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await transactionService.getTransactionStats()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })
})

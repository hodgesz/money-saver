/**
 * Accounts Service Tests - Phase 2.4 Multi-Account Support
 * TDD Red Phase: Write tests first
 */

import { accountsService } from '../accounts'
import { createClient } from '@/lib/supabase/client'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

describe('Accounts Service', () => {
  const mockUser = { id: 'user-123' }
  let mockSupabaseClient: any

  beforeEach(() => {
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
      single: jest.fn(),
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser },
          error: null,
        }),
      },
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('getAccounts', () => {
    it('should fetch all accounts for authenticated user', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          user_id: 'user-123',
          name: 'Chase Checking',
          type: 'checking',
          balance: 5000.0,
          last_synced: null,
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'acc-2',
          user_id: 'user-123',
          name: 'Capital One Credit Card',
          type: 'credit_card',
          balance: -1500.0,
          last_synced: null,
          created_at: '2024-01-02T00:00:00Z',
        },
      ]

      mockSupabaseClient.order.mockResolvedValue({
        data: mockAccounts,
        error: null,
      })

      const result = await accountsService.getAccounts()

      expect(result.data).toEqual(mockAccounts)
      expect(result.error).toBeNull()
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('accounts')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: true })
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('accounts')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
    })

    it('should return error when user not authenticated', async () => {
      ;(mockSupabaseClient.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await accountsService.getAccounts()

      expect(result.data).toBeNull()
      expect(result.error).toEqual({ message: 'User not authenticated' })
    })

    it('should handle database errors', async () => {
      const mockError = { message: 'Database error', code: '500' }

      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await accountsService.getAccounts()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('getAccount', () => {
    it('should fetch a single account by ID', async () => {
      const mockAccount = {
        id: 'acc-1',
        user_id: 'user-123',
        name: 'Chase Checking',
        type: 'checking',
        balance: 5000.0,
        last_synced: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: mockAccount,
          error: null,
        }),
      })

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      })

      const result = await accountsService.getAccount('acc-1')

      expect(result.data).toEqual(mockAccount)
      expect(result.error).toBeNull()
      expect(mockEq).toHaveBeenCalledWith('id', 'acc-1')
    })

    it('should return error when account not found', async () => {
      const mockError = { message: 'Not found', code: 'PGRST116' }

      const mockEq = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      })

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      })

      const result = await accountsService.getAccount('invalid-id')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('createAccount', () => {
    it('should create a new account', async () => {
      const newAccount = {
        name: 'Ally Savings',
        type: 'savings' as const,
        balance: 10000.0,
      }

      const createdAccount = {
        id: 'acc-new',
        user_id: 'user-123',
        ...newAccount,
        last_synced: null,
        created_at: '2024-01-03T00:00:00Z',
      }

      const mockSelect = jest.fn().mockResolvedValue({
        data: [createdAccount],
        error: null,
      })

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      })

      const result = await accountsService.createAccount(newAccount)

      expect(result.data).toEqual(createdAccount)
      expect(result.error).toBeNull()
      expect(mockInsert).toHaveBeenCalledWith([{
        ...newAccount,
        user_id: 'user-123',
      }])
    })

    it('should validate account type', async () => {
      const invalidAccount = {
        name: 'Test Account',
        type: 'invalid' as any,
        balance: 100.0,
      }

      const result = await accountsService.createAccount(invalidAccount)

      expect(result.data).toBeNull()
      expect(result.error?.message).toContain('Invalid account type')
    })

    it('should handle duplicate account names', async () => {
      const mockError = { message: 'Duplicate account name', code: '23505' }

      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      })

      const mockInsert = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue({
        insert: mockInsert,
      })

      const result = await accountsService.createAccount({
        name: 'Existing Account',
        type: 'checking',
        balance: 100.0,
      })

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('updateAccount', () => {
    it('should update an existing account', async () => {
      const updates = {
        name: 'Updated Name',
        balance: 6000.0,
      }

      const updatedAccount = {
        id: 'acc-1',
        user_id: 'user-123',
        name: 'Updated Name',
        type: 'checking',
        balance: 6000.0,
        last_synced: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockSelect = jest.fn().mockResolvedValue({
        data: [updatedAccount],
        error: null,
      })

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      })

      const result = await accountsService.updateAccount('acc-1', updates)

      expect(result.data).toEqual(updatedAccount)
      expect(result.error).toBeNull()
      expect(mockUpdate).toHaveBeenCalledWith(updates)
      expect(mockEq).toHaveBeenCalledWith('id', 'acc-1')
    })

    it('should return error when account not found', async () => {
      const mockError = { message: 'Not found', code: 'PGRST116' }

      const mockSelect = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      })

      const mockEq = jest.fn().mockReturnValue({
        select: mockSelect,
      })

      const mockUpdate = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue({
        update: mockUpdate,
      })

      const result = await accountsService.updateAccount('invalid-id', { name: 'New Name' })

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('deleteAccount', () => {
    it('should delete an account', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      })

      const result = await accountsService.deleteAccount('acc-1')

      expect(result.error).toBeNull()
      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith('id', 'acc-1')
    })

    it('should return error when account has transactions', async () => {
      const mockError = {
        message: 'Cannot delete account with transactions',
        code: '23503',
      }

      const mockEq = jest.fn().mockResolvedValue({
        data: null,
        error: mockError,
      })

      const mockDelete = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue({
        delete: mockDelete,
      })

      const result = await accountsService.deleteAccount('acc-1')

      expect(result.error).toEqual(mockError)
    })
  })

  describe('getAccountBalance', () => {
    it('should calculate account balance from transactions', async () => {
      const mockTransactions = [
        { amount: 100.0, is_income: true },
        { amount: 50.0, is_income: false },
        { amount: 200.0, is_income: true },
        { amount: 75.0, is_income: false },
      ]

      const mockEq = jest.fn().mockResolvedValue({
        data: mockTransactions,
        error: null,
      })

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      })

      const result = await accountsService.getAccountBalance('acc-1')

      expect(result.data).toBe(175.0) // (100 + 200) - (50 + 75)
      expect(result.error).toBeNull()
    })

    it('should return 0 for account with no transactions', async () => {
      const mockEq = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockEq,
      })

      ;(mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: mockSelect,
      })

      const result = await accountsService.getAccountBalance('acc-empty')

      expect(result.data).toBe(0)
      expect(result.error).toBeNull()
    })
  })
})

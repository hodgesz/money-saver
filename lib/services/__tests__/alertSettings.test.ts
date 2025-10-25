import { alertSettingsService } from '../alertSettings'
import { createClient } from '@/lib/supabase/client'
import type { AlertType } from '@/types'

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

describe('alertSettingsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('getAlertSettings', () => {
    it('fetches all alert settings for the user', async () => {
      const mockAlerts = [
        {
          id: '1',
          user_id: 'user-123',
          type: 'large_purchase' as AlertType,
          threshold: 100.00,
          is_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: 'user-123',
          type: 'budget_warning' as AlertType,
          threshold: 80.00,
          is_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: mockAlerts,
            error: null,
          }),
        }),
      })

      const result = await alertSettingsService.getAlertSettings()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts')
      expect(result.data).toEqual(mockAlerts)
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

      const result = await alertSettingsService.getAlertSettings()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('returns empty array when user has no alert settings', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const result = await alertSettingsService.getAlertSettings()

      expect(result.data).toEqual([])
      expect(result.error).toBeNull()
    })
  })

  describe('getAlertSettingByType', () => {
    it('fetches a single alert setting by type', async () => {
      const mockAlert = {
        id: '1',
        user_id: 'user-123',
        type: 'large_purchase' as AlertType,
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

      const result = await alertSettingsService.getAlertSettingByType('large_purchase')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts')
      expect(result.data).toEqual(mockAlert)
      expect(result.error).toBeNull()
    })

    it('returns null when alert setting does not exist', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { code: 'PGRST116', message: 'No rows found' },
            }),
          }),
        }),
      })

      const result = await alertSettingsService.getAlertSettingByType('anomaly')

      expect(result.data).toBeNull()
    })

    it('handles fetch error', async () => {
      const mockError = { message: 'Database error' }

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

      const result = await alertSettingsService.getAlertSettingByType('large_purchase')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('createAlertSetting', () => {
    it('creates a new alert setting', async () => {
      const newAlert = {
        type: 'large_purchase' as AlertType,
        threshold: 150.00,
        is_enabled: true,
      }

      const mockCreated = {
        id: '1',
        user_id: 'user-123',
        ...newAlert,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await alertSettingsService.createAlertSetting(newAlert)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts')
      expect(result.data).toEqual(mockCreated)
      expect(result.error).toBeNull()
    })

    it('creates alert setting with default is_enabled=true', async () => {
      const newAlert = {
        type: 'budget_warning' as AlertType,
        threshold: 80.00,
      }

      const mockCreated = {
        id: '2',
        user_id: 'user-123',
        ...newAlert,
        is_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockCreated,
              error: null,
            }),
          }),
        }),
      })

      const result = await alertSettingsService.createAlertSetting(newAlert)

      expect(result.data?.is_enabled).toBe(true)
    })

    it('handles creation error', async () => {
      const mockError = { message: 'Creation failed' }

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      })

      const result = await alertSettingsService.createAlertSetting({
        type: 'large_purchase',
        threshold: 100,
      })

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('handles duplicate alert type error', async () => {
      const duplicateError = {
        message: 'duplicate key value violates unique constraint',
        code: '23505'
      }

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: duplicateError,
            }),
          }),
        }),
      })

      const result = await alertSettingsService.createAlertSetting({
        type: 'large_purchase',
        threshold: 100,
      })

      expect(result.data).toBeNull()
      expect(result.error).toEqual(duplicateError)
    })
  })

  describe('updateAlertSetting', () => {
    it('updates an existing alert setting', async () => {
      const updateData = {
        threshold: 200.00,
        is_enabled: false,
      }

      const mockUpdated = {
        id: '1',
        user_id: 'user-123',
        type: 'large_purchase' as AlertType,
        ...updateData,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await alertSettingsService.updateAlertSetting('1', updateData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts')
      expect(result.data).toEqual(mockUpdated)
      expect(result.error).toBeNull()
    })

    it('updates only threshold', async () => {
      const updateData = { threshold: 250.00 }

      const mockUpdated = {
        id: '1',
        user_id: 'user-123',
        type: 'large_purchase' as AlertType,
        threshold: 250.00,
        is_enabled: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await alertSettingsService.updateAlertSetting('1', updateData)

      expect(result.data?.threshold).toBe(250.00)
    })

    it('updates only is_enabled flag', async () => {
      const updateData = { is_enabled: false }

      const mockUpdated = {
        id: '1',
        user_id: 'user-123',
        type: 'large_purchase' as AlertType,
        threshold: 100.00,
        is_enabled: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: mockUpdated,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await alertSettingsService.updateAlertSetting('1', updateData)

      expect(result.data?.is_enabled).toBe(false)
    })

    it('handles update error', async () => {
      const mockError = { message: 'Update failed' }

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: mockError,
              }),
            }),
          }),
        }),
      })

      const result = await alertSettingsService.updateAlertSetting('1', { threshold: 200 })

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })

    it('handles not found error', async () => {
      const notFoundError = { message: 'No rows found', code: 'PGRST116' }

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: notFoundError,
              }),
            }),
          }),
        }),
      })

      const result = await alertSettingsService.updateAlertSetting('nonexistent-id', { threshold: 200 })

      expect(result.data).toBeNull()
      expect(result.error).toEqual(notFoundError)
    })
  })

  describe('deleteAlertSetting', () => {
    it('deletes an alert setting', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const result = await alertSettingsService.deleteAlertSetting('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts')
      expect(result.error).toBeNull()
    })

    it('handles deletion error', async () => {
      const mockError = { message: 'Deletion failed' }

      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: mockError,
          }),
        }),
      })

      const result = await alertSettingsService.deleteAlertSetting('1')

      expect(result.error).toEqual(mockError)
    })

    it('handles not found during deletion', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null, // Supabase doesn't error on delete of non-existent row
          }),
        }),
      })

      const result = await alertSettingsService.deleteAlertSetting('nonexistent-id')

      expect(result.error).toBeNull()
    })
  })

  describe('initializeDefaultAlerts', () => {
    it('creates default alert settings for new user', async () => {
      const mockDefaultAlerts = [
        {
          id: '1',
          user_id: 'user-123',
          type: 'large_purchase' as AlertType,
          threshold: 100.00,
          is_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: 'user-123',
          type: 'anomaly' as AlertType,
          threshold: null,
          is_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '3',
          user_id: 'user-123',
          type: 'budget_warning' as AlertType,
          threshold: 80.00,
          is_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockDefaultAlerts,
            error: null,
          }),
        }),
      })

      const result = await alertSettingsService.initializeDefaultAlerts()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alerts')
      expect(result.data).toHaveLength(3)
      expect(result.data).toEqual(mockDefaultAlerts)
      expect(result.error).toBeNull()
    })

    it('creates large_purchase alert with $100 threshold', async () => {
      const mockAlerts = [
        {
          id: '1',
          user_id: 'user-123',
          type: 'large_purchase' as AlertType,
          threshold: 100.00,
          is_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockAlerts,
            error: null,
          }),
        }),
      })

      const result = await alertSettingsService.initializeDefaultAlerts()

      const largePurchaseAlert = result.data?.find(a => a.type === 'large_purchase')
      expect(largePurchaseAlert?.threshold).toBe(100.00)
    })

    it('creates budget_warning alert with 80% threshold', async () => {
      const mockAlerts = [
        {
          id: '1',
          user_id: 'user-123',
          type: 'budget_warning' as AlertType,
          threshold: 80.00,
          is_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockAlerts,
            error: null,
          }),
        }),
      })

      const result = await alertSettingsService.initializeDefaultAlerts()

      const budgetWarningAlert = result.data?.find(a => a.type === 'budget_warning')
      expect(budgetWarningAlert?.threshold).toBe(80.00)
    })

    it('creates anomaly alert with null threshold', async () => {
      const mockAlerts = [
        {
          id: '1',
          user_id: 'user-123',
          type: 'anomaly' as AlertType,
          threshold: null,
          is_enabled: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: mockAlerts,
            error: null,
          }),
        }),
      })

      const result = await alertSettingsService.initializeDefaultAlerts()

      const anomalyAlert = result.data?.find(a => a.type === 'anomaly')
      expect(anomalyAlert?.threshold).toBeNull()
    })

    it('handles initialization error', async () => {
      const mockError = { message: 'Initialization failed' }

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: mockError,
          }),
        }),
      })

      const result = await alertSettingsService.initializeDefaultAlerts()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })
})

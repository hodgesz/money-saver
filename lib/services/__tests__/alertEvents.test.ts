import { alertEventsService } from '../alertEvents'
import { createClient } from '@/lib/supabase/client'
import type { AlertType, AlertSeverity } from '@/types'

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

describe('alertEventsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('getAlertEvents', () => {
    it('fetches all alert events for the user', async () => {
      const mockEvents = [
        {
          id: '1',
          user_id: 'user-123',
          alert_id: 'alert-1',
          transaction_id: 'txn-1',
          budget_id: null,
          type: 'large_purchase' as AlertType,
          message: 'Large purchase detected: $150.00',
          severity: 'medium' as AlertSeverity,
          is_read: false,
          metadata: { amount: 150.00, merchant: 'Amazon' },
          created_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: 'user-123',
          alert_id: 'alert-2',
          transaction_id: null,
          budget_id: 'budget-1',
          type: 'budget_warning' as AlertType,
          message: 'Budget 85% spent for Groceries',
          severity: 'high' as AlertSeverity,
          is_read: true,
          metadata: { percentage: 85, category: 'Groceries' },
          created_at: '2024-01-02T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: mockEvents,
              error: null,
            }),
          }),
        }),
      })

      const result = await alertEventsService.getAlertEvents()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alert_events')
      expect(result.data).toEqual(mockEvents)
      expect(result.error).toBeNull()
    })

    it('fetches only unread alert events when unreadOnly=true', async () => {
      const mockUnreadEvents = [
        {
          id: '1',
          user_id: 'user-123',
          alert_id: 'alert-1',
          transaction_id: 'txn-1',
          budget_id: null,
          type: 'large_purchase' as AlertType,
          message: 'Large purchase detected',
          severity: 'medium' as AlertSeverity,
          is_read: false,
          metadata: null,
          created_at: '2024-01-01T00:00:00Z',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({
                data: mockUnreadEvents,
                error: null,
              }),
            }),
          }),
        }),
      })

      const result = await alertEventsService.getAlertEvents({ unreadOnly: true })

      expect(result.data).toEqual(mockUnreadEvents)
    })

    it('respects limit parameter', async () => {
      const mockEvents = Array(5).fill(null).map((_, i) => ({
        id: `${i + 1}`,
        user_id: 'user-123',
        alert_id: null,
        transaction_id: null,
        budget_id: null,
        type: 'large_purchase' as AlertType,
        message: `Event ${i + 1}`,
        severity: 'low' as AlertSeverity,
        is_read: false,
        metadata: null,
        created_at: '2024-01-01T00:00:00Z',
      }))

      const mockLimit = jest.fn().mockResolvedValue({
        data: mockEvents,
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      })

      await alertEventsService.getAlertEvents({ limit: 5 })

      expect(mockLimit).toHaveBeenCalledWith(5)
    })

    it('uses default limit of 50 when not specified', async () => {
      const mockLimit = jest.fn().mockResolvedValue({
        data: [],
        error: null,
      })

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: mockLimit,
          }),
        }),
      })

      await alertEventsService.getAlertEvents()

      expect(mockLimit).toHaveBeenCalledWith(50)
    })

    it('handles fetch error', async () => {
      const mockError = { message: 'Database error' }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          order: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue({
              data: null,
              error: mockError,
            }),
          }),
        }),
      })

      const result = await alertEventsService.getAlertEvents()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('getAlertEventById', () => {
    it('fetches a single alert event by ID', async () => {
      const mockEvent = {
        id: '1',
        user_id: 'user-123',
        alert_id: 'alert-1',
        transaction_id: 'txn-1',
        budget_id: null,
        type: 'large_purchase' as AlertType,
        message: 'Large purchase detected',
        severity: 'medium' as AlertSeverity,
        is_read: false,
        metadata: null,
        created_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockEvent,
              error: null,
            }),
          }),
        }),
      })

      const result = await alertEventsService.getAlertEventById('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alert_events')
      expect(result.data).toEqual(mockEvent)
      expect(result.error).toBeNull()
    })

    it('returns null when event does not exist', async () => {
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

      const result = await alertEventsService.getAlertEventById('nonexistent-id')

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

      const result = await alertEventsService.getAlertEventById('1')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('createAlertEvent', () => {
    it('creates a new alert event', async () => {
      const newEvent = {
        alert_id: 'alert-1',
        transaction_id: 'txn-1',
        type: 'large_purchase' as AlertType,
        message: 'Large purchase detected: $200.00',
        severity: 'high' as AlertSeverity,
        metadata: { amount: 200.00, merchant: 'Best Buy' },
      }

      const mockCreated = {
        id: '1',
        user_id: 'user-123',
        ...newEvent,
        budget_id: null,
        is_read: false,
        created_at: '2024-01-01T00:00:00Z',
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

      const result = await alertEventsService.createAlertEvent(newEvent)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alert_events')
      expect(result.data).toEqual(mockCreated)
      expect(result.error).toBeNull()
    })

    it('creates alert event with budget_id', async () => {
      const newEvent = {
        budget_id: 'budget-1',
        type: 'budget_warning' as AlertType,
        message: 'Budget exceeded',
        severity: 'high' as AlertSeverity,
      }

      const mockCreated = {
        id: '2',
        user_id: 'user-123',
        alert_id: null,
        transaction_id: null,
        ...newEvent,
        is_read: false,
        metadata: null,
        created_at: '2024-01-01T00:00:00Z',
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

      const result = await alertEventsService.createAlertEvent(newEvent)

      expect(result.data?.budget_id).toBe('budget-1')
    })

    it('creates alert event without optional fields', async () => {
      const newEvent = {
        type: 'anomaly' as AlertType,
        message: 'Unusual spending pattern detected',
        severity: 'medium' as AlertSeverity,
      }

      const mockCreated = {
        id: '3',
        user_id: 'user-123',
        alert_id: null,
        transaction_id: null,
        budget_id: null,
        ...newEvent,
        is_read: false,
        metadata: null,
        created_at: '2024-01-01T00:00:00Z',
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

      const result = await alertEventsService.createAlertEvent(newEvent)

      expect(result.data).toEqual(mockCreated)
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

      const result = await alertEventsService.createAlertEvent({
        type: 'large_purchase',
        message: 'Test',
        severity: 'low',
      })

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('markAlertAsRead', () => {
    it('marks an alert event as read', async () => {
      const mockUpdated = {
        id: '1',
        user_id: 'user-123',
        alert_id: 'alert-1',
        transaction_id: null,
        budget_id: null,
        type: 'large_purchase' as AlertType,
        message: 'Large purchase',
        severity: 'medium' as AlertSeverity,
        is_read: true,
        metadata: null,
        created_at: '2024-01-01T00:00:00Z',
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

      const result = await alertEventsService.markAlertAsRead('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alert_events')
      expect(result.data?.is_read).toBe(true)
      expect(result.error).toBeNull()
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

      const result = await alertEventsService.markAlertAsRead('1')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('markAllAlertsAsRead', () => {
    it('marks all unread alerts as read', async () => {
      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const result = await alertEventsService.markAllAlertsAsRead()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alert_events')
      expect(result.error).toBeNull()
    })

    it('handles update error', async () => {
      const mockError = { message: 'Bulk update failed' }

      mockSupabaseClient.from.mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: mockError,
          }),
        }),
      })

      const result = await alertEventsService.markAllAlertsAsRead()

      expect(result.error).toEqual(mockError)
    })
  })

  describe('deleteAlertEvent', () => {
    it('deletes an alert event', async () => {
      mockSupabaseClient.from.mockReturnValue({
        delete: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: null,
          }),
        }),
      })

      const result = await alertEventsService.deleteAlertEvent('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alert_events')
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

      const result = await alertEventsService.deleteAlertEvent('1')

      expect(result.error).toEqual(mockError)
    })
  })

  describe('getUnreadCount', () => {
    it('returns count of unread alert events', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 5,
            error: null,
          }),
        }),
      })

      const result = await alertEventsService.getUnreadCount()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('alert_events')
      expect(result.data).toBe(5)
      expect(result.error).toBeNull()
    })

    it('returns 0 when no unread alerts', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: 0,
            error: null,
          }),
        }),
      })

      const result = await alertEventsService.getUnreadCount()

      expect(result.data).toBe(0)
    })

    it('handles count error', async () => {
      const mockError = { message: 'Count failed' }

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            count: null,
            error: mockError,
          }),
        }),
      })

      const result = await alertEventsService.getUnreadCount()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })
})

import { createClient } from '@/lib/supabase/client'
import type { AlertEvent, CreateAlertEventInput } from '@/types'

/**
 * Alert Events Service
 *
 * Manages alert event history and notifications.
 *
 * Features:
 * - Create and retrieve alert events
 * - Mark alerts as read/unread
 * - Get unread count for notification badge
 * - Filter by type, read status
 */

interface ServiceResponse<T> {
  data: T | null
  error: any
}

interface GetAlertEventsOptions {
  limit?: number
  unreadOnly?: boolean
}

export const alertEventsService = {
  /**
   * Get alert events for the current user
   */
  async getAlertEvents(options?: GetAlertEventsOptions): Promise<ServiceResponse<AlertEvent[]>> {
    const supabase = createClient()
    const { limit = 50, unreadOnly = false } = options || {}

    let query = supabase
      .from('alert_events')
      .select('*')

    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit)

    return { data, error }
  },

  /**
   * Get a specific alert event by ID
   */
  async getAlertEventById(id: string): Promise<ServiceResponse<AlertEvent>> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('alert_events')
      .select('*')
      .eq('id', id)
      .single()

    // Handle "no rows found" gracefully
    if (error && error.code === 'PGRST116') {
      return { data: null, error: null }
    }

    return { data, error }
  },

  /**
   * Create a new alert event
   */
  async createAlertEvent(input: CreateAlertEventInput): Promise<ServiceResponse<AlertEvent>> {
    const supabase = createClient()

    const eventData = {
      alert_id: input.alert_id ?? null,
      transaction_id: input.transaction_id ?? null,
      budget_id: input.budget_id ?? null,
      type: input.type,
      message: input.message,
      severity: input.severity,
      metadata: input.metadata ?? null,
      is_read: false,
    }

    const { data, error } = await supabase
      .from('alert_events')
      .insert([eventData])
      .select()
      .single()

    return { data, error }
  },

  /**
   * Mark an alert event as read
   */
  async markAlertAsRead(id: string): Promise<ServiceResponse<AlertEvent>> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('alert_events')
      .update({ is_read: true })
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  },

  /**
   * Mark all unread alert events as read
   */
  async markAllAlertsAsRead(): Promise<ServiceResponse<void>> {
    const supabase = createClient()

    const { error } = await supabase
      .from('alert_events')
      .update({ is_read: true })
      .eq('is_read', false)

    return { data: null, error }
  },

  /**
   * Delete an alert event
   */
  async deleteAlertEvent(id: string): Promise<ServiceResponse<void>> {
    const supabase = createClient()

    const { error } = await supabase
      .from('alert_events')
      .delete()
      .eq('id', id)

    return { data: null, error }
  },

  /**
   * Get count of unread alert events
   */
  async getUnreadCount(): Promise<ServiceResponse<number>> {
    const supabase = createClient()

    const { count, error } = await supabase
      .from('alert_events')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)

    return { data: count, error }
  },
}

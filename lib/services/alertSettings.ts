import { createClient } from '@/lib/supabase/client'
import type { Alert, AlertType, CreateAlertInput, UpdateAlertInput } from '@/types'

/**
 * Alert Settings Service
 *
 * Manages user alert preferences and configurations.
 *
 * Features:
 * - CRUD operations for alert settings
 * - Initialize default alerts for new users
 * - Support for large_purchase, anomaly, and budget_warning alert types
 */

interface ServiceResponse<T> {
  data: T | null
  error: any
}

export const alertSettingsService = {
  /**
   * Get all alert settings for the current user
   */
  async getAlertSettings(): Promise<ServiceResponse<Alert[]>> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .order('created_at', { ascending: true })

    return { data, error }
  },

  /**
   * Get a specific alert setting by type
   */
  async getAlertSettingByType(type: AlertType): Promise<ServiceResponse<Alert>> {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('type', type)
      .single()

    // Handle "no rows found" gracefully
    if (error && error.code === 'PGRST116') {
      return { data: null, error: null }
    }

    return { data, error }
  },

  /**
   * Create a new alert setting
   */
  async createAlertSetting(input: CreateAlertInput): Promise<ServiceResponse<Alert>> {
    const supabase = createClient()

    const alertData = {
      type: input.type,
      threshold: input.threshold ?? null,
      is_enabled: input.is_enabled ?? true,
    }

    const { data, error } = await supabase
      .from('alerts')
      .insert([alertData])
      .select()
      .single()

    return { data, error }
  },

  /**
   * Update an existing alert setting
   */
  async updateAlertSetting(id: string, input: UpdateAlertInput): Promise<ServiceResponse<Alert>> {
    const supabase = createClient()

    const updateData: Record<string, any> = {}

    if (input.threshold !== undefined) {
      updateData.threshold = input.threshold
    }

    if (input.is_enabled !== undefined) {
      updateData.is_enabled = input.is_enabled
    }

    const { data, error } = await supabase
      .from('alerts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    return { data, error }
  },

  /**
   * Delete an alert setting
   */
  async deleteAlertSetting(id: string): Promise<ServiceResponse<void>> {
    const supabase = createClient()

    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', id)

    return { data: null, error }
  },

  /**
   * Initialize default alert settings for a new user
   *
   * Creates three default alerts:
   * - Large Purchase: $100 threshold
   * - Anomaly Detection: Enabled, no threshold
   * - Budget Warning: 80% threshold
   */
  async initializeDefaultAlerts(): Promise<ServiceResponse<Alert[]>> {
    const supabase = createClient()

    const defaultAlerts: CreateAlertInput[] = [
      {
        type: 'large_purchase',
        threshold: 100.00,
        is_enabled: true,
      },
      {
        type: 'anomaly',
        threshold: null,
        is_enabled: true,
      },
      {
        type: 'budget_warning',
        threshold: 80.00, // 80% of budget
        is_enabled: true,
      },
    ]

    const { data, error } = await supabase
      .from('alerts')
      .insert(defaultAlerts)
      .select()

    return { data, error }
  },
}

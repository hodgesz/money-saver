// Database Types

export interface Transaction {
  id: string
  user_id: string
  amount: number
  date: string
  category_id: string | null
  description: string
  merchant?: string
  account_id?: string | null
  receipt_url?: string | null
  is_income: boolean
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  color?: string
  icon?: string
  created_at: string
  updated_at: string
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  amount: number
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  start_date: string
  end_date?: string | null
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
}

// API Response Types

export interface ApiResponse<T> {
  data?: T
  error?: string
  success: boolean
}

// Form Types

export interface TransactionFormData {
  amount: number
  date: string
  category_id?: string | null
  description: string
  merchant?: string
  is_income: boolean
}

export interface CategoryFormData {
  name: string
  color?: string
  icon?: string
}

export interface BudgetFormData {
  category_id: string
  amount: number
  period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  start_date: string
  end_date?: string
}

// Alert Types (Phase 2.2)

export type AlertType = 'large_purchase' | 'anomaly' | 'budget_warning'
export type AlertSeverity = 'low' | 'medium' | 'high'

export interface Alert {
  id: string
  user_id: string
  type: AlertType
  threshold: number | null
  is_enabled: boolean
  created_at: string
  updated_at: string
}

export interface CreateAlertInput {
  type: AlertType
  threshold?: number | null
  is_enabled?: boolean
}

export interface UpdateAlertInput {
  threshold?: number | null
  is_enabled?: boolean
}

export interface AlertEvent {
  id: string
  user_id: string
  alert_id: string | null
  transaction_id: string | null
  budget_id: string | null
  type: AlertType
  message: string
  severity: AlertSeverity
  is_read: boolean
  metadata: Record<string, any> | null
  created_at: string
}

export interface CreateAlertEventInput {
  alert_id?: string | null
  transaction_id?: string | null
  budget_id?: string | null
  type: AlertType
  message: string
  severity: AlertSeverity
  metadata?: Record<string, any> | null
}

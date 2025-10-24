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

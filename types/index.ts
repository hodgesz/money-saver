// Database Types

export interface Transaction {
  id: string
  user_id: string
  amount: number
  date: string
  category_id: string
  description: string
  merchant?: string
  receipt_url?: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  user_id: string
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
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  start_date: string
  end_date?: string
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
  category_id: string
  description: string
  merchant?: string
}

export interface CategoryFormData {
  name: string
  color?: string
  icon?: string
}

export interface BudgetFormData {
  category_id: string
  amount: number
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  start_date: string
  end_date?: string
}

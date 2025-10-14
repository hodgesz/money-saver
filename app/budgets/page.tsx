'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/layout/Navigation'
import { budgetService } from '@/lib/services/budgets'
import { categoryService } from '@/lib/services/categories'
import { BudgetForm } from '@/components/features/BudgetForm'
import { BudgetList } from '@/components/features/BudgetList'
import { Card } from '@/components/ui/Card'
import type { Budget, Category } from '@/types'

export default function BudgetsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const isMountedRef = useRef(false)

  const [budgets, setBudgets] = useState<Budget[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Fetch data on mount
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      if (cancelled) return

      if (!cancelled) {
        setLoading(true)
        setError(null)
      }

      try {
        // Fetch both budgets and categories
        const [budgetsResult, categoriesResult] = await Promise.all([
          budgetService.getBudgets(),
          categoryService.getCategories(),
        ])

        if (cancelled) return

        const newBudgets = budgetsResult.error ? [] : (budgetsResult.data || [])
        const newCategories = categoriesResult.error ? [] : (categoriesResult.data || [])
        const newError = budgetsResult.error
          ? 'Failed to load budgets'
          : categoriesResult.error
          ? 'Failed to load categories'
          : null

        if (!cancelled) {
          setBudgets(newBudgets)
          setCategories(newCategories)
          setError(newError)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError('An unexpected error occurred')
          setLoading(false)
        }
      }
    }

    if (user) {
      fetchData()
    }

    return () => {
      cancelled = true
    }
  }, [user])

  const fetchData = async () => {
    if (!isMountedRef.current) return

    if (isMountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      // Fetch both budgets and categories
      const [budgetsResult, categoriesResult] = await Promise.all([
        budgetService.getBudgets(),
        categoryService.getCategories(),
      ])

      if (!isMountedRef.current) return

      const newBudgets = budgetsResult.error ? [] : (budgetsResult.data || [])
      const newCategories = categoriesResult.error ? [] : (categoriesResult.data || [])
      const newError = budgetsResult.error
        ? 'Failed to load budgets'
        : categoriesResult.error
        ? 'Failed to load categories'
        : null

      if (isMountedRef.current) {
        setBudgets(newBudgets)
        setCategories(newCategories)
        setError(newError)
        setLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('An unexpected error occurred')
        setLoading(false)
      }
    }
  }

  const handleAddBudget = async (budgetData: {
    category_id: string
    amount: number
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    start_date: string
    end_date?: string
  }) => {
    const result = await budgetService.createBudget(budgetData)

    if (result.error) {
      throw new Error('Failed to create budget')
    }

    // Refresh the budget list and clear edit mode
    setEditingBudget(undefined)
    await fetchData()
  }

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget)
  }

  const handleUpdateBudget = async (budgetData: {
    category_id: string
    amount: number
    period: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
    start_date: string
    end_date?: string
  }) => {
    if (!editingBudget) return

    const result = await budgetService.updateBudget(editingBudget.id, budgetData)

    if (result.error) {
      throw new Error('Failed to update budget')
    }

    // Refresh the budget list and clear edit mode
    setEditingBudget(undefined)
    await fetchData()
  }

  const handleCancelEdit = () => {
    setEditingBudget(undefined)
  }

  const handleDeleteBudget = async (id: string) => {
    const result = await budgetService.deleteBudget(id)

    if (result.error) {
      setError('Failed to delete budget')
      return
    }

    // Refresh the budget list
    await fetchData()
  }

  // Show loading while checking authentication
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Budgets</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Budget Form - Left side on large screens */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                {editingBudget ? 'Edit Budget' : 'Add Budget'}
              </h2>
              <BudgetForm
                onSubmit={editingBudget ? handleUpdateBudget : handleAddBudget}
                onCancel={editingBudget ? handleCancelEdit : undefined}
                budget={editingBudget}
                categories={categories}
              />
            </Card>
          </div>

          {/* Budget List - Right side on large screens */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Your Budgets
              </h2>
              <BudgetList
                budgets={budgets}
                categories={categories}
                onEdit={handleEditBudget}
                onDelete={handleDeleteBudget}
                isLoading={loading}
                error={error || undefined}
              />
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

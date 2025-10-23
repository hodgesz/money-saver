'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { analyticsService, type BudgetSummary } from '@/lib/services/analytics'

export function BudgetStatusGrid() {
  const [budgets, setBudgets] = useState<BudgetSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadBudgets() {
      setLoading(true)
      setError(null)

      const { data, error: err } = await analyticsService.getBudgetSummary()

      if (err) {
        setError('Failed to load budget data')
        setLoading(false)
        return
      }

      setBudgets(data || [])
      setLoading(false)
    }

    loadBudgets()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!budgets || budgets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No active budgets</p>
          <p className="text-xs text-gray-500 mt-1">
            Create budgets to track your spending
          </p>
        </CardContent>
      </Card>
    )
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 80) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const getTextColor = (percentage: number) => {
    if (percentage >= 100) return 'text-red-700'
    if (percentage >= 80) return 'text-amber-700'
    return 'text-green-700'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {budgets.map((budget) => (
            <div key={budget.budgetId} className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-sm">{budget.categoryName}</h3>
                  <p className="text-xs text-gray-500 capitalize">{budget.period}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${getTextColor(budget.percentage)}`}>
                    {budget.percentage.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-600">
                    ${budget.spentAmount.toFixed(2)} / ${budget.budgetAmount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${getStatusColor(budget.percentage)}`}
                  style={{ width: `${Math.min(budget.percentage, 100)}%` }}
                />
              </div>

              {/* Remaining amount */}
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">
                  {budget.remainingAmount >= 0 ? 'Remaining' : 'Over budget'}
                </span>
                <span className={budget.remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${Math.abs(budget.remainingAmount).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

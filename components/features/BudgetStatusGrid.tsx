'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { analyticsService, type BudgetStatus } from '@/lib/services/analytics'

export function BudgetStatusGrid() {
  const [budgets, setBudgets] = useState<BudgetStatus[]>([])
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
          {budgets.map((budgetStatus) => (
            <div key={budgetStatus.budget.id} className="space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-sm">{budgetStatus.budget.category_id}</h3>
                  <p className="text-xs text-gray-500 capitalize">{budgetStatus.budget.period}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${getTextColor(budgetStatus.percentage)}`}>
                    {budgetStatus.percentage.toFixed(0)}%
                  </p>
                  <p className="text-xs text-gray-600">
                    ${budgetStatus.spent.toFixed(2)} / ${budgetStatus.budget.amount.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all ${getStatusColor(budgetStatus.percentage)}`}
                  style={{ width: `${Math.min(budgetStatus.percentage, 100)}%` }}
                />
              </div>

              {/* Remaining amount */}
              <div className="flex justify-between text-xs">
                <span className="text-gray-600">
                  {budgetStatus.remaining >= 0 ? 'Remaining' : 'Over budget'}
                </span>
                <span className={budgetStatus.remaining >= 0 ? 'text-green-600' : 'text-red-600'}>
                  ${Math.abs(budgetStatus.remaining).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

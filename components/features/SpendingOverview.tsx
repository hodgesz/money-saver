'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { analyticsService, type MonthlySpending } from '@/lib/services/analytics'

export function SpendingOverview() {
  const [spending, setSpending] = useState<MonthlySpending | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSpending() {
      setLoading(true)
      setError(null)

      const { data, error: err } = await analyticsService.getMonthlySpending()

      if (err) {
        setError('Failed to load spending data')
        setLoading(false)
        return
      }

      setSpending(data)
      setLoading(false)
    }

    loadSpending()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
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
          <CardTitle>Monthly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!spending) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No data available</p>
        </CardContent>
      </Card>
    )
  }

  const trendColor = spending.total >= 0 ? 'text-green-600' : 'text-red-600'
  const trendIcon = spending.total >= 0 ? '↑' : '↓'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">Net Balance</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-3xl font-bold ${trendColor}`}>
                ${Math.abs(spending.total).toFixed(2)}
              </p>
              <span className={`text-xl ${trendColor}`}>{trendIcon}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Income</p>
              <p className="text-xl font-semibold text-green-700">
                ${spending.income.toFixed(2)}
              </p>
            </div>

            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600">Expenses</p>
              <p className="text-xl font-semibold text-red-700">
                ${spending.expenses.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-sm text-gray-600">
              {spending.transactionCount} transaction{spending.transactionCount !== 1 ? 's' : ''} this month
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

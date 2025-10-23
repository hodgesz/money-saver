'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { analyticsService, type SpendingTrend } from '@/lib/services/analytics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

export function TrendsChart() {
  const [trends, setTrends] = useState<SpendingTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTrends() {
      setLoading(true)
      setError(null)

      const { data, error: err } = await analyticsService.getSpendingTrends()

      if (err) {
        setError('Failed to load trends data')
        setLoading(false)
        return
      }

      setTrends(data || [])
      setLoading(false)
    }

    loadTrends()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Trends (Last 30 Days)</CardTitle>
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
          <CardTitle>Spending Trends (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!trends || trends.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending Trends (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No trend data available</p>
        </CardContent>
      </Card>
    )
  }

  // Format dates for display
  const chartData = trends.map(trend => ({
    ...trend,
    date: new Date(trend.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Trends (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `$${Math.abs(value).toFixed(2)}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="income"
                stroke="#10b981"
                strokeWidth={2}
                name="Income"
                dot={{ fill: '#10b981' }}
              />
              <Line
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2}
                name="Expenses"
                dot={{ fill: '#ef4444' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex justify-around">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Income</p>
            <p className="text-lg font-semibold text-green-600">
              ${trends.reduce((sum, t) => sum + t.income, 0).toFixed(2)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <p className="text-lg font-semibold text-red-600">
              ${trends.reduce((sum, t) => sum + t.expenses, 0).toFixed(2)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

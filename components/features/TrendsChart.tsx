'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { analyticsService, type MonthlyTrend } from '@/lib/services/analytics'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface TrendsChartProps {
  startDate: string
  endDate: string
}

export function TrendsChart({ startDate, endDate }: TrendsChartProps) {
  const [trends, setTrends] = useState<MonthlyTrend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadTrends() {
      setLoading(true)
      setError(null)

      const { data, error: err } = await analyticsService.getSpendingTrends(startDate, endDate)

      if (err) {
        setError('Failed to load trends data')
        setLoading(false)
        return
      }

      setTrends(data || [])
      setLoading(false)
    }

    loadTrends()
  }, [startDate, endDate])

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

  // Format month keys for display
  const chartData = trends.map(trend => {
    const [year, month] = trend.month.split('-')
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return {
      ...trend,
      displayMonth: `${monthNames[parseInt(month) - 1]} ${year}`,
    }
  })

  // Calculate average and trend
  const totalSpending = trends.reduce((sum, t) => sum + t.total, 0)
  const average = trends.length > 0 ? totalSpending / trends.length : 0
  const hasIncrease = trends.length > 1 && trends[trends.length - 1].total > trends[trends.length - 2].total
  const hasDecrease = trends.length > 1 && trends[trends.length - 1].total < trends[trends.length - 2].total

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80" role="img" aria-label="Spending trends over time">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="displayMonth" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Spending"
                dot={{ fill: '#3b82f6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 flex justify-around">
          <div className="text-center">
            <p className="text-sm text-gray-600">Average</p>
            <p className="text-lg font-semibold">
              ${average.toFixed(2)}
            </p>
          </div>
          {hasIncrease && (
            <div className="text-center">
              <p className="text-sm text-gray-600">Trend</p>
              <p className="text-lg font-semibold text-red-600">↑ Increasing</p>
            </div>
          )}
          {hasDecrease && (
            <div className="text-center">
              <p className="text-sm text-gray-600">Trend</p>
              <p className="text-lg font-semibold text-green-600">↓ Decreasing</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

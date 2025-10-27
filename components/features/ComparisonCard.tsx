'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import {
  analyticsService,
  type YearOverYearComparison,
  type MonthOverMonthComparison,
} from '@/lib/services/analytics'

interface ComparisonCardProps {
  type: 'year-over-year' | 'month-over-month'
  year: number
  month: number
}

export function ComparisonCard({ type, year, month }: ComparisonCardProps) {
  const [comparison, setComparison] = useState<
    YearOverYearComparison | MonthOverMonthComparison | null
  >(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadComparison() {
      setLoading(true)
      setError(null)

      let result
      if (type === 'year-over-year') {
        result = await analyticsService.getYearOverYearComparison(year, month)
      } else {
        result = await analyticsService.getMonthOverMonthComparison(year, month)
      }

      if (result.error) {
        setError('Failed to load comparison data')
        setLoading(false)
        return
      }

      setComparison(result.data)
      setLoading(false)
    }

    loadComparison()
  }, [type, year, month])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatMonth = (month: number, year: number) => {
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {type === 'year-over-year' ? 'Year-over-Year' : 'Month-over-Month'} Comparison
          </CardTitle>
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
          <CardTitle>
            {type === 'year-over-year' ? 'Year-over-Year' : 'Month-over-Month'} Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!comparison) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {type === 'year-over-year' ? 'Year-over-Year' : 'Month-over-Month'} Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No data available</p>
        </CardContent>
      </Card>
    )
  }

  // Determine trend colors and icon
  let trendColor = 'text-gray-600'
  let trendBgColor = 'bg-gray-100'
  let trendIcon = '→'

  if (comparison.trend === 'increasing') {
    trendColor = 'text-red-600'
    trendBgColor = 'bg-red-50'
    trendIcon = '↑'
  } else if (comparison.trend === 'decreasing') {
    trendColor = 'text-green-600'
    trendBgColor = 'bg-green-50'
    trendIcon = '↓'
  } else if (comparison.trend === 'stable') {
    trendColor = 'text-gray-600'
    trendBgColor = 'bg-gray-50'
    trendIcon = '→'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {type === 'year-over-year' ? 'Year-over-Year' : 'Month-over-Month'} Comparison
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Percentage Change Badge */}
          {comparison.trend !== 'no-data' ? (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${trendBgColor}`}>
              <span className={`text-2xl ${trendColor}`}>{trendIcon}</span>
              <div>
                <p className={`text-2xl font-bold ${trendColor}`}>
                  {comparison.percentChange > 0 ? '+' : ''}
                  {comparison.percentChange.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-600">vs previous period</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">No previous year data available for comparison</p>
            </div>
          )}

          {/* Current vs Previous Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Current Period</p>
              <p className="text-sm font-semibold text-blue-900 mb-2">
                {formatMonth(comparison.current.month, comparison.current.year)}
              </p>
              <p className="text-lg font-bold text-blue-700">
                {formatCurrency(comparison.current.expenses)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {comparison.current.transactionCount} transaction{comparison.current.transactionCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Previous Period</p>
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {formatMonth(comparison.previous.month, comparison.previous.year)}
              </p>
              <p className="text-lg font-bold text-gray-700">
                {formatCurrency(comparison.previous.expenses)}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {comparison.previous.transactionCount} transaction{comparison.previous.transactionCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Additional Context */}
          <div className="pt-2 border-t text-xs text-gray-600">
            {comparison.trend === 'increasing' && (
              <p>Spending increased compared to previous period</p>
            )}
            {comparison.trend === 'decreasing' && (
              <p>Spending decreased compared to previous period ✨</p>
            )}
            {comparison.trend === 'stable' && (
              <p>Spending remained stable compared to previous period</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

/**
 * MonthlyTrendsChart Component
 * Phase 2.3: Charts & Visualizations
 *
 * Bar chart displaying monthly income vs expenses trends
 */

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { analyticsService, MonthlySpendingTrend } from '@/lib/services/analytics'

interface MonthlyTrendsChartProps {
  startDate: string
  endDate: string
}

export function MonthlyTrendsChart({ startDate, endDate }: MonthlyTrendsChartProps) {
  const [data, setData] = useState<MonthlySpendingTrend[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      const result = await analyticsService.getMonthlySpendingTrends(startDate, endDate)

      if (result.error) {
        setError('Failed to load monthly trends data')
        setData(null)
      } else {
        setData(result.data)
      }

      setLoading(false)
    }

    fetchData()
  }, [startDate, endDate])

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Spending Trends</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Spending Trends</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Monthly Spending Trends</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">No data available for the selected period</div>
        </div>
      </div>
    )
  }

  // Currency formatter for tooltip
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value)
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-green-600">
              Income: {formatCurrency(payload[0].value)}
            </p>
            <p className="text-red-600">
              Expenses: {formatCurrency(payload[1].value)}
            </p>
            <p className="text-blue-600 font-semibold border-t pt-1">
              Net: {formatCurrency(payload[0].value - payload[1].value)}
            </p>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Monthly Spending Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="monthLabel"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="square"
          />
          <Bar
            dataKey="income"
            fill="#10b981"
            name="Income"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="expenses"
            fill="#ef4444"
            name="Expenses"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
        <div>
          <div className="text-gray-500">Avg Income</div>
          <div className="text-green-600 font-semibold">
            {formatCurrency(data.reduce((sum, item) => sum + item.income, 0) / data.length)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Avg Expenses</div>
          <div className="text-red-600 font-semibold">
            {formatCurrency(data.reduce((sum, item) => sum + item.expenses, 0) / data.length)}
          </div>
        </div>
        <div>
          <div className="text-gray-500">Avg Net</div>
          <div className="text-blue-600 font-semibold">
            {formatCurrency(data.reduce((sum, item) => sum + item.net, 0) / data.length)}
          </div>
        </div>
      </div>
    </div>
  )
}

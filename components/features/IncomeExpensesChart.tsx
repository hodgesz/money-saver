'use client'

/**
 * IncomeExpensesChart Component - Phase 2.3
 * Area chart displaying income vs expenses timeline
 */

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { analyticsService, IncomeExpenseTimelineData } from '@/lib/services/analytics'

interface IncomeExpensesChartProps {
  startDate: string
  endDate: string
}

export function IncomeExpensesChart({ startDate, endDate }: IncomeExpensesChartProps) {
  const [data, setData] = useState<IncomeExpenseTimelineData[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      const result = await analyticsService.getIncomeExpenseTimeline(startDate, endDate)

      if (result.error) {
        setError('Failed to load income vs expenses data')
        setData(null)
      } else {
        setData(result.data)
      }

      setLoading(false)
    }

    fetchData()
  }, [startDate, endDate])

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Income vs Expenses Timeline</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Income vs Expenses Timeline</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Income vs Expenses Timeline</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">No data available for the selected period</div>
        </div>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-green-600">Income: {formatCurrency(payload[0].value)}</p>
            <p className="text-red-600">Expenses: {formatCurrency(payload[1].value)}</p>
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
      <h3 className="text-lg font-semibold mb-4">Income vs Expenses Timeline</h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
            </linearGradient>
            <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          <Area
            type="monotone"
            dataKey="income"
            stroke="#10b981"
            fillOpacity={1}
            fill="url(#colorIncome)"
            name="Income"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="#ef4444"
            fillOpacity={1}
            fill="url(#colorExpenses)"
            name="Expenses"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

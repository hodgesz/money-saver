'use client'

/**
 * CategoryTrendsChart Component - Phase 2.3
 * Line chart displaying category spending trends over time
 */

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { analyticsService, CategoryTrendMonth } from '@/lib/services/analytics'

interface CategoryTrendsChartProps {
  startDate: string
  endDate: string
}

export function CategoryTrendsChart({ startDate, endDate }: CategoryTrendsChartProps) {
  const [data, setData] = useState<CategoryTrendMonth[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      const result = await analyticsService.getCategoryTrends(startDate, endDate)

      if (result.error) {
        setError('Failed to load category trends data')
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
        <h3 className="text-lg font-semibold mb-4">Category Spending Trends</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Category Spending Trends</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-red-500">{error}</div>
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Category Spending Trends</h3>
        <div className="h-64 flex items-center justify-center">
          <div className="text-gray-500">No data available for the selected period</div>
        </div>
      </div>
    )
  }

  // Transform data for recharts (flatten categories into separate data points)
  const allCategories = new Set<string>()
  data.forEach((month) => {
    Object.entries(month.categories).forEach(([_, cat]) => {
      allCategories.add(cat.name)
    })
  })

  const chartData = data.map((month) => {
    const monthData: any = { month: month.monthLabel }
    allCategories.forEach((catName) => {
      const category = Object.values(month.categories).find((c) => c.name === catName)
      monthData[catName] = category?.total || 0
    })
    return monthData
  })

  // Get colors for each category
  const categoryColors = new Map<string, string>()
  data.forEach((month) => {
    Object.values(month.categories).forEach((cat) => {
      if (!categoryColors.has(cat.name)) {
        categoryColors.set(cat.name, cat.color || '#6b7280')
      }
    })
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Category Spending Trends</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
          <YAxis tick={{ fontSize: 12 }} tickFormatter={formatCurrency} />
          <Tooltip formatter={(value: any) => formatCurrency(value)} />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />
          {Array.from(allCategories).map((catName) => (
            <Line
              key={catName}
              type="monotone"
              dataKey={catName}
              stroke={categoryColors.get(catName) || '#6b7280'}
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

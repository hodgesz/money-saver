'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { analyticsService, type CategoryBreakdown } from '@/lib/services/analytics'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
]

export function CategoryChart() {
  const [categories, setCategories] = useState<CategoryBreakdown[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCategories() {
      setLoading(true)
      setError(null)

      const { data, error: err } = await analyticsService.getCategoryBreakdown()

      if (err) {
        setError('Failed to load category data')
        setLoading(false)
        return
      }

      setCategories(data || [])
      setLoading(false)
    }

    loadCategories()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
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
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No spending data available</p>
        </CardContent>
      </Card>
    )
  }

  // Prepare data for chart
  const chartData = categories.map((cat, index) => ({
    name: cat.categoryName,
    value: cat.amount,
    color: cat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-4 space-y-2">
          {categories.map((cat, index) => (
            <div key={cat.categoryId} className="flex justify-between items-center text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length] }}
                />
                <span>{cat.categoryName}</span>
              </div>
              <div className="text-right">
                <span className="font-semibold">${cat.amount.toFixed(2)}</span>
                <span className="text-gray-500 ml-2">({cat.percentage.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

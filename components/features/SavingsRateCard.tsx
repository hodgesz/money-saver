'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { analyticsService, type SavingsRate } from '@/lib/services/analytics'

interface SavingsRateCardProps {
  startDate: string
  endDate: string
}

export function SavingsRateCard({ startDate, endDate }: SavingsRateCardProps) {
  const [savingsData, setSavingsData] = useState<SavingsRate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadSavingsRate() {
      setLoading(true)
      setError(null)

      const result = await analyticsService.getSavingsRate(startDate, endDate)

      if (result.error) {
        setError('Failed to load savings rate data')
        setLoading(false)
        return
      }

      setSavingsData(result.data)
      setLoading(false)
    }

    loadSavingsRate()
  }, [startDate, endDate])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Rate</CardTitle>
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
          <CardTitle>Savings Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!savingsData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No data available</p>
        </CardContent>
      </Card>
    )
  }

  // Determine color scheme based on savings rate
  let rateColor = 'text-gray-600'
  let rateBgColor = 'bg-gray-100'
  let rateIcon = '→'

  if (savingsData.savingsRate > 0) {
    rateColor = 'text-green-600'
    rateBgColor = 'bg-green-50'
    rateIcon = '↑'
  } else if (savingsData.savingsRate < 0) {
    rateColor = 'text-red-600'
    rateBgColor = 'bg-red-50'
    rateIcon = '↓'
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings Rate</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Savings Rate Badge */}
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${rateBgColor}`}>
            <span className={`text-2xl ${rateColor}`}>{rateIcon}</span>
            <div>
              <p className={`text-3xl font-bold ${rateColor}`}>
                {savingsData.savingsRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-600">savings rate</p>
            </div>
          </div>

          {/* Financial Summary Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Income</p>
              <p className="text-sm font-bold text-green-700">
                {formatCurrency(savingsData.totalIncome)}
              </p>
            </div>

            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Expenses</p>
              <p className="text-sm font-bold text-red-700">
                {formatCurrency(savingsData.totalExpenses)}
              </p>
            </div>

            <div className={`p-3 rounded-lg ${savingsData.netSavings >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-xs text-gray-600 mb-1">Net Savings</p>
              <p className={`text-sm font-bold ${savingsData.netSavings >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(savingsData.netSavings)}
              </p>
            </div>
          </div>

          {/* Context Message */}
          <div className="pt-2 border-t text-xs text-gray-600">
            {savingsData.savingsRate > 50 && (
              <p>Excellent savings! You&apos;re saving over half your income ✨</p>
            )}
            {savingsData.savingsRate > 20 && savingsData.savingsRate <= 50 && (
              <p>Good savings rate! Keep up the momentum 💪</p>
            )}
            {savingsData.savingsRate > 0 && savingsData.savingsRate <= 20 && (
              <p>You&apos;re saving, but there&apos;s room for improvement 📊</p>
            )}
            {savingsData.savingsRate === 0 && (
              <p>Breaking even - consider reducing expenses or increasing income</p>
            )}
            {savingsData.savingsRate < 0 && (
              <p>⚠️ Spending more than earning - time to review your budget</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

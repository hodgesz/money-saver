'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/layout/Navigation'
import { SpendingOverview } from '@/components/features/SpendingOverview'
import { CategoryChart } from '@/components/features/CategoryChart'
import { TrendsChart } from '@/components/features/TrendsChart'
import { BudgetStatusGrid } from '@/components/features/BudgetStatusGrid'
import { RecentTransactionsList } from '@/components/features/RecentTransactionsList'
import { ComparisonCard } from '@/components/features/ComparisonCard'
import { SavingsRateCard } from '@/components/features/SavingsRateCard'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo } from 'react'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Calculate current month and year for CategoryChart
  const currentDate = useMemo(() => {
    const now = new Date()
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1, // JavaScript months are 0-indexed
    }
  }, [])

  // Calculate date range for TrendsChart (last 6 months)
  const dateRange = useMemo(() => {
    const now = new Date()
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(now.getMonth() - 6)

    return {
      startDate: sixMonthsAgo.toISOString().split('T')[0], // YYYY-MM-DD format
      endDate: now.toISOString().split('T')[0],
    }
  }, [])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-sm text-gray-600">Welcome back, {user.email}</p>
          </div>

          {/* Top Row - Overview and Budgets */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SpendingOverview />
            <BudgetStatusGrid />
          </div>

          {/* Middle Row - Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CategoryChart year={currentDate.year} month={currentDate.month} />
            <TrendsChart startDate={dateRange.startDate} endDate={dateRange.endDate} />
          </div>

          {/* Phase 2.3 - Advanced Analytics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ComparisonCard
              type="year-over-year"
              year={currentDate.year}
              month={currentDate.month}
            />
            <ComparisonCard
              type="month-over-month"
              year={currentDate.year}
              month={currentDate.month}
            />
            <SavingsRateCard
              startDate={dateRange.startDate}
              endDate={dateRange.endDate}
            />
          </div>

          {/* Bottom Row - Recent Transactions */}
          <RecentTransactionsList />
        </div>
      </div>
    </div>
  )
}

'use client'

import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/layout/Navigation'
import { SpendingOverview } from '@/components/features/SpendingOverview'
import { CategoryChart } from '@/components/features/CategoryChart'
import { TrendsChart } from '@/components/features/TrendsChart'
import { BudgetStatusGrid } from '@/components/features/BudgetStatusGrid'
import { RecentTransactionsList } from '@/components/features/RecentTransactionsList'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

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
            <CategoryChart />
            <TrendsChart />
          </div>

          {/* Bottom Row - Recent Transactions */}
          <RecentTransactionsList />
        </div>
      </div>
    </div>
  )
}

'use client'

/**
 * Reports Page - Phase 2.3 Reports & Export
 * Allows users to generate and export reports
 */

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/layout/Navigation'
import { useRouter } from 'next/navigation'
import { analyticsService } from '@/lib/services/analytics'
import { transactionService } from '@/lib/services/transactions'
import { categoryService } from '@/lib/services/categories'
import { exportToCSV, exportToPDF, formatCurrency, formatDate } from '@/lib/utils/export'

export default function ReportsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  // Date range state
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Loading states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Initialize with current month
  useEffect(() => {
    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
  }, [])

  // Authentication check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  /**
   * Generate Monthly Spending Summary Report
   */
  const generateMonthlyReport = async (format: 'csv' | 'pdf') => {
    try {
      setLoading(true)
      setError(null)

      // Fetch transactions
      const { data: transactions, error: txError } = await transactionService.getTransactionsWithFilters({
        startDate,
        endDate,
      })

      if (txError || !transactions) {
        throw new Error('Failed to fetch transactions')
      }

      // Calculate summary
      const income = transactions
        .filter((tx) => tx.is_income)
        .reduce((sum, tx) => sum + tx.amount, 0)

      const expenses = transactions
        .filter((tx) => !tx.is_income)
        .reduce((sum, tx) => sum + tx.amount, 0)

      const net = income - expenses

      // Prepare export data
      const exportData = {
        title: `Monthly Spending Report - ${formatDate(startDate)} to ${formatDate(endDate)}`,
        headers: ['Date', 'Merchant', 'Category', 'Amount', 'Type'],
        rows: transactions.map((tx) => [
          formatDate(tx.date),
          tx.merchant || 'Unknown',
          tx.category_id || 'Uncategorized',
          formatCurrency(tx.amount),
          tx.is_income ? 'Income' : 'Expense',
        ]),
        metadata: {
          'Report Period': `${formatDate(startDate)} to ${formatDate(endDate)}`,
          'Total Income': formatCurrency(income),
          'Total Expenses': formatCurrency(expenses),
          'Net Balance': formatCurrency(net),
          'Transaction Count': transactions.length.toString(),
          'Generated': new Date().toLocaleString(),
        },
      }

      // Export
      if (format === 'csv') {
        exportToCSV(exportData, `monthly-report-${startDate}-to-${endDate}.csv`)
      } else {
        await exportToPDF(exportData, `monthly-report-${startDate}-to-${endDate}.pdf`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Generate Category Deep-Dive Report
   */
  const generateCategoryReport = async (format: 'csv' | 'pdf') => {
    try {
      setLoading(true)
      setError(null)

      // Fetch category breakdown
      const { data: breakdown, error: catError } = await analyticsService.getCategoryBreakdown(
        parseInt(startDate.split('-')[0]),
        parseInt(startDate.split('-')[1])
      )

      if (catError || !breakdown) {
        throw new Error('Failed to fetch category data')
      }

      // Fetch categories for names
      const { data: categories } = await categoryService.getCategories()
      const categoryMap = new Map(categories?.map((c) => [c.id, c.name]) || [])

      // Prepare export data
      const rows = Object.entries(breakdown).map(([categoryId, data]) => [
        categoryMap.get(categoryId) || 'Unknown',
        formatCurrency(data.total),
        data.count.toString(),
        `${data.percentage.toFixed(1)}%`,
      ])

      const totalSpent = Object.values(breakdown).reduce((sum, data) => sum + data.total, 0)
      const totalTransactions = Object.values(breakdown).reduce((sum, data) => sum + data.count, 0)

      const exportData = {
        title: `Category Spending Report - ${formatDate(startDate)} to ${formatDate(endDate)}`,
        headers: ['Category', 'Total Spent', 'Transactions', 'Percentage'],
        rows,
        metadata: {
          'Report Period': `${formatDate(startDate)} to ${formatDate(endDate)}`,
          'Total Spent': formatCurrency(totalSpent),
          'Total Transactions': totalTransactions.toString(),
          'Categories': Object.keys(breakdown).length.toString(),
          'Generated': new Date().toLocaleString(),
        },
      }

      // Export
      if (format === 'csv') {
        exportToCSV(exportData, `category-report-${startDate}-to-${endDate}.csv`)
      } else {
        await exportToPDF(exportData, `category-report-${startDate}-to-${endDate}.pdf`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate category report')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Reports & Export</h1>
            <p className="text-gray-600 mt-2">Generate and download detailed financial reports</p>
          </div>

          {/* Date Range Selector */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Report Period</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Quick date range buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => {
                  const now = new Date()
                  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
                  setStartDate(firstDay.toISOString().split('T')[0])
                  setEndDate(now.toISOString().split('T')[0])
                }}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                This Month
              </button>
              <button
                onClick={() => {
                  const now = new Date()
                  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
                  const lastDay = new Date(now.getFullYear(), now.getMonth(), 0)
                  setStartDate(lastMonth.toISOString().split('T')[0])
                  setEndDate(lastDay.toISOString().split('T')[0])
                }}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Last Month
              </button>
              <button
                onClick={() => {
                  const now = new Date()
                  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1)
                  setStartDate(threeMonthsAgo.toISOString().split('T')[0])
                  setEndDate(now.toISOString().split('T')[0])
                }}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Last 3 Months
              </button>
              <button
                onClick={() => {
                  const now = new Date()
                  const yearStart = new Date(now.getFullYear(), 0, 1)
                  setStartDate(yearStart.toISOString().split('T')[0])
                  setEndDate(now.toISOString().split('T')[0])
                }}
                className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Year to Date
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* Monthly Spending Report */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Monthly Spending Summary</h2>
            <p className="text-gray-600 mb-4">
              Comprehensive report of all transactions in the selected period
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => generateMonthlyReport('csv')}
                disabled={loading || !startDate || !endDate}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Generating...' : 'Export to CSV'}
              </button>
              <button
                onClick={() => generateMonthlyReport('pdf')}
                disabled={loading || !startDate || !endDate}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Generating...' : 'Export to PDF'}
              </button>
            </div>
          </div>

          {/* Category Deep-Dive Report */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-2">Category Spending Analysis</h2>
            <p className="text-gray-600 mb-4">
              Breakdown of spending by category with percentages
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => generateCategoryReport('csv')}
                disabled={loading || !startDate || !endDate}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Generating...' : 'Export to CSV'}
              </button>
              <button
                onClick={() => generateCategoryReport('pdf')}
                disabled={loading || !startDate || !endDate}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Generating...' : 'Export to PDF'}
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">About Reports</h3>
            <ul className="text-blue-800 text-sm space-y-1 list-disc list-inside">
              <li>CSV files can be opened in Excel or Google Sheets</li>
              <li>PDF files are formatted for printing and sharing</li>
              <li>All reports include metadata with summary statistics</li>
              <li>Select custom date ranges for detailed analysis</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

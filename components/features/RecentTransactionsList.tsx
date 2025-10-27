'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { useEffect, useState } from 'react'
import { transactionService } from '@/lib/services/transactions'
import { categoryService } from '@/lib/services/categories'
import type { Transaction, Category } from '@/types'
import Link from 'next/link'

export function RecentTransactionsList() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Map<string, Category>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      setError(null)

      // Load transactions (limited to 5 most recent)
      const { data: txData, error: txError } = await transactionService.getTransactionsWithFilters({
        limit: 5,
        page: 1,
      })

      if (txError) {
        setError('Failed to load transactions')
        setLoading(false)
        return
      }

      // Load categories for display
      const { data: catData, error: catError } = await categoryService.getCategories()

      if (catError) {
        setError('Failed to load categories')
        setLoading(false)
        return
      }

      const categoryMap = new Map<string, Category>()
      catData?.forEach((cat) => {
        categoryMap.set(cat.id, cat)
      })

      setTransactions(txData || [])
      setCategories(categoryMap)
      setLoading(false)
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
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
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!transactions || transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">No transactions yet</p>
          <p className="text-xs text-gray-500 mt-1">
            Start tracking your expenses
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Recent Transactions</CardTitle>
          <Link
            href="/transactions"
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {transactions.map((transaction) => {
            const category = transaction.category_id ? categories.get(transaction.category_id) : undefined
            const date = new Date(transaction.date)
            const formattedDate = date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })

            return (
              <div
                key={transaction.id}
                className="flex justify-between items-start p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {category?.icon && (
                      <span className="text-lg">{category.icon}</span>
                    )}
                    <div>
                      <p className="font-medium text-sm">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {category?.name || 'Unknown'} • {formattedDate}
                      </p>
                      {transaction.merchant && (
                        <p className="text-xs text-gray-400">
                          {transaction.merchant}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-semibold text-sm ${
                      transaction.is_income ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {transaction.is_income ? '+' : '-'}$
                    {transaction.amount.toFixed(2)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { transactionService } from '@/lib/services/transactions'
import { categoryService } from '@/lib/services/categories'
import { TransactionForm } from '@/components/features/TransactionForm'
import { TransactionList } from '@/components/features/TransactionList'
import { Card } from '@/components/ui/Card'
import type { Transaction, Category } from '@/types'

export default function TransactionsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch data on mount
  useEffect(() => {
    if (user) {
      fetchData()
    }
  }, [user])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch transactions and categories in parallel
      const [transactionsResult, categoriesResult] = await Promise.all([
        transactionService.getTransactions(),
        categoryService.getCategories(),
      ])

      if (transactionsResult.error) {
        setError('Failed to load transactions')
        setTransactions([])
      } else {
        setTransactions(transactionsResult.data || [])
      }

      if (categoriesResult.error) {
        setError('Failed to load categories')
        setCategories([])
      } else {
        setCategories(categoriesResult.data || [])
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleAddTransaction = async (transactionData: {
    amount: number
    date: string
    category_id: string
    description: string
    merchant: string
    is_income: boolean
  }) => {
    const result = await transactionService.createTransaction(transactionData)

    if (result.error) {
      throw new Error('Failed to create transaction')
    }

    // Refresh the transaction list
    await fetchData()
  }

  const handleEditTransaction = (transaction: Transaction) => {
    // TODO: Implement edit functionality in future iteration
    console.log('Edit transaction:', transaction)
  }

  const handleDeleteTransaction = async (id: string) => {
    const result = await transactionService.deleteTransaction(id)

    if (result.error) {
      setError('Failed to delete transaction')
      return
    }

    // Refresh the transaction list
    await fetchData()
  }

  // Show loading while checking authentication
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Transactions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Transaction Form - Left side on large screens */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Add Transaction
            </h2>
            <TransactionForm
              categories={categories}
              onSubmit={handleAddTransaction}
            />
          </Card>
        </div>

        {/* Transaction List - Right side on large screens */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Your Transactions
            </h2>
            <TransactionList
              transactions={transactions}
              categories={categories}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
              isLoading={loading}
              error={error || undefined}
            />
          </Card>
        </div>
      </div>
    </div>
  )
}

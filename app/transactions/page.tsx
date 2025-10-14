'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/layout/Navigation'
import { transactionService } from '@/lib/services/transactions'
import { categoryService } from '@/lib/services/categories'
import { TransactionForm } from '@/components/features/TransactionForm'
import { TransactionList } from '@/components/features/TransactionList'
import { Card } from '@/components/ui/Card'
import type { Transaction, Category } from '@/types'

export default function TransactionsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const isMountedRef = useRef(false)

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

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Fetch data on mount
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      if (cancelled) return

      if (!cancelled) {
        setLoading(true)
        setError(null)
      }

      try {
        // Fetch transactions and categories in parallel
        const [transactionsResult, categoriesResult] = await Promise.all([
          transactionService.getTransactions(),
          categoryService.getCategories(),
        ])

        if (cancelled) return

        // Batch all state updates together
        const newTransactions = transactionsResult.error ? [] : (transactionsResult.data || [])
        const newCategories = categoriesResult.error ? [] : (categoriesResult.data || [])
        const newError = transactionsResult.error ? 'Failed to load transactions'
                       : categoriesResult.error ? 'Failed to load categories'
                       : null

        // Single state update batch
        if (!cancelled) {
          setTransactions(newTransactions)
          setCategories(newCategories)
          setError(newError)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError('An unexpected error occurred')
          setLoading(false)
        }
      }
    }

    if (user) {
      fetchData()
    }

    return () => {
      cancelled = true
    }
  }, [user])

  const fetchData = async () => {
    if (!isMountedRef.current) return

    if (isMountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      // Fetch transactions and categories in parallel
      const [transactionsResult, categoriesResult] = await Promise.all([
        transactionService.getTransactions(),
        categoryService.getCategories(),
      ])

      if (!isMountedRef.current) return

      // Batch all state updates together
      const newTransactions = transactionsResult.error ? [] : (transactionsResult.data || [])
      const newCategories = categoriesResult.error ? [] : (categoriesResult.data || [])
      const newError = transactionsResult.error ? 'Failed to load transactions'
                     : categoriesResult.error ? 'Failed to load categories'
                     : null

      // Single state update batch
      if (isMountedRef.current) {
        setTransactions(newTransactions)
        setCategories(newCategories)
        setError(newError)
        setLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('An unexpected error occurred')
        setLoading(false)
      }
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
    <div className="min-h-screen bg-gray-50">
      <Navigation />
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
    </div>
  )
}

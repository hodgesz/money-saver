'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/layout/Navigation'
import { transactionService } from '@/lib/services/transactions'
import { categoryService } from '@/lib/services/categories'
import { transactionLinkingService } from '@/lib/services/transactionLinking'
import { TransactionForm } from '@/components/features/TransactionForm'
import { TransactionList } from '@/components/features/TransactionList'
import { TransactionEditModal } from '@/components/features/TransactionEditModal'
import { LinkSuggestionsPanel } from '@/components/features/LinkSuggestionsPanel'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { Transaction, Category } from '@/types'
import type { LinkedTransaction, LinkSuggestion } from '@/lib/types/transactionLinking'

export default function TransactionsPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const isMountedRef = useRef(false)

  const [transactions, setTransactions] = useState<LinkedTransaction[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_LIMIT = 25
  const [editingTransaction, setEditingTransaction] = useState<LinkedTransaction | null>(null)

  // Linking state (automatic suggestions only)
  const [linkSuggestions, setLinkSuggestions] = useState<LinkSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)

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
          transactionService.getTransactionsWithFilters({ page: currentPage, limit: PAGE_LIMIT }),
          categoryService.getCategories(),
        ])

        if (cancelled) return

        // Batch all state updates together
        const newTransactions = transactionsResult.error ? [] : (transactionsResult.data || [])
        const newCategories = categoriesResult.error ? [] : (categoriesResult.data || [])
        const newError = transactionsResult.error ? 'Failed to load transactions'
                       : categoriesResult.error ? 'Failed to load categories'
                       : null

        // Check if there are more transactions (if we got less than PAGE_LIMIT, we're on the last page)
        const hasMoreTransactions = newTransactions.length === PAGE_LIMIT

        // Single state update batch
        if (!cancelled) {
          setTransactions(newTransactions)
          setCategories(newCategories)
          setError(newError)
          setHasMore(hasMoreTransactions)
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
  }, [user, currentPage])

  const fetchData = async (page: number = currentPage) => {
    if (!isMountedRef.current) return

    if (isMountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      // Fetch transactions and categories in parallel with pagination
      const [transactionsResult, categoriesResult] = await Promise.all([
        transactionService.getTransactionsWithFilters({ page, limit: PAGE_LIMIT }),
        categoryService.getCategories(),
      ])

      if (!isMountedRef.current) return

      // Batch all state updates together
      const newTransactions = transactionsResult.error ? [] : (transactionsResult.data || [])
      const newCategories = categoriesResult.error ? [] : (categoriesResult.data || [])
      const newError = transactionsResult.error ? 'Failed to load transactions'
                     : categoriesResult.error ? 'Failed to load categories'
                     : null

      // Check if there are more transactions
      const hasMoreTransactions = newTransactions.length === PAGE_LIMIT

      // Single state update batch
      if (isMountedRef.current) {
        setTransactions(newTransactions)
        setCategories(newCategories)
        setError(newError)
        setHasMore(hasMoreTransactions)
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

    // Reset to page 1 and refresh the transaction list
    setCurrentPage(1)
    await fetchData(1)
  }

  const handleEditTransaction = (transaction: LinkedTransaction) => {
    setEditingTransaction(transaction)
  }

  const handleSaveEdit = async (id: string, data: {
    amount: number
    date: string
    category_id: string | null
    description: string
    merchant: string
    is_income: boolean
  }) => {
    const result = await transactionService.updateTransaction(id, data)

    if (result.error) {
      throw new Error('Failed to update transaction')
    }

    // Refresh the current page
    await fetchData()
  }

  const handleDeleteTransaction = async (id: string) => {
    const result = await transactionService.deleteTransaction(id)

    if (result.error) {
      setError('Failed to delete transaction')
      return
    }

    // If we're on a page with only 1 transaction, go back a page
    if (transactions.length === 1 && currentPage > 1) {
      setCurrentPage(currentPage - 1)
      await fetchData(currentPage - 1)
    } else {
      // Refresh the current page
      await fetchData()
    }
  }

  const handleUnlinkTransaction = async (id: string) => {
    const result = await transactionLinkingService.removeLink(id)

    if (!result.success) {
      setError('Failed to unlink transaction')
      return
    }

    // Refresh data
    await fetchData()
  }

  const fetchLinkSuggestions = async () => {
    if (!user) return

    setSuggestionsLoading(true)

    try {
      const suggestions = await transactionLinkingService.getLinkSuggestions(user.id)
      setLinkSuggestions(suggestions)
    } catch (err) {
      console.error('Failed to fetch link suggestions:', err)
    } finally {
      setSuggestionsLoading(false)
    }
  }

  const handleAcceptSuggestion = async (suggestion: LinkSuggestion) => {
    const childIds = suggestion.childTransactions.map(t => t.id)
    const result = await transactionLinkingService.createLink({
      parentTransactionId: suggestion.parentTransaction.id,
      childTransactionIds: childIds,
      linkType: 'auto',
      confidence: suggestion.confidence,
    })

    if (!result.success) {
      setError('Failed to accept suggestion')
      return
    }

    // Refresh data and suggestions
    await fetchData()
    await fetchLinkSuggestions()
  }

  const handleRejectSuggestion = async (suggestion: LinkSuggestion) => {
    // Just remove from UI for now (could add reject tracking in future)
    setLinkSuggestions(prev =>
      prev.filter(s => s.parentTransaction.id !== suggestion.parentTransaction.id)
    )
  }

  // Fetch suggestions on mount
  useEffect(() => {
    if (user && !authLoading) {
      fetchLinkSuggestions()
    }
  }, [user, authLoading])

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

        {/* Link Suggestions Panel */}
        {linkSuggestions.length > 0 && (
          <div className="mb-8">
            <LinkSuggestionsPanel
              suggestions={linkSuggestions}
              categories={categories}
              isLoading={suggestionsLoading}
              onAccept={handleAcceptSuggestion}
              onReject={handleRejectSuggestion}
              onRefresh={fetchLinkSuggestions}
            />
          </div>
        )}

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
              onUnlink={handleUnlinkTransaction}
              isLoading={loading}
              error={error || undefined}
            />

            {/* Pagination Controls */}
            {!loading && !error && transactions.length > 0 && (
              <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                <Button
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                  variant="secondary"
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-600">
                  Page {currentPage}
                </span>
                <Button
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!hasMore}
                  variant="secondary"
                >
                  Next
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
      </div>

      {/* Edit Modal */}
      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          categories={categories}
          isOpen={!!editingTransaction}
          onClose={() => setEditingTransaction(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}

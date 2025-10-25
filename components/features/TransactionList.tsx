'use client'

import { useState, useMemo, ChangeEvent } from 'react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { LinkedTransactionRow } from './LinkedTransactionRow'
import type { LinkedTransaction } from '@/lib/types/transactionLinking'
import type { Category } from '@/types'

interface TransactionListProps {
  transactions: LinkedTransaction[]
  categories: Category[]
  onEdit: (transaction: LinkedTransaction) => void
  onDelete: (id: string) => void
  onLink: (transaction: LinkedTransaction) => void
  onUnlink: (id: string) => void
  isLoading?: boolean
  error?: string
}

type SortField = 'date' | 'amount' | 'description'

export function TransactionList({
  transactions,
  categories,
  onEdit,
  onDelete,
  onLink,
  onUnlink,
  isLoading = false,
  error,
}: TransactionListProps) {
  const [sortBy, setSortBy] = useState<SortField>('date')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')

  // Create a lookup map for categories
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((category) => {
      map.set(category.id, category)
    })
    return map
  }, [categories])

  // Build transaction hierarchy (group children with parents)
  const { parentTransactions, childrenMap } = useMemo(() => {
    const parents: LinkedTransaction[] = []
    const childMap = new Map<string, LinkedTransaction[]>()

    transactions.forEach((transaction) => {
      if (transaction.parent_transaction_id) {
        // This is a child transaction
        const siblings = childMap.get(transaction.parent_transaction_id) || []
        siblings.push(transaction)
        childMap.set(transaction.parent_transaction_id, siblings)
      } else {
        // This is a parent or standalone transaction
        parents.push(transaction)
      }
    })

    return { parentTransactions: parents, childrenMap: childMap }
  }, [transactions])

  // Filter and sort parent transactions (client-side)
  // NOTE: These filters only apply to transactions on the current page.
  // For server-side filtering across all transactions, the parent component
  // should pass categoryId/search to the backend query.
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...parentTransactions]

    // Apply category filter
    if (selectedCategoryId) {
      result = result.filter((t) => t.category_id === selectedCategoryId)
    }

    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      result = result.filter((t) => {
        const description = t.description.toLowerCase()
        const merchant = (t.merchant || '').toLowerCase()
        return description.includes(lowerSearchTerm) || merchant.includes(lowerSearchTerm)
      })
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'date':
          // Newest first
          return new Date(b.date).getTime() - new Date(a.date).getTime()
        case 'amount':
          // Highest first
          return b.amount - a.amount
        case 'description':
          // Alphabetical
          return a.description.localeCompare(b.description)
        default:
          return 0
      }
    })

    return result
  }, [parentTransactions, sortBy, searchTerm, selectedCategoryId])

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortField)
  }

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategoryId(e.target.value)
  }


  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-gray-600">Loading transactions...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  // Empty state (no transactions after filtering)
  if (filteredAndSortedTransactions.length === 0) {
    return (
      <div className="space-y-6">
        {/* Filters and controls */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* Category Filter and Sort */}
          <div className="flex gap-4">
            <div className="min-w-[200px]">
              <Label htmlFor="category-filter">Filter by Category</Label>
              <select
                id="category-filter"
                value={selectedCategoryId}
                onChange={handleCategoryChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="min-w-[200px]">
              <Label htmlFor="sort-by">Sort by</Label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={handleSortChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date (Newest First)</option>
                <option value="amount">Amount (Highest First)</option>
                <option value="description">Description (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Empty state message */}
        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-600 mb-2">No transactions found</p>
          <p className="text-sm text-gray-500">
            {transactions.length === 0
              ? 'Add your first transaction to get started'
              : 'Try adjusting your filters'}
          </p>
        </div>
      </div>
    )
  }

  const transactionCount = filteredAndSortedTransactions.length
  const transactionLabel = transactionCount === 1 ? 'transaction' : 'transactions'

  return (
    <div className="space-y-6">
      {/* Filters and controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {/* Category Filter and Sort */}
        <div className="flex gap-4">
          <div className="min-w-[200px]">
            <Label htmlFor="category-filter">Filter by Category</Label>
            <select
              id="category-filter"
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[200px]">
            <Label htmlFor="sort-by">Sort by</Label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={handleSortChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Date (Newest First)</option>
              <option value="amount">Amount (Highest First)</option>
              <option value="description">Description (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction count */}
      <div className="text-sm text-gray-600">
        Showing {transactionCount} {transactionLabel}
      </div>

      {/* Transactions table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" role="table">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left p-4 font-semibold text-gray-700" role="columnheader">
                Date
              </th>
              <th className="text-left p-4 font-semibold text-gray-700" role="columnheader">
                Description
              </th>
              <th className="text-left p-4 font-semibold text-gray-700" role="columnheader">
                Category
              </th>
              <th className="text-right p-4 font-semibold text-gray-700" role="columnheader">
                Amount
              </th>
              <th className="text-right p-4 font-semibold text-gray-700" role="columnheader">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedTransactions.map((transaction) => (
              <LinkedTransactionRow
                key={transaction.id}
                transaction={transaction}
                children={childrenMap.get(transaction.id) || []}
                categories={categories}
                onEdit={onEdit}
                onDelete={onDelete}
                onLink={onLink}
                onUnlink={onUnlink}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

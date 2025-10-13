'use client'

import { useState, useMemo, ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { Transaction, Category } from '@/types'

interface TransactionListProps {
  transactions: Transaction[]
  categories: Category[]
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  isLoading?: boolean
  error?: string
}

type SortField = 'date' | 'amount' | 'description'

export function TransactionList({
  transactions,
  categories,
  onEdit,
  onDelete,
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

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let result = [...transactions]

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
  }, [transactions, sortBy, searchTerm, selectedCategoryId])

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortField)
  }

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategoryId(e.target.value)
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const getCategoryName = (categoryId: string): string => {
    return categoryMap.get(categoryId)?.name || 'Unknown'
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
              <tr
                key={transaction.id}
                data-testid="transaction-item"
                data-is-income={transaction.is_income}
                className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <td className="p-4 text-gray-700">
                  {formatDate(transaction.date)}
                </td>
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {transaction.description}
                    </span>
                    {transaction.merchant && (
                      <span className="text-sm text-gray-600">
                        {transaction.merchant}
                      </span>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {getCategoryName(transaction.category_id)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <span
                    className={`font-semibold ${
                      transaction.is_income ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(transaction.amount)}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(transaction)}
                      aria-label={`Edit ${transaction.description}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(transaction.id)}
                      aria-label={`Delete ${transaction.description}`}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

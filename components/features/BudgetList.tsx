'use client'

import { useState, useMemo, useCallback, ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Label } from '@/components/ui/Label'
import type { Budget, Category } from '@/types'

interface BudgetListProps {
  budgets: Budget[]
  categories: Category[]
  onEdit: (budget: Budget) => void
  onDelete: (id: string) => void
  isLoading?: boolean
  error?: string
}

type SortOption = 'amount' | 'period' | 'created'

export function BudgetList({
  budgets,
  categories,
  onEdit,
  onDelete,
  isLoading = false,
  error,
}: BudgetListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<SortOption>('amount')

  // Helper function to get category name by ID
  const getCategoryName = useCallback((categoryId: string): string => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || 'Unknown Category'
  }, [categories])

  // Filter budgets by search term (searches category name)
  const filteredBudgets = useMemo(() => {
    if (!searchTerm) return budgets

    return budgets.filter((budget) => {
      const categoryName = getCategoryName(budget.category_id)
      return categoryName.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [budgets, searchTerm, getCategoryName])

  // Sort budgets
  const sortedBudgets = useMemo(() => {
    const sorted = [...filteredBudgets]

    switch (sortBy) {
      case 'amount':
        return sorted.sort((a, b) => b.amount - a.amount) // Highest first
      case 'period':
        return sorted.sort((a, b) => a.period.localeCompare(b.period))
      case 'created':
        return sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ) // Newest first
      default:
        return sorted
    }
  }, [filteredBudgets, sortBy])

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortOption)
  }

  // Format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  // Format date
  const formatDate = (dateString: string): string => {
    return dateString // Keep ISO format for display
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Loading budgets...</p>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    )
  }

  // Empty state
  if (budgets.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg">
        <p className="text-gray-600 mb-2">No budgets found</p>
        <p className="text-sm text-gray-500">
          Add your first budget to start tracking your spending limits
        </p>
      </div>
    )
  }

  // Count
  const budgetCount = sortedBudgets.length
  const budgetText = budgetCount === 1 ? '1 budget' : `${budgetCount} budgets`

  return (
    <div className="space-y-4">
      {/* Search and Sort Controls */}
      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search budgets by category..."
            value={searchTerm}
            onChange={handleSearchChange}
            aria-label="Search budgets"
          />
        </div>

        <div className="w-48">
          <Label htmlFor="sort-budgets">Sort by</Label>
          <Select
            id="sort-budgets"
            value={sortBy}
            onChange={handleSortChange}
            aria-label="Sort budgets"
          >
            <option value="amount">Amount (Highest)</option>
            <option value="period">Period</option>
            <option value="created">Created (Newest)</option>
          </Select>
        </div>
      </div>

      {/* Budget Count */}
      <div className="text-sm text-gray-600">
        Showing {budgetText}
      </div>

      {/* Budget List or Empty Search Result */}
      {sortedBudgets.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg">
          <p className="text-gray-600 mb-2">No budgets found</p>
          <p className="text-sm text-gray-500">
            Try adjusting your search terms
          </p>
        </div>
      ) : (
        <ul className="space-y-3" role="list">
          {sortedBudgets.map((budget) => {
            const categoryName = getCategoryName(budget.category_id)

            return (
              <li
                key={budget.id}
                data-testid="budget-item"
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                role="listitem"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {categoryName}
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                      {budget.period}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="font-semibold text-lg text-gray-900">
                      {formatCurrency(budget.amount)}
                    </span>
                    <span>
                      {formatDate(budget.start_date)} -{' '}
                      {budget.end_date ? formatDate(budget.end_date) : 'Ongoing'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(budget)}
                    aria-label={`Edit ${categoryName} budget`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDelete(budget.id)}
                    aria-label={`Delete ${categoryName} budget`}
                  >
                    Delete
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

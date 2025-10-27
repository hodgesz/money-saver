'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import type { LinkedTransaction } from '@/lib/types/transactionLinking'
import type { Category } from '@/types'
import { getConfidenceLevel } from '@/lib/types/transactionLinking'

interface LinkedTransactionRowProps {
  transaction: LinkedTransaction
  childTransactions?: LinkedTransaction[]
  categories: Category[]
  onEdit: (transaction: LinkedTransaction) => void
  onDelete: (id: string) => void
  onLink: (transaction: LinkedTransaction) => void
  onUnlink: (id: string) => void
  isChild?: boolean
}

export function LinkedTransactionRow({
  transaction,
  childTransactions = [],
  categories,
  onEdit,
  onDelete,
  onLink,
  onUnlink,
  isChild = false,
}: LinkedTransactionRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)

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

  const getCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return 'Uncategorized'
    const category = categories.find(c => c.id === categoryId)
    return category?.name || 'Unknown'
  }

  const getConfidenceBadge = () => {
    if (transaction.link_type === 'manual') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          MANUAL
        </span>
      )
    }

    if (transaction.link_confidence === null) return null

    const level = getConfidenceLevel(transaction.link_confidence)
    const colors = {
      EXACT: 'bg-green-100 text-green-800',
      PARTIAL: 'bg-yellow-100 text-yellow-800',
      FUZZY: 'bg-orange-100 text-orange-800',
      UNMATCHED: 'bg-gray-100 text-gray-800',
    }

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[level]}`}>
        {level} ({transaction.link_confidence}%)
      </span>
    )
  }

  const hasChildren = childTransactions.length > 0
  const isParent = hasChildren && !isChild

  return (
    <>
      {/* Main Transaction Row */}
      <tr
        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
          isChild ? 'bg-gray-50' : ''
        }`}
        data-testid="transaction-item"
        data-is-income={transaction.is_income}
      >
        {/* Date */}
        <td className="p-4 text-gray-700">
          <div className="flex items-center gap-2">
            {isChild && (
              <span className="text-gray-400" aria-label="Child transaction">
                ↳
              </span>
            )}
            {isParent && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-blue-600 hover:text-blue-700"
                aria-label={isExpanded ? 'Collapse linked items' : 'Expand linked items'}
                aria-expanded={isExpanded}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
            {formatDate(transaction.date)}
          </div>
        </td>

        {/* Description */}
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
            {isParent && (
              <span className="text-xs text-blue-600 mt-1">
                {childTransactions.length} linked items
              </span>
            )}
            {isChild && getConfidenceBadge()}
          </div>
        </td>

        {/* Category */}
        <td className="p-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {getCategoryName(transaction.category_id)}
          </span>
        </td>

        {/* Amount */}
        <td className="p-4 text-right">
          <span
            className={`font-semibold ${
              transaction.is_income ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(transaction.amount)}
          </span>
        </td>

        {/* Actions */}
        <td className="p-4 text-right">
          <div className="flex justify-end gap-2">
            {!isChild && !hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onLink(transaction)}
                aria-label={`Link items to ${transaction.description}`}
                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              >
                Link Items
              </Button>
            )}
            {isChild && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onUnlink(transaction.id)}
                aria-label={`Unlink ${transaction.description}`}
                className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              >
                Unlink
              </Button>
            )}
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

      {/* Child Rows (when expanded) */}
      {isParent && isExpanded && childTransactions.map((child) => (
        <LinkedTransactionRow
          key={child.id}
          transaction={child}
          categories={categories}
          onEdit={onEdit}
          onDelete={onDelete}
          onLink={onLink}
          onUnlink={onUnlink}
          isChild
        />
      ))}
    </>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import type { LinkedTransaction } from '@/lib/types/transactionLinking'
import type { Category } from '@/types'

interface TransactionLinkingModalProps {
  parentTransaction: LinkedTransaction
  candidateTransactions: LinkedTransaction[]
  categories: Category[]
  isOpen: boolean
  onClose: () => void
  onLink: (parentId: string, childIds: string[]) => Promise<void>
}

export function TransactionLinkingModal({
  parentTransaction,
  candidateTransactions,
  categories,
  isOpen,
  onClose,
  onLink,
}: TransactionLinkingModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set())
    }
  }, [isOpen])

  if (!isOpen) return null

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

  const handleToggleTransaction = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleToggleAll = () => {
    if (selectedIds.size === candidateTransactions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(candidateTransactions.map(t => t.id)))
    }
  }

  const calculateSelectedTotal = (): number => {
    return candidateTransactions
      .filter(t => selectedIds.has(t.id))
      .reduce((sum, t) => sum + t.amount, 0)
  }

  const selectedTotal = calculateSelectedTotal()
  const parentAmount = parentTransaction.amount
  const amountDifference = Math.abs(parentAmount - selectedTotal)
  const percentDiff = parentAmount > 0 ? (amountDifference / parentAmount) * 100 : 0

  const amountsMatch = percentDiff < 0.5 // Within 0.5%
  const showAmountWarning = selectedIds.size > 0 && !amountsMatch

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return

    setIsSubmitting(true)
    try {
      await onLink(parentTransaction.id, Array.from(selectedIds))
      onClose()
    } catch (error) {
      // Error handling would go here
      console.error('Failed to create links:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const allSelected = selectedIds.size === candidateTransactions.length && candidateTransactions.length > 0

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-3xl sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4" id="modal-title">
                Link Items to Transaction
              </h3>

              {/* Parent Transaction Display */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{parentTransaction.description}</p>
                    <p className="text-sm text-gray-600">{formatDate(parentTransaction.date)}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {getCategoryName(parentTransaction.category_id)}
                    </p>
                  </div>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(parentAmount)}</p>
                </div>
              </div>

              {/* Empty State */}
              {candidateTransactions.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No matching transactions found within date range.</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Try importing Amazon transactions or adjusting the search criteria.
                  </p>
                </div>
              )}

              {/* Candidate Transactions List */}
              {candidateTransactions.length > 0 && (
                <>
                  <div className="mb-4">
                    <Label htmlFor="select-all" className="flex items-center gap-2 cursor-pointer">
                      <input
                        id="select-all"
                        type="checkbox"
                        checked={allSelected}
                        onChange={handleToggleAll}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        aria-label="Select all"
                      />
                      <span className="text-sm font-medium">Select All ({candidateTransactions.length} items)</span>
                    </Label>
                  </div>

                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    {candidateTransactions.map((transaction) => (
                      <label
                        key={transaction.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(transaction.id)}
                          onChange={() => handleToggleTransaction(transaction.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          aria-label={`Select ${transaction.description}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(transaction.date)}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(transaction.amount)}
                        </p>
                      </label>
                    ))}
                  </div>

                  {/* Amount Summary */}
                  {selectedIds.size > 0 && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Selected Items Total:</span>
                        <span className="font-semibold">{formatCurrency(selectedTotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-600">Parent Transaction:</span>
                        <span className="font-semibold">{formatCurrency(parentAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium pt-2 border-t border-gray-200">
                        <span className="text-gray-700">Difference:</span>
                        <span className={amountsMatch ? 'text-green-600' : 'text-orange-600'}>
                          {formatCurrency(amountDifference)}
                        </span>
                      </div>

                      {amountsMatch && (
                        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Amounts match perfectly!
                        </p>
                      )}

                      {showAmountWarning && (
                        <p className="text-xs text-orange-600 mt-2 flex items-center gap-1">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          Selected total differs from parent amount ({percentDiff.toFixed(1)}%)
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Action Buttons */}
              <div className="mt-6 sm:flex sm:flex-row-reverse gap-3">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={selectedIds.size === 0 || isSubmitting}
                >
                  {isSubmitting ? 'Linking...' : 'Link'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { Transaction, Category } from '@/types'

interface TransactionEditModalProps {
  transaction: Transaction
  categories: Category[]
  isOpen: boolean
  onClose: () => void
  onSave: (id: string, data: {
    amount: number
    date: string
    category_id: string | null
    description: string
    merchant: string
    is_income: boolean
  }) => Promise<void>
}

export function TransactionEditModal({
  transaction,
  categories,
  isOpen,
  onClose,
  onSave,
}: TransactionEditModalProps) {
  const [formData, setFormData] = useState({
    amount: transaction.amount.toString(),
    date: transaction.date,
    category_id: transaction.category_id || '',
    description: transaction.description,
    merchant: transaction.merchant || '',
    is_income: transaction.is_income,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset form when transaction changes
  useEffect(() => {
    setFormData({
      amount: transaction.amount.toString(),
      date: transaction.date,
      category_id: transaction.category_id || '',
      description: transaction.description,
      merchant: transaction.merchant || '',
      is_income: transaction.is_income,
    })
    setError(null)
  }, [transaction])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const amount = parseFloat(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    setIsSubmitting(true)
    try {
      await onSave(transaction.id, {
        amount,
        date: formData.date,
        category_id: formData.category_id || null,
        description: formData.description,
        merchant: formData.merchant,
        is_income: formData.is_income,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900" id="modal-title">
                Edit Transaction
              </h3>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {/* Amount */}
                <div>
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                {/* Date */}
                <div>
                  <Label htmlFor="edit-date">Date</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <Label htmlFor="edit-category_id">Category</Label>
                  <select
                    id="edit-category_id"
                    value={formData.category_id}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                {/* Merchant */}
                <div>
                  <Label htmlFor="edit-merchant">Merchant</Label>
                  <Input
                    id="edit-merchant"
                    type="text"
                    value={formData.merchant}
                    onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  />
                </div>

                {/* Is Income */}
                <div className="flex items-center">
                  <input
                    id="edit-is_income"
                    type="checkbox"
                    checked={formData.is_income}
                    onChange={(e) => setFormData({ ...formData, is_income: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="edit-is_income" className="ml-2 mb-0">
                    This is income
                  </Label>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
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
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

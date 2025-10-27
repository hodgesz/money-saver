'use client'

import { useState, FormEvent, ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { Category } from '@/types'

interface TransactionFormData {
  amount: number | string
  date: string
  category_id: string
  description: string
  merchant: string
  is_income: boolean
}

interface TransactionFormProps {
  categories: Category[]
  onSubmit: (data: {
    amount: number
    date: string
    category_id: string
    description: string
    merchant: string
    is_income: boolean
  }) => Promise<void> | void
}

interface ValidationErrors {
  amount?: string
  date?: string
  category_id?: string
  description?: string
}

export function TransactionForm({ categories, onSubmit }: TransactionFormProps) {
  const today = new Date().toISOString().split('T')[0]

  const [formData, setFormData] = useState<TransactionFormData>({
    amount: '',
    date: today,
    category_id: '',
    description: '',
    merchant: '',
    is_income: false,
  })

  const [errors, setErrors] = useState<ValidationErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target

    let newValue: string | number | boolean = value

    // Handle checkbox for is_income radio buttons
    if (type === 'radio') {
      newValue = (e.target as HTMLInputElement).value === 'true'
    }

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))

    // Clear error for this field when user starts typing
    if (errors[name as keyof ValidationErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }

    // Clear submit error when user makes changes
    if (submitError) {
      setSubmitError(null)
    }
  }

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {}

    // Amount validation
    if (!formData.amount || formData.amount === '') {
      newErrors.amount = 'Amount is required'
    } else {
      const amountNum = typeof formData.amount === 'string'
        ? parseFloat(formData.amount)
        : formData.amount

      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.amount = 'Amount must be greater than 0'
      }
    }

    // Date validation
    if (!formData.date) {
      newErrors.date = 'Date is required'
    }

    // Category validation
    if (!formData.category_id) {
      newErrors.category_id = 'Category is required'
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      await onSubmit({
        amount: typeof formData.amount === 'string'
          ? parseFloat(formData.amount)
          : formData.amount,
        date: formData.date,
        category_id: formData.category_id,
        description: formData.description.trim(),
        merchant: formData.merchant.trim(),
        is_income: formData.is_income,
      })

      // Reset form on success
      setFormData({
        amount: '',
        date: today,
        category_id: '',
        description: '',
        merchant: '',
        is_income: false,
      })
      setErrors({})
    } catch (error) {
      setSubmitError('Failed to add transaction. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const noCategoriesAvailable = categories.length === 0

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Income/Expense Toggle */}
      <div className="space-y-2">
        <Label>Transaction Type</Label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="is_income"
              value="false"
              checked={!formData.is_income}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-4 h-4 text-blue-600"
            />
            <span>Expense</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="is_income"
              value="true"
              checked={formData.is_income}
              onChange={handleChange}
              disabled={isSubmitting}
              className="w-4 h-4 text-green-600"
            />
            <span>Income</span>
          </label>
        </div>
      </div>

      {/* Amount Field */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          name="amount"
          type="number"
          step="0.01"
          value={formData.amount}
          onChange={handleChange}
          disabled={isSubmitting}
          className={errors.amount ? 'border-red-500' : ''}
        />
        {errors.amount && (
          <p className="text-sm text-red-600">{errors.amount}</p>
        )}
      </div>

      {/* Date Field */}
      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input
          id="date"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleChange}
          disabled={isSubmitting}
          className={errors.date ? 'border-red-500' : ''}
        />
        {errors.date && (
          <p className="text-sm text-red-600">{errors.date}</p>
        )}
      </div>

      {/* Category Field */}
      <div className="space-y-2">
        <Label htmlFor="category_id">Category</Label>
        {noCategoriesAvailable ? (
          <p className="text-sm text-gray-600">
            No categories available. Please create a category first.
          </p>
        ) : (
          <select
            id="category_id"
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            disabled={isSubmitting}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.category_id ? 'border-red-500' : 'border-gray-300'
            } ${isSubmitting ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
        {errors.category_id && (
          <p className="text-sm text-red-600">{errors.category_id}</p>
        )}
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          type="text"
          value={formData.description}
          onChange={handleChange}
          disabled={isSubmitting}
          placeholder="Enter transaction description"
          className={errors.description ? 'border-red-500' : ''}
        />
        {errors.description && (
          <p className="text-sm text-red-600">{errors.description}</p>
        )}
      </div>

      {/* Merchant Field (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="merchant">Merchant (Optional)</Label>
        <Input
          id="merchant"
          name="merchant"
          type="text"
          value={formData.merchant}
          onChange={handleChange}
          disabled={isSubmitting}
          placeholder="Enter merchant name"
        />
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isSubmitting || noCategoriesAvailable}
        className="w-full"
      >
        {isSubmitting ? 'Adding...' : 'Add Transaction'}
      </Button>
    </form>
  )
}

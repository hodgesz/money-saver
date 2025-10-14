'use client'

import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select } from '@/components/ui/Select'
import type { Budget, BudgetFormData, Category } from '@/types'

interface BudgetFormProps {
  onSubmit: (data: BudgetFormData) => Promise<void>
  onCancel?: () => void
  budget?: Budget // If provided, we're in edit mode
  categories: Category[]
}

interface FormErrors {
  category_id?: string
  amount?: string
  period?: string
  start_date?: string
  end_date?: string
}

export function BudgetForm({ onSubmit, onCancel, budget, categories }: BudgetFormProps) {
  const isEditMode = Boolean(budget)
  const hasCategories = categories.length > 0

  // Form state
  const [categoryId, setCategoryId] = useState(budget?.category_id || '')
  const [amount, setAmount] = useState(budget?.amount?.toString() || '')
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>(
    budget?.period || 'monthly'
  )
  const [startDate, setStartDate] = useState(budget?.start_date || '')
  const [endDate, setEndDate] = useState(budget?.end_date || '')

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Update form when budget changes (for edit mode)
  useEffect(() => {
    if (budget) {
      setCategoryId(budget.category_id)
      setAmount(budget.amount.toString())
      setPeriod(budget.period)
      setStartDate(budget.start_date)
      setEndDate(budget.end_date || '')
    }
  }, [budget])

  // Clear field error when user starts typing
  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setCategoryId(e.target.value)
    if (errors.category_id) {
      setErrors((prev) => ({ ...prev, category_id: undefined }))
    }
    setSubmitError(null)
  }

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    setAmount(e.target.value)
    if (errors.amount) {
      setErrors((prev) => ({ ...prev, amount: undefined }))
    }
    setSubmitError(null)
  }

  const handlePeriodChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setPeriod(e.target.value as typeof period)
    if (errors.period) {
      setErrors((prev) => ({ ...prev, period: undefined }))
    }
    setSubmitError(null)
  }

  const handleStartDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setStartDate(e.target.value)
    if (errors.start_date) {
      setErrors((prev) => ({ ...prev, start_date: undefined }))
    }
    setSubmitError(null)
  }

  const handleEndDateChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEndDate(e.target.value)
    if (errors.end_date) {
      setErrors((prev) => ({ ...prev, end_date: undefined }))
    }
    setSubmitError(null)
  }

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    // Category is required
    if (!categoryId) {
      newErrors.category_id = 'Category is required'
    }

    // Amount is required and must be positive
    if (!amount) {
      newErrors.amount = 'Amount is required'
    } else {
      const amountNum = parseFloat(amount)
      if (isNaN(amountNum) || amountNum <= 0) {
        newErrors.amount = 'Amount must be greater than zero'
      }
    }

    // Start date is required
    if (!startDate) {
      newErrors.start_date = 'Start date is required'
    }

    // End date must be after start date if provided
    if (endDate && startDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      if (end <= start) {
        newErrors.end_date = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    // Reset submission error
    setSubmitError(null)

    // Validate
    if (!validate()) {
      return
    }

    setIsSubmitting(true)

    try {
      const formData: BudgetFormData = {
        category_id: categoryId,
        amount: parseFloat(amount),
        period,
        start_date: startDate,
        end_date: endDate || undefined,
      }

      await onSubmit(formData)

      // Reset form only in create mode
      if (!isEditMode) {
        setCategoryId('')
        setAmount('')
        setPeriod('monthly')
        setStartDate('')
        setEndDate('')
        setErrors({})
      }
    } catch (error) {
      setSubmitError('Failed to save budget. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Show message if no categories available
  if (!hasCategories) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          No categories available. Please create a category first before adding a budget.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Category Field */}
      <div>
        <Label htmlFor="budget-category">Category *</Label>
        <Select
          id="budget-category"
          value={categoryId}
          onChange={handleCategoryChange}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.category_id)}
          aria-describedby={errors.category_id ? 'category-error' : undefined}
          className={errors.category_id ? 'border-red-500' : ''}
        >
          <option value="">Select a category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>
        {errors.category_id && (
          <p id="category-error" className="mt-1 text-sm text-red-600">
            {errors.category_id}
          </p>
        )}
      </div>

      {/* Amount Field */}
      <div>
        <Label htmlFor="budget-amount">Amount *</Label>
        <Input
          id="budget-amount"
          type="number"
          step="0.01"
          value={amount}
          onChange={handleAmountChange}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.amount)}
          aria-describedby={errors.amount ? 'amount-error' : undefined}
          className={errors.amount ? 'border-red-500' : ''}
          placeholder="0.00"
        />
        {errors.amount && (
          <p id="amount-error" className="mt-1 text-sm text-red-600">
            {errors.amount}
          </p>
        )}
      </div>

      {/* Period Field */}
      <div>
        <Label htmlFor="budget-period">Period *</Label>
        <Select
          id="budget-period"
          value={period}
          onChange={handlePeriodChange}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.period)}
          aria-describedby={errors.period ? 'period-error' : undefined}
          className={errors.period ? 'border-red-500' : ''}
        >
          <option value="daily">Daily</option>
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="yearly">Yearly</option>
        </Select>
        {errors.period && (
          <p id="period-error" className="mt-1 text-sm text-red-600">
            {errors.period}
          </p>
        )}
      </div>

      {/* Start Date Field */}
      <div>
        <Label htmlFor="budget-start-date">Start Date *</Label>
        <Input
          id="budget-start-date"
          type="date"
          value={startDate}
          onChange={handleStartDateChange}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.start_date)}
          aria-describedby={errors.start_date ? 'start-date-error' : undefined}
          className={errors.start_date ? 'border-red-500' : ''}
        />
        {errors.start_date && (
          <p id="start-date-error" className="mt-1 text-sm text-red-600">
            {errors.start_date}
          </p>
        )}
      </div>

      {/* End Date Field */}
      <div>
        <Label htmlFor="budget-end-date">End Date (optional)</Label>
        <Input
          id="budget-end-date"
          type="date"
          value={endDate}
          onChange={handleEndDateChange}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.end_date)}
          aria-describedby={errors.end_date ? 'end-date-error' : undefined}
          className={errors.end_date ? 'border-red-500' : ''}
        />
        {errors.end_date && (
          <p id="end-date-error" className="mt-1 text-sm text-red-600">
            {errors.end_date}
          </p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Leave empty for ongoing budgets
        </p>
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{submitError}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting
            ? isEditMode
              ? 'Updating...'
              : 'Adding...'
            : isEditMode
            ? 'Update Budget'
            : 'Add Budget'}
        </Button>

        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}

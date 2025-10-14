'use client'

import { useState, useEffect, FormEvent, ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import type { Category, CategoryFormData } from '@/types'

interface CategoryFormProps {
  onSubmit: (data: CategoryFormData) => Promise<void>
  onCancel?: () => void
  category?: Category // If provided, we're in edit mode
}

interface FormErrors {
  name?: string
  color?: string
}

export function CategoryForm({ onSubmit, onCancel, category }: CategoryFormProps) {
  const isEditMode = Boolean(category)

  // Form state
  const [name, setName] = useState(category?.name || '')
  const [color, setColor] = useState(category?.color || '#3b82f6')
  const [icon, setIcon] = useState(category?.icon || '')

  // UI state
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Update form when category changes (for edit mode)
  useEffect(() => {
    if (category) {
      setName(category.name)
      setColor(category.color || '#3b82f6')
      setIcon(category.icon || '')
    }
  }, [category])

  // Clear field error when user starts typing
  const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value)
    if (errors.name) {
      setErrors((prev) => ({ ...prev, name: undefined }))
    }
    setSubmitError(null)
  }

  const handleColorChange = (e: ChangeEvent<HTMLInputElement>) => {
    setColor(e.target.value)
    if (errors.color) {
      setErrors((prev) => ({ ...prev, color: undefined }))
    }
    setSubmitError(null)
  }

  const handleIconChange = (e: ChangeEvent<HTMLInputElement>) => {
    setIcon(e.target.value)
    setSubmitError(null)
  }

  // Validate form
  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    // Name is required
    if (!name.trim()) {
      newErrors.name = 'Category name is required'
    } else if (name.length > 50) {
      newErrors.name = 'Category name must be 50 characters or less'
    }

    // Color validation (hex color format)
    if (color && !/^#[0-9A-Fa-f]{6}$/i.test(color)) {
      newErrors.color = 'Please enter a valid color in hex format (e.g., #3b82f6)'
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
      await onSubmit({
        name: name.trim(),
        color,
        icon: icon.trim(),
      })

      // Reset form only in create mode
      if (!isEditMode) {
        setName('')
        setColor('#3b82f6')
        setIcon('')
        setErrors({})
      }
    } catch (error) {
      setSubmitError('Failed to save category. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <div>
        <Label htmlFor="category-name">Category Name *</Label>
        <Input
          id="category-name"
          type="text"
          value={name}
          onChange={handleNameChange}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={errors.name ? 'border-red-500' : ''}
        />
        {errors.name && (
          <p id="name-error" className="mt-1 text-sm text-red-600">
            {errors.name}
          </p>
        )}
      </div>

      {/* Color Field */}
      <div>
        <Label htmlFor="category-color">Color</Label>
        <div className="flex items-center gap-3">
          <Input
            id="category-color"
            type="color"
            value={color}
            onChange={handleColorChange}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.color)}
            aria-describedby={errors.color ? 'color-error' : undefined}
            className={`w-20 h-10 cursor-pointer ${errors.color ? 'border-red-500' : ''}`}
          />
          <div
            data-testid="color-preview"
            className="w-10 h-10 rounded-full border-2 border-gray-300"
            style={{ backgroundColor: color }}
            aria-label={`Selected color: ${color}`}
          />
          <span className="text-sm text-gray-600">{color}</span>
        </div>
        {errors.color && (
          <p id="color-error" className="mt-1 text-sm text-red-600">
            {errors.color}
          </p>
        )}
      </div>

      {/* Icon Field */}
      <div>
        <Label htmlFor="category-icon">Icon (optional)</Label>
        <Input
          id="category-icon"
          type="text"
          value={icon}
          onChange={handleIconChange}
          disabled={isSubmitting}
          placeholder="e.g., shopping-cart, film, car"
        />
        <p className="mt-1 text-sm text-gray-500">
          Enter an icon name for visual identification
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
            ? 'Update Category'
            : 'Add Category'}
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

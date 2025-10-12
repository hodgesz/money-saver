'use client'

import { useState, useEffect } from 'react'
import { categoryService } from '@/lib/services/categories'
import type { Category } from '@/types'

interface CategorySelectorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  disabled?: boolean
  showGroups?: boolean
}

export function CategorySelector({
  value,
  onChange,
  label,
  error,
  disabled = false,
  showGroups = false,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error } = await categoryService.getCategories()

        if (error) {
          setLoadError(error.message || 'Failed to load categories')
          setLoading(false)
          return
        }

        setCategories(data || [])
        setLoadError(null)
      } catch (err) {
        setLoadError('Failed to load categories')
      } finally {
        setLoading(false)
      }
    }

    loadCategories()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value)
  }

  if (loading) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-black/80 dark:text-white/80">
            {label}
          </label>
        )}
        <div className="text-sm text-black/60 dark:text-white/60">Loading categories...</div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-black/80 dark:text-white/80">
            {label}
          </label>
        )}
        <div className="text-sm text-red-600 dark:text-red-400">{loadError}</div>
      </div>
    )
  }

  if (categories.length === 0) {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-black/80 dark:text-white/80">
            {label}
          </label>
        )}
        <div className="text-sm text-black/60 dark:text-white/60">No categories available</div>
      </div>
    )
  }

  const systemCategories = categories.filter((cat) => cat.user_id === null)
  const customCategories = categories.filter((cat) => cat.user_id !== null)

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor="category-selector"
          className="block text-sm font-medium text-black/80 dark:text-white/80"
        >
          {label}
        </label>
      )}
      <select
        id="category-selector"
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 rounded-lg
          bg-white dark:bg-white/5
          border border-black/10 dark:border-white/10
          text-black dark:text-white
          placeholder:text-black/40 dark:placeholder:text-white/40
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-200
          ${error ? 'border-red-500 focus:ring-red-500' : ''}
        `}
      >
        <option value="">Select a category</option>

        {showGroups ? (
          <>
            {systemCategories.length > 0 && (
              <optgroup label="System Categories">
                {systemCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon && `${category.icon} `}
                    {category.name}
                  </option>
                ))}
              </optgroup>
            )}

            {customCategories.length > 0 && (
              <optgroup label="Custom Categories">
                {customCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon && `${category.icon} `}
                    {category.name}
                  </option>
                ))}
              </optgroup>
            )}
          </>
        ) : (
          <>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.icon && `${category.icon} `}
                {category.name}
              </option>
            ))}
          </>
        )}
      </select>
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}

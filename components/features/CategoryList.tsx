'use client'

import { useState, useMemo, ChangeEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import type { Category } from '@/types'

interface CategoryListProps {
  categories: Category[]
  onEdit: (category: Category) => void
  onDelete: (id: string) => void
  isLoading?: boolean
  error?: string
}

type SortField = 'name' | 'created'

export function CategoryList({
  categories,
  onEdit,
  onDelete,
  isLoading = false,
  error,
}: CategoryListProps) {
  const [sortBy, setSortBy] = useState<SortField>('name')
  const [searchTerm, setSearchTerm] = useState('')

  // Filter and sort categories
  const filteredAndSortedCategories = useMemo(() => {
    let result = [...categories]

    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase()
      result = result.filter((cat) => {
        const name = cat.name.toLowerCase()
        return name.includes(lowerSearchTerm)
      })
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          // Alphabetical
          return a.name.localeCompare(b.name)
        case 'created':
          // Newest first
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        default:
          return 0
      }
    })

    return result
  }, [categories, sortBy, searchTerm])

  const handleSortChange = (e: ChangeEvent<HTMLSelectElement>) => {
    setSortBy(e.target.value as SortField)
  }

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-gray-600">Loading categories...</p>
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

  // Empty state (no categories after filtering)
  if (filteredAndSortedCategories.length === 0) {
    return (
      <div className="space-y-6">
        {/* Filters and controls */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={handleSearchChange}
            />
          </div>

          {/* Sort */}
          <div className="min-w-[200px]">
            <Label htmlFor="sort-by">Sort by</Label>
            <select
              id="sort-by"
              value={sortBy}
              onChange={handleSortChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="name">Name (A-Z)</option>
              <option value="created">Created (Newest First)</option>
            </select>
          </div>
        </div>

        {/* Empty state message */}
        <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg">
          <p className="text-lg text-gray-600 mb-2">No categories found</p>
          <p className="text-sm text-gray-500">
            {categories.length === 0
              ? 'Add your first custom category to get started'
              : 'Try adjusting your search'}
          </p>
        </div>
      </div>
    )
  }

  const categoryCount = filteredAndSortedCategories.length
  const categoryLabel = categoryCount === 1 ? 'category' : 'categories'

  return (
    <div className="space-y-6">
      {/* Filters and controls */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <Input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>

        {/* Sort */}
        <div className="min-w-[200px]">
          <Label htmlFor="sort-by">Sort by</Label>
          <select
            id="sort-by"
            value={sortBy}
            onChange={handleSortChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="name">Name (A-Z)</option>
            <option value="created">Created (Newest First)</option>
          </select>
        </div>
      </div>

      {/* Category count */}
      <div className="text-sm text-gray-600">
        Showing {categoryCount} {categoryLabel}
      </div>

      {/* Categories list */}
      <ul className="space-y-3" role="list">
        {filteredAndSortedCategories.map((category) => {
          const isSystemCategory = category.user_id === null

          return (
            <li
              key={category.id}
              data-testid="category-item"
              data-is-system={isSystemCategory}
              className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              role="listitem"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Color indicator */}
                <div
                  data-testid="category-color"
                  className="w-8 h-8 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category.color || '#6b7280' }}
                  aria-label={`Category color: ${category.color}`}
                />

                {/* Category info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">
                      {category.name}
                    </h3>
                    {isSystemCategory && (
                      <Badge variant="secondary" size="sm">
                        System
                      </Badge>
                    )}
                  </div>
                  {category.icon && (
                    <p className="text-sm text-gray-600 mt-1">
                      Icon: {category.icon}
                    </p>
                  )}
                </div>
              </div>

              {/* Actions - only for user categories */}
              {!isSystemCategory && (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(category)}
                    aria-label={`Edit ${category.name}`}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(category.id)}
                    aria-label={`Delete ${category.name}`}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

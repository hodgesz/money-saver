'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Navigation } from '@/components/layout/Navigation'
import { categoryService } from '@/lib/services/categories'
import { CategoryForm } from '@/components/features/CategoryForm'
import { CategoryList } from '@/components/features/CategoryList'
import { Card } from '@/components/ui/Card'
import type { Category } from '@/types'

export default function CategoriesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const isMountedRef = useRef(false)

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(undefined)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Set mounted flag
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Fetch data on mount
  useEffect(() => {
    let cancelled = false

    const fetchData = async () => {
      if (cancelled) return

      if (!cancelled) {
        setLoading(true)
        setError(null)
      }

      try {
        const categoriesResult = await categoryService.getCategories()

        if (cancelled) return

        const newCategories = categoriesResult.error ? [] : (categoriesResult.data || [])
        const newError = categoriesResult.error ? 'Failed to load categories' : null

        if (!cancelled) {
          setCategories(newCategories)
          setError(newError)
          setLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError('An unexpected error occurred')
          setLoading(false)
        }
      }
    }

    if (user) {
      fetchData()
    }

    return () => {
      cancelled = true
    }
  }, [user])

  const fetchData = async () => {
    if (!isMountedRef.current) return

    if (isMountedRef.current) {
      setLoading(true)
      setError(null)
    }

    try {
      const categoriesResult = await categoryService.getCategories()

      if (!isMountedRef.current) return

      const newCategories = categoriesResult.error ? [] : (categoriesResult.data || [])
      const newError = categoriesResult.error ? 'Failed to load categories' : null

      if (isMountedRef.current) {
        setCategories(newCategories)
        setError(newError)
        setLoading(false)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError('An unexpected error occurred')
        setLoading(false)
      }
    }
  }

  const handleAddCategory = async (categoryData: {
    name: string
    color?: string
    icon?: string
  }) => {
    const result = await categoryService.createCategory(categoryData)

    if (result.error) {
      throw new Error('Failed to create category')
    }

    // Refresh the category list and clear edit mode
    setEditingCategory(undefined)
    await fetchData()
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
  }

  const handleUpdateCategory = async (categoryData: {
    name: string
    color?: string
    icon?: string
  }) => {
    if (!editingCategory) return

    const result = await categoryService.updateCategory(editingCategory.id, categoryData)

    if (result.error) {
      throw new Error('Failed to update category')
    }

    // Refresh the category list and clear edit mode
    setEditingCategory(undefined)
    await fetchData()
  }

  const handleCancelEdit = () => {
    setEditingCategory(undefined)
  }

  const handleDeleteCategory = async (id: string) => {
    const result = await categoryService.deleteCategory(id)

    if (result.error) {
      setError('Failed to delete category')
      return
    }

    // Refresh the category list
    await fetchData()
  }

  // Show loading while checking authentication
  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Categories</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Form - Left side on large screens */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              {editingCategory ? 'Edit Category' : 'Add Category'}
            </h2>
            <CategoryForm
              onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory}
              onCancel={editingCategory ? handleCancelEdit : undefined}
              category={editingCategory}
            />
          </Card>
        </div>

        {/* Category List - Right side on large screens */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Your Categories
            </h2>
            <CategoryList
              categories={categories}
              onEdit={handleEditCategory}
              onDelete={handleDeleteCategory}
              isLoading={loading}
              error={error || undefined}
            />
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}

import { createClient } from '@/lib/supabase/client'
import { categoryService } from '../categories'
import type { Category, CategoryFormData } from '@/types'

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}))

describe('Category Service', () => {
  let mockSupabaseClient: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock Supabase client
    mockSupabaseClient = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn(),
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabaseClient)
  })

  describe('getCategories', () => {
    it('should fetch all categories (system + user)', async () => {
      const mockCategories: Category[] = [
        {
          id: '1',
          user_id: null,
          name: 'Groceries',
          color: '#10b981',
          icon: 'shopping-cart',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: 'user-123',
          name: 'Custom Category',
          color: '#3b82f6',
          icon: 'star',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      mockSupabaseClient.order.mockResolvedValue({
        data: mockCategories,
        error: null,
      })

      const result = await categoryService.getCategories()

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categories')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('name')
      expect(result.data).toEqual(mockCategories)
      expect(result.error).toBeNull()
    })

    it('should handle errors when fetching categories', async () => {
      const mockError = { message: 'Database connection failed' }

      mockSupabaseClient.order.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await categoryService.getCategories()

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('getCategoryById', () => {
    it('should fetch a single category by ID', async () => {
      const mockCategory: Category = {
        id: '1',
        user_id: 'user-123',
        name: 'Groceries',
        color: '#10b981',
        icon: 'shopping-cart',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      mockSupabaseClient.single.mockResolvedValue({
        data: mockCategory,
        error: null,
      })

      const result = await categoryService.getCategoryById('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categories')
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*')
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1')
      expect(mockSupabaseClient.single).toHaveBeenCalled()
      expect(result.data).toEqual(mockCategory)
      expect(result.error).toBeNull()
    })

    it('should handle errors when category not found', async () => {
      const mockError = { message: 'Category not found', code: 'PGRST116' }

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await categoryService.getCategoryById('nonexistent-id')

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('createCategory', () => {
    it('should create a new category', async () => {
      const categoryData: CategoryFormData = {
        name: 'New Category',
        color: '#8b5cf6',
        icon: 'star',
      }

      const mockCreatedCategory: Category = {
        id: 'new-id',
        user_id: 'user-123',
        ...categoryData,
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: [mockCreatedCategory],
        error: null,
      })

      const result = await categoryService.createCategory(categoryData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categories')
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith([categoryData])
      expect(mockSupabaseClient.select).toHaveBeenCalled()
      expect(result.data).toEqual(mockCreatedCategory)
      expect(result.error).toBeNull()
    })

    it('should handle duplicate category name error', async () => {
      const categoryData: CategoryFormData = {
        name: 'Existing Category',
        color: '#ef4444',
      }

      const mockError = {
        message: 'duplicate key value violates unique constraint',
        code: '23505',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await categoryService.createCategory(categoryData)

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('updateCategory', () => {
    it('should update an existing category', async () => {
      const updateData: Partial<CategoryFormData> = {
        name: 'Updated Category',
        color: '#f59e0b',
      }

      const mockUpdatedCategory: Category = {
        id: '1',
        user_id: 'user-123',
        name: 'Updated Category',
        color: '#f59e0b',
        icon: 'shopping-cart',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-04T00:00:00Z',
      }

      mockSupabaseClient.select.mockResolvedValue({
        data: [mockUpdatedCategory],
        error: null,
      })

      const result = await categoryService.updateCategory('1', updateData)

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categories')
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(updateData)
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1')
      expect(mockSupabaseClient.select).toHaveBeenCalled()
      expect(result.data).toEqual(mockUpdatedCategory)
      expect(result.error).toBeNull()
    })

    it('should handle errors when updating category', async () => {
      const updateData = { name: 'Updated Name' }
      const mockError = { message: 'Update failed' }

      mockSupabaseClient.select.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await categoryService.updateCategory('1', updateData)

      expect(result.data).toBeNull()
      expect(result.error).toEqual(mockError)
    })
  })

  describe('deleteCategory', () => {
    it('should delete a category', async () => {
      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: null,
      })

      const result = await categoryService.deleteCategory('1')

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('categories')
      expect(mockSupabaseClient.delete).toHaveBeenCalled()
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', '1')
      expect(result.error).toBeNull()
    })

    it('should handle errors when deleting category', async () => {
      const mockError = { message: 'Cannot delete category with existing transactions' }

      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await categoryService.deleteCategory('1')

      expect(result.error).toEqual(mockError)
    })

    it('should not allow deleting system categories', async () => {
      // This test ensures system categories (user_id = null) cannot be deleted
      // This will be enforced by RLS policies in the database
      const mockError = {
        message: 'Cannot delete system category',
        code: 'RLS_POLICY_VIOLATION',
      }

      mockSupabaseClient.eq.mockResolvedValue({
        data: null,
        error: mockError,
      })

      const result = await categoryService.deleteCategory('system-category-id')

      expect(result.error).toEqual(mockError)
    })
  })
})

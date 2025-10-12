import { createClient } from '@/lib/supabase/client'
import type { Category, CategoryFormData } from '@/types'

export const categoryService = {
  /**
   * Fetch all categories (system + user-created)
   */
  async getCategories() {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    return { data, error }
  },

  /**
   * Fetch a single category by ID
   */
  async getCategoryById(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    return { data, error }
  },

  /**
   * Create a new category
   */
  async createCategory(categoryData: CategoryFormData) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()

    // Return the first item or null
    return { data: data?.[0] || null, error }
  },

  /**
   * Update an existing category
   */
  async updateCategory(id: string, updateData: Partial<CategoryFormData>) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)
      .select()

    // Return the first item or null
    return { data: data?.[0] || null, error }
  },

  /**
   * Delete a category
   * Note: System categories (user_id = null) cannot be deleted due to RLS policies
   */
  async deleteCategory(id: string) {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    return { data, error }
  },
}

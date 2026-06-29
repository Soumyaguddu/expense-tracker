import { supabase } from '@/lib/supabase'
import type { Category } from '@/types'

export const categoryService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order('name')

    if (error) throw error
    return data as Category[]
  },

  async create(userId: string, cat: Omit<Category, 'id' | 'user_id'>) {
    const { data, error } = await supabase
      .from('categories')
      .insert({ ...cat, user_id: userId })
      .select()
      .single()

    if (error) throw error
    return data as Category
  },

  async delete(id: string) {
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (error) throw error
  },
}

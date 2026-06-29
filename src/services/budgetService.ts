import { supabase } from '@/lib/supabase'
import { encryptAmount } from '@/utils/crypto'
import type { Budget } from '@/types'

export const budgetService = {
  async getAll(userId: string) {
    const { data, error } = await supabase
      .from('budgets')
      .select(`*, category:categories(*)`)
      .eq('user_id', userId)

    if (error) throw error
    // Map budget_limit → limit for the TypeScript model
    return (data as any[]).map(b => ({ ...b, limit: b.budget_limit })) as Budget[]
  },

  async create(userId: string, budget: {
    category_id: string
    limit: number
    period: 'monthly' | 'weekly'
    alert_at_percent?: number
  }, cryptoKey?: CryptoKey) {
    let limit_encrypted = ''
    if (cryptoKey) {
      limit_encrypted = await encryptAmount(budget.limit, cryptoKey)
    }

    const { data, error } = await supabase
      .from('budgets')
      .insert({
        user_id: userId,
        category_id: budget.category_id,
        limit_encrypted,
        budget_limit: budget.limit,
        period: budget.period,
        alert_at_percent: budget.alert_at_percent ?? 80,
      })
      .select(`*, category:categories(*)`)
      .single()

    if (error) throw error
    const b = data as any
    return { ...b, limit: b.budget_limit } as Budget
  },

  async update(id: string, updates: { limit?: number; alert_at_percent?: number }, cryptoKey?: CryptoKey) {
    const payload: Record<string, unknown> = {}
    if (updates.alert_at_percent !== undefined) payload.alert_at_percent = updates.alert_at_percent
    if (updates.limit !== undefined) {
      payload.budget_limit = updates.limit
      if (cryptoKey) payload.limit_encrypted = await encryptAmount(updates.limit, cryptoKey)
    }
    const { error } = await supabase.from('budgets').update(payload).eq('id', id)
    if (error) throw error
  },

  async delete(id: string) {
    const { error } = await supabase.from('budgets').delete().eq('id', id)
    if (error) throw error
  },
}

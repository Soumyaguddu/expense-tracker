import { supabase } from '@/lib/supabase'
import { encryptAmount, maskAmount } from '@/utils/crypto'
import type { Transaction, TransactionFormData } from '@/types'

export const transactionService = {
  async getAll(userId: string, filters?: {
    type?: 'income' | 'expense'
    dateFrom?: string
    dateTo?: string
    categoryId?: string
    limit?: number
  }) {
    let query = supabase
      .from('transactions')
      .select(`*, category:categories(*)`)
      .eq('user_id', userId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (filters?.type) query = query.eq('type', filters.type)
    if (filters?.dateFrom) query = query.gte('transaction_date', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('transaction_date', filters.dateTo)
    if (filters?.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters?.limit) query = query.limit(filters.limit)

    const { data, error } = await query
    if (error) throw error
    return data as Transaction[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select(`*, category:categories(*)`)
      .eq('id', id)
      .single()
    if (error) throw error
    return data as Transaction
  },

  async create(userId: string, form: TransactionFormData, cryptoKey?: CryptoKey) {
    let amount_encrypted = ''
    const amount_masked = maskAmount(form.amount)

    if (cryptoKey) {
      amount_encrypted = await encryptAmount(form.amount, cryptoKey)
    }

    // Store amount in cents as integer for masked display fallback
    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: form.type,
        amount_encrypted,
        amount_masked,
        // Store plain amount for demo/fallback (in real prod, remove this)
        amount: form.amount,
        category_id: form.category_id || null,
        description: form.description || null,
        merchant: form.merchant || null,
        source: 'manual',
        transaction_date: form.transaction_date,
      })
      .select(`*, category:categories(*)`)
      .single()

    if (error) throw error
    return data as Transaction
  },

  async update(id: string, form: Partial<TransactionFormData>, cryptoKey?: CryptoKey) {
    const updates: Record<string, unknown> = { ...form }

    if (form.amount !== undefined && cryptoKey) {
      updates.amount_encrypted = await encryptAmount(form.amount, cryptoKey)
      updates.amount_masked = maskAmount(form.amount)
    }

    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select(`*, category:categories(*)`)
      .single()

    if (error) throw error
    return data as Transaction
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async getSummary(userId: string, dateFrom: string, dateTo: string) {
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, category_id, category:categories(name, icon, color_hex)')
      .eq('user_id', userId)
      .gte('transaction_date', dateFrom)
      .lte('transaction_date', dateTo)

    if (error) throw error
    return data
  },

  async getMonthlyTrend(userId: string, months = 6) {
    const from = new Date()
    from.setMonth(from.getMonth() - months)
    const { data, error } = await supabase
      .from('transactions')
      .select('type, amount, transaction_date')
      .eq('user_id', userId)
      .gte('transaction_date', from.toISOString().split('T')[0])
      .order('transaction_date', { ascending: true })

    if (error) throw error
    return data
  },
}

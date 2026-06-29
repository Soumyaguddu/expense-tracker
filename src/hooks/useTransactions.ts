import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import { useAuthStore } from '@/store/authStore'
import type { TransactionFormData } from '@/types'

export function useTransactions(filters?: {
  type?: 'income' | 'expense'
  dateFrom?: string
  dateTo?: string
  categoryId?: string
  limit?: number
}) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['transactions', user?.id, filters],
    queryFn: () => transactionService.getAll(user!.id, filters),
    enabled: !!user,
  })
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => transactionService.getById(id),
    enabled: !!id,
  })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  const { user } = useAuthStore()

  return useMutation({
    mutationFn: (form: TransactionFormData) =>
      transactionService.create(user!.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, form }: { id: string; form: Partial<TransactionFormData> }) =>
      transactionService.update(id, form),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['transaction', id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => transactionService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useMonthlyTrend(months = 6) {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['monthly-trend', user?.id, months],
    queryFn: async () => {
      const raw = await transactionService.getMonthlyTrend(user!.id, months)
      // Group by month
      const grouped: Record<string, { income: number; expense: number }> = {}
      raw?.forEach(t => {
        const month = t.transaction_date.slice(0, 7) // "2024-01"
        if (!grouped[month]) grouped[month] = { income: 0, expense: 0 }
        if (t.type === 'income') grouped[month].income += t.amount
        else grouped[month].expense += t.amount
      })
      return Object.entries(grouped).map(([month, vals]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        ...vals,
      }))
    },
    enabled: !!user,
  })
}

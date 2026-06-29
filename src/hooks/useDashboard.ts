import { useQuery } from '@tanstack/react-query'
import { transactionService } from '@/services/transactionService'
import { useAuthStore } from '@/store/authStore'
import { currentMonthRange } from '@/utils/helpers'
import type { Category } from '@/types'

export function useDashboard() {
  const { user } = useAuthStore()
  const { start, end } = currentMonthRange()

  return useQuery({
    queryKey: ['dashboard', user?.id, start, end],
    queryFn: async () => {
      const txns = await transactionService.getSummary(user!.id, start, end)

      let totalIncome = 0
      let totalExpense = 0
      const catMap: Record<string, { category: Category; total: number }> = {}

      txns?.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount
        else {
          totalExpense += t.amount
          if (t.category_id && t.category) {
            const cat = t.category as unknown as Category
            if (!catMap[t.category_id]) catMap[t.category_id] = { category: cat, total: 0 }
            catMap[t.category_id].total += t.amount
          }
        }
      })

      const topCategories = Object.values(catMap)
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)
        .map(c => ({ ...c, percent: totalExpense > 0 ? (c.total / totalExpense) * 100 : 0 }))

      return {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        transactionCount: txns?.length ?? 0,
        topCategories,
      }
    },
    enabled: !!user,
  })
}

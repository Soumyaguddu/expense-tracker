import { useState } from 'react'
import { Card } from '@/components/ui'
import { MonthlyBarChart, CategoryDonutChart } from '@/components/charts'
import { useTransactions } from '@/hooks/useTransactions'
import { useAuthStore } from '@/store/authStore'
import { formatAmount } from '@/utils/crypto'
import { currentMonthRange, getCurrencySymbol, cn } from '@/utils/helpers'
import type { Category } from '@/types'

export function AnalyticsPage() {
  const [period, setPeriod] = useState<'month' | '3months' | '6months'>('month')
  const { isRevealed, profile } = useAuthStore()
  const sym = getCurrencySymbol(profile?.currency ?? 'INR')

  const getDateRange = () => {
    const end = new Date()
    const start = new Date()
    if (period === 'month') start.setMonth(start.getMonth() - 1)
    else if (period === '3months') start.setMonth(start.getMonth() - 3)
    else start.setMonth(start.getMonth() - 6)
    return {
      dateFrom: start.toISOString().split('T')[0],
      dateTo: end.toISOString().split('T')[0],
    }
  }

  const { data: transactions, isLoading } = useTransactions(getDateRange())

  // Compute stats
  const income = transactions?.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0) ?? 0
  const expense = transactions?.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0) ?? 0
  const balance = income - expense

  // Category breakdown for expenses
  const catMap: Record<string, { category: Category; total: number }> = {}
  transactions?.filter(t => t.type === 'expense').forEach(t => {
    if (t.category_id && t.category) {
      if (!catMap[t.category_id]) catMap[t.category_id] = { category: t.category as Category, total: 0 }
      catMap[t.category_id].total += t.amount
    }
  })
  const catBreakdown = Object.values(catMap).sort((a, b) => b.total - a.total)

  const donutData = catBreakdown.map(c => ({
    name: c.category.name,
    value: c.total,
    color: c.category.color_hex,
  }))

  const PERIODS = [
    { key: 'month', label: 'This Month' },
    { key: '3months', label: '3 Months' },
    { key: '6months', label: '6 Months' },
  ] as const

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Analytics</h1>
          <p className="text-sm text-surface-500 mt-0.5">Understand your spending patterns</p>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 p-1 bg-surface-800/60 rounded-xl">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                period === p.key ? 'bg-surface-700 text-surface-100' : 'text-surface-500 hover:text-surface-300'
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Income', value: income, color: 'text-green-400' },
          { label: 'Expenses', value: expense, color: 'text-rose-400' },
          { label: 'Net', value: balance, color: balance >= 0 ? 'text-blue-400' : 'text-rose-400' },
        ].map(s => (
          <Card key={s.label} className="p-4 text-center">
            <p className="text-xs text-surface-500 font-medium">{s.label}</p>
            {isRevealed ? (
              <p className={cn('text-xl font-bold mt-1', s.color)}>
                {formatAmount(s.value, sym)}
              </p>
            ) : (
              <p className="text-xl font-bold mt-1 text-surface-600 tracking-widest">{sym}•••</p>
            )}
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="font-semibold text-surface-200 mb-4">Monthly Trend</h2>
          <MonthlyBarChart />
        </Card>

        <Card className="p-5">
          <h2 className="font-semibold text-surface-200 mb-4">Expense Breakdown</h2>
          <CategoryDonutChart data={donutData} />
        </Card>
      </div>

      {/* Category table */}
      {catBreakdown.length > 0 && (
        <Card className="p-5">
          <h2 className="font-semibold text-surface-200 mb-4">Spending by Category</h2>
          <div className="space-y-3">
            {catBreakdown.map(c => (
              <div key={c.category.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2 text-sm">
                    <span>{c.category.icon}</span>
                    <span className="text-surface-300">{c.category.name}</span>
                  </div>
                  <span className="text-sm font-medium text-surface-200">
                    {isRevealed ? formatAmount(c.total, sym) : `${sym}•••`}
                    <span className="text-xs text-surface-500 ml-2">
                      {expense > 0 ? ((c.total / expense) * 100).toFixed(1) : 0}%
                    </span>
                  </span>
                </div>
                <div className="h-1.5 bg-surface-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${expense > 0 ? (c.total / expense) * 100 : 0}%`,
                      background: c.category.color_hex,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

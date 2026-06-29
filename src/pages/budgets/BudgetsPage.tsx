import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Target, Trash2, AlertTriangle } from 'lucide-react'
import { Button, Card, Modal, EmptyState } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { budgetService } from '@/services/budgetService'
import { useCategories } from '@/hooks/useCategories'
import { useTransactions } from '@/hooks/useTransactions'
import { formatAmount } from '@/utils/crypto'
import { currentMonthRange, getCurrencySymbol, cn } from '@/utils/helpers'
import type { Budget } from '@/types'

function BudgetCard({ budget, spent }: { budget: Budget; spent: number }) {
  const qc = useQueryClient()
  const { isRevealed, profile } = useAuthStore()
  const sym = getCurrencySymbol(profile?.currency ?? 'INR')
  const pct = budget.limit > 0 ? Math.min((spent / budget.limit) * 100, 100) : 0
  const isOverBudget = pct >= 100
  const isNearLimit = pct >= (budget.alert_at_percent ?? 80)

  const deleteMut = useMutation({
    mutationFn: () => budgetService.delete(budget.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['budgets'] }),
  })

  const barColor = isOverBudget ? '#f43f5e' : isNearLimit ? '#f59e0b' : '#22c55e'

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: (budget.category?.color_hex ?? '#334155') + '20' }}
          >
            {budget.category?.icon ?? '📦'}
          </div>
          <div>
            <p className="font-semibold text-surface-200">{budget.category?.name ?? 'Unknown'}</p>
            <p className="text-xs text-surface-500 capitalize">{budget.period} budget</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {(isNearLimit || isOverBudget) && (
            <AlertTriangle className={cn('w-4 h-4', isOverBudget ? 'text-rose-400' : 'text-yellow-400')} />
          )}
          <button
            onClick={() => deleteMut.mutate()}
            className="p-1.5 text-surface-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div>
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-xs text-surface-500">
            {isRevealed ? formatAmount(spent, sym) : `${sym}•••`} spent
          </span>
          <span className="text-xs text-surface-400">
            of {isRevealed ? formatAmount(budget.limit, sym) : `${sym}•••`}
          </span>
        </div>
        <div className="h-2 bg-surface-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-xs" style={{ color: barColor }}>
            {pct.toFixed(1)}% used
          </span>
          {isOverBudget ? (
            <span className="text-xs text-rose-400 font-medium">Over budget!</span>
          ) : (
            <span className="text-xs text-surface-600">
              {isRevealed ? formatAmount(budget.limit - spent, sym) : `${sym}•••`} left
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}

export function BudgetsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ category_id: '', limit: '', period: 'monthly', alert_at_percent: 80 })
  const [error, setError] = useState('')
  const { user } = useAuthStore()
  const { data: categories } = useCategories()
  const { start, end } = currentMonthRange()
  const { data: transactions } = useTransactions({ dateFrom: start, dateTo: end })
  const qc = useQueryClient()

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets', user?.id],
    queryFn: () => budgetService.getAll(user!.id),
    enabled: !!user,
  })

  const createMut = useMutation({
    mutationFn: () => budgetService.create(user!.id, {
      category_id: form.category_id,
      limit: parseFloat(form.limit),
      period: form.period as 'monthly' | 'weekly',
      alert_at_percent: form.alert_at_percent,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] })
      setShowAdd(false)
      setForm({ category_id: '', limit: '', period: 'monthly', alert_at_percent: 80 })
    },
    onError: (e: any) => setError(e.message),
  })

  // Compute spent per category
  const spentByCategory: Record<string, number> = {}
  transactions?.filter(t => t.type === 'expense').forEach(t => {
    if (t.category_id) {
      spentByCategory[t.category_id] = (spentByCategory[t.category_id] ?? 0) + t.amount
    }
  })

  const expenseCategories = categories?.filter(c => c.type === 'expense' || c.type === 'both') ?? []

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Budgets</h1>
          <p className="text-sm text-surface-500 mt-0.5">Set limits and track your spending</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> New Budget
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="skeleton h-40 rounded-2xl" />)}
        </div>
      ) : budgets?.length === 0 ? (
        <EmptyState
          icon={<Target className="w-7 h-7" />}
          title="No budgets yet"
          description="Set category budgets to stay on top of your spending."
          action={<Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4" /> Create Budget</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets?.map(b => (
            <BudgetCard key={b.id} budget={b} spent={spentByCategory[b.category_id] ?? 0} />
          ))}
        </div>
      )}

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Budget">
        <div className="space-y-4">
          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="space-y-1.5">
            <label className="label">Category</label>
            <select
              className="input"
              value={form.category_id}
              onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
            >
              <option value="">Select category</option>
              {expenseCategories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="label">Budget Limit (₹)</label>
            <input
              type="number"
              className="input"
              placeholder="5000"
              value={form.limit}
              onChange={e => setForm(f => ({ ...f, limit: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <label className="label">Period</label>
            <select className="input" value={form.period} onChange={e => setForm(f => ({ ...f, period: e.target.value }))}>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="label">Alert at {form.alert_at_percent}%</label>
            <input
              type="range"
              min={50} max={100} step={5}
              className="w-full accent-brand-500"
              value={form.alert_at_percent}
              onChange={e => setForm(f => ({ ...f, alert_at_percent: Number(e.target.value) }))}
            />
          </div>

          <Button
            className="w-full"
            loading={createMut.isPending}
            disabled={!form.category_id || !form.limit}
            onClick={() => createMut.mutate()}
          >
            Create Budget
          </Button>
        </div>
      </Modal>
    </div>
  )
}

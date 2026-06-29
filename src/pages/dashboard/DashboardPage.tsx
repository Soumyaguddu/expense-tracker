import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, TrendingUp, TrendingDown, Wallet, ArrowUpRight, Eye, EyeOff, Mail } from 'lucide-react'
import { Button, Card, Modal, SkeletonCard } from '@/components/ui'
import { TransactionForm } from '@/components/forms/TransactionForm'
import { GmailImportModal } from '@/components/forms/GmailImportModal'
import { MonthlyTrendChart, CategoryDonutChart } from '@/components/charts'
import { useDashboard } from '@/hooks/useDashboard'
import { useTransactions } from '@/hooks/useTransactions'
import { useAuthStore } from '@/store/authStore'
import { formatAmount } from '@/utils/crypto'
import { formatDateShort, getCurrencySymbol, cn } from '@/utils/helpers'
import { Link } from 'react-router-dom'

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: 'green' | 'red' | 'blue'
}) {
  const { isRevealed, profile } = useAuthStore()
  const sym = getCurrencySymbol(profile?.currency ?? 'INR')
  const colors = {
    green: 'text-green-400 bg-green-500/10',
    red: 'text-rose-400 bg-rose-500/10',
    blue: 'text-blue-400 bg-blue-500/10',
  }
  return (
    <motion.div className="stat-card cursor-default" whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', colors[color])}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-surface-500 font-medium">{label}</p>
        {isRevealed ? (
          <p className="text-2xl font-bold text-surface-50 mt-0.5">{formatAmount(value, sym)}</p>
        ) : (
          <p className="text-2xl font-bold text-surface-600 mt-0.5 tracking-widest select-none">{sym}••••••</p>
        )}
      </div>
    </motion.div>
  )
}

export function DashboardPage() {
  const [showAddModal, setShowAddModal] = useState(false)
  const [showGmailModal, setShowGmailModal] = useState(false)
  const { data: stats, isLoading: statsLoading } = useDashboard()
  const { data: recentTxns, isLoading: txnLoading } = useTransactions({ limit: 5 })
  const { profile, isRevealed, toggleReveal } = useAuthStore()
  const sym = getCurrencySymbol(profile?.currency ?? 'INR')

  const donutData = stats?.topCategories.map(c => ({
    name: c.category.name,
    value: c.total,
    color: c.category.color_hex,
  })) ?? []

  return (
    <div className="p-4 sm:p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">
            Good {getGreeting()}, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-sm text-surface-500 mt-0.5">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} snapshot
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Reveal toggle */}
          <button
            onClick={toggleReveal}
            className={cn(
              'p-2.5 rounded-xl border transition-all',
              isRevealed
                ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                : 'bg-surface-800 border-white/8 text-surface-500 hover:text-surface-300'
            )}
            title={isRevealed ? 'Hide amounts' : 'Show amounts'}
          >
            {isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Gmail import */}
          <Button variant="secondary" onClick={() => setShowGmailModal(true)}>
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Import Gmail</span>
          </Button>

          {/* Add transaction */}
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Transaction</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <SkeletonCard key={i} lines={3} />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard label="Balance" value={stats?.balance ?? 0} icon={Wallet} color="blue" />
          <StatCard label="Total Income" value={stats?.totalIncome ?? 0} icon={TrendingUp} color="green" />
          <StatCard label="Total Expenses" value={stats?.totalExpense ?? 0} icon={TrendingDown} color="red" />
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-5">
          <h2 className="font-semibold text-surface-200 mb-4">Income vs Expenses</h2>
          <MonthlyTrendChart />
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-surface-200 mb-4">Spending by Category</h2>
          <CategoryDonutChart data={donutData} />
          <div className="mt-3 space-y-2">
            {stats?.topCategories.slice(0, 4).map(c => (
              <div key={c.category.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.category.color_hex }} />
                  <span className="text-surface-400">{c.category.icon} {c.category.name}</span>
                </div>
                <span className="text-surface-300 font-medium">{c.percent.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-surface-200">Recent Transactions</h2>
          <Link to="/transactions" className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium">
            View all →
          </Link>
        </div>

        {txnLoading ? (
          <div className="space-y-3">
            {[0,1,2,3,4].map(i => (
              <div key={i} className="flex items-center gap-3">
                <div className="skeleton w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-1/3 rounded" />
                  <div className="skeleton h-3 w-1/4 rounded" />
                </div>
                <div className="skeleton h-4 w-16 rounded" />
              </div>
            ))}
          </div>
        ) : recentTxns?.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <p className="text-sm text-surface-500">No transactions yet.</p>
            <div className="flex items-center justify-center gap-2">
              <Button size="sm" onClick={() => setShowAddModal(true)}>
                <Plus className="w-3.5 h-3.5" /> Add manually
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setShowGmailModal(true)}>
                <Mail className="w-3.5 h-3.5" /> Import from Gmail
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {recentTxns?.map(txn => (
              <div key={txn.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/4 transition-colors">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                  style={{ background: (txn.category?.color_hex ?? '#334155') + '20' }}
                >
                  {txn.category?.icon ?? '💳'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-200 truncate">
                    {txn.merchant ?? txn.description ?? 'Transaction'}
                  </p>
                  <p className="text-xs text-surface-500">
                    {txn.category?.name} · {formatDateShort(txn.transaction_date)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  {isRevealed ? (
                    <p className={cn('text-sm font-semibold', txn.type === 'income' ? 'text-green-400' : 'text-rose-400')}>
                      {txn.type === 'income' ? '+' : '-'}{formatAmount(txn.amount, sym)}
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-surface-600 tracking-widest">{sym}•••</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Modals */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="Add Transaction">
        <TransactionForm onSuccess={() => setShowAddModal(false)} />
      </Modal>

      <GmailImportModal open={showGmailModal} onClose={() => setShowGmailModal(false)} />
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}

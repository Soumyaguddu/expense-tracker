import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Search, Filter, Edit2, Trash2, ArrowLeftRight } from 'lucide-react'
import { Button, Card, Modal, EmptyState, Badge } from '@/components/ui'
import { TransactionForm } from '@/components/forms/TransactionForm'
import { useTransactions, useDeleteTransaction } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAuthStore } from '@/store/authStore'
import { formatAmount } from '@/utils/crypto'
import { formatDate, getCurrencySymbol, cn } from '@/utils/helpers'
import type { Transaction } from '@/types'

export function TransactionsPage() {
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all')
  const [catFilter, setCatFilter] = useState('')

  const { data: transactions, isLoading } = useTransactions(
    typeFilter !== 'all' ? { type: typeFilter } : {}
  )
  const { data: categories } = useCategories()
  const deleteMutation = useDeleteTransaction()
  const { isRevealed, profile } = useAuthStore()
  const sym = getCurrencySymbol(profile?.currency ?? 'INR')

  // Client-side filter for search + category
  const filtered = transactions?.filter(t => {
    const matchSearch = !search ||
      t.merchant?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase()) ||
      t.category?.name.toLowerCase().includes(search.toLowerCase())
    const matchCat = !catFilter || t.category_id === catFilter
    return matchSearch && matchCat
  }) ?? []

  async function confirmDelete() {
    if (!deleting) return
    await deleteMutation.mutateAsync(deleting.id)
    setDeleting(null)
  }

  // Group by date
  const grouped = filtered.reduce<Record<string, Transaction[]>>((acc, t) => {
    const date = t.transaction_date
    if (!acc[date]) acc[date] = []
    acc[date].push(t)
    return acc
  }, {})

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-50">Transactions</h1>
          <p className="text-sm text-surface-500 mt-0.5">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
            <input
              className="input pl-9"
              placeholder="Search transactions…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Type tabs */}
          <div className="flex gap-1 p-1 bg-surface-800/60 rounded-xl">
            {(['all', 'income', 'expense'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all',
                  typeFilter === t
                    ? 'bg-surface-700 text-surface-100'
                    : 'text-surface-500 hover:text-surface-300'
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category */}
          <select
            className="input w-auto min-w-[140px]"
            value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {categories?.map(c => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Transaction list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="glass-card p-4 flex items-center gap-3">
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-1/3 rounded" />
                <div className="skeleton h-3 w-1/5 rounded" />
              </div>
              <div className="skeleton h-5 w-20 rounded" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="w-7 h-7" />}
          title="No transactions found"
          description={search ? 'Try a different search term.' : 'Add your first income or expense to get started.'}
          action={!search && (
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="w-4 h-4" /> Add Transaction
            </Button>
          )}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, txns]) => (
              <div key={date}>
                <p className="text-xs font-semibold text-surface-500 mb-2 uppercase tracking-wide">
                  {formatDate(date)}
                </p>
                <div className="space-y-1">
                  <AnimatePresence>
                    {txns.map(txn => (
                      <motion.div
                        key={txn.id}
                        className="glass-card p-4 flex items-center gap-3 group hover:bg-surface-800/60 transition-all"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                      >
                        {/* Icon */}
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                          style={{ background: (txn.category?.color_hex ?? '#334155') + '20' }}
                        >
                          {txn.category?.icon ?? '💳'}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-100 truncate">
                            {txn.merchant ?? txn.description ?? 'Transaction'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge type={txn.type}>
                              {txn.type === 'income' ? '↑' : '↓'} {txn.type}
                            </Badge>
                            {txn.category && (
                              <span className="text-xs text-surface-500">{txn.category.name}</span>
                            )}
                            {txn.source !== 'manual' && (
                              <span className="text-xs text-surface-600 capitalize">via {txn.source}</span>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0 mr-2">
                          {isRevealed ? (
                            <p className={cn('text-sm font-bold', txn.type === 'income' ? 'text-green-400' : 'text-rose-400')}>
                              {txn.type === 'income' ? '+' : '–'}{formatAmount(txn.amount, sym)}
                            </p>
                          ) : (
                            <p className="text-sm font-bold text-surface-600 tracking-widest">{sym}•••</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setEditing(txn)}
                            className="p-1.5 text-surface-500 hover:text-surface-200 hover:bg-white/8 rounded-lg transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleting(txn)}
                            className="p-1.5 text-surface-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Transaction">
        <TransactionForm onSuccess={() => setShowAdd(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Transaction">
        {editing && (
          <TransactionForm existing={editing} onSuccess={() => setEditing(null)} />
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete Transaction">
        <div className="space-y-4">
          <p className="text-sm text-surface-400">
            Are you sure you want to delete this transaction? This cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              loading={deleteMutation.isPending}
              onClick={confirmDelete}
            >
              <Trash2 className="w-4 h-4" /> Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

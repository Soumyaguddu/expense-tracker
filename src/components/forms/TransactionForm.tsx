import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { format } from 'date-fns'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import { useCategories } from '@/hooks/useCategories'
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/useTransactions'
import { cn } from '@/utils/helpers'
import type { TransactionFormData, Transaction } from '@/types'

interface Props {
  onSuccess?: () => void
  existing?: Transaction
}

export function TransactionForm({ onSuccess, existing }: Props) {
  const [type, setType] = useState<'income' | 'expense'>(existing?.type ?? 'expense')
  const { data: categories } = useCategories()
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()

  const { register, handleSubmit, formState: { errors } } = useForm<TransactionFormData>({
    defaultValues: {
      type: existing?.type ?? 'expense',
      amount: existing?.amount ?? undefined,
      category_id: existing?.category_id ?? '',
      description: existing?.description ?? '',
      merchant: existing?.merchant ?? '',
      transaction_date: existing?.transaction_date ?? format(new Date(), 'yyyy-MM-dd'),
    },
  })

  const filteredCats = categories?.filter(c => c.type === type || c.type === 'both') ?? []
  const isLoading = createMutation.isPending || updateMutation.isPending

  async function onSubmit(data: TransactionFormData) {
    try {
      const payload = { ...data, type, amount: Number(data.amount) }
      if (existing) {
        await updateMutation.mutateAsync({ id: existing.id, form: payload })
      } else {
        await createMutation.mutateAsync(payload)
      }
      onSuccess?.()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Type toggle */}
      <div className="flex gap-2 p-1 bg-surface-800/60 rounded-xl">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
            type === 'expense'
              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              : 'text-surface-500 hover:text-surface-300'
          )}
        >
          <TrendingDown className="w-4 h-4" />
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all',
            type === 'income'
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : 'text-surface-500 hover:text-surface-300'
          )}
        >
          <TrendingUp className="w-4 h-4" />
          Income
        </button>
      </div>

      {/* Amount */}
      <Input
        label="Amount"
        type="number"
        step="0.01"
        min="0.01"
        placeholder="0.00"
        leftIcon={<DollarSign className="w-4 h-4" />}
        error={errors.amount?.message}
        {...register('amount', {
          required: 'Amount is required',
          min: { value: 0.01, message: 'Must be greater than 0' },
        })}
      />

      {/* Merchant */}
      <Input
        label="Merchant / Payer"
        placeholder="e.g. Swiggy, Salary"
        {...register('merchant')}
      />

      {/* Category */}
      <Select
        label="Category"
        error={errors.category_id?.message}
        {...register('category_id', { required: 'Category is required' })}
      >
        <option value="">Select category</option>
        {filteredCats.map(cat => (
          <option key={cat.id} value={cat.id}>
            {cat.icon} {cat.name}
          </option>
        ))}
      </Select>

      {/* Date */}
      <Input
        label="Date"
        type="date"
        error={errors.transaction_date?.message}
        {...register('transaction_date', { required: 'Date is required' })}
      />

      {/* Description */}
      <div className="space-y-1.5">
        <label className="label">Notes (optional)</label>
        <textarea
          className="input resize-none h-20"
          placeholder="Add a note…"
          {...register('description')}
        />
      </div>

      <Button type="submit" className="w-full" loading={isLoading}>
        {existing ? 'Update Transaction' : 'Add Transaction'}
      </Button>
    </form>
  )
}

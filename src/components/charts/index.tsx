import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useMonthlyTrend } from '@/hooks/useTransactions'
import { formatAmount } from '@/utils/crypto'
import { useAuthStore } from '@/store/authStore'
import { getCurrencySymbol } from '@/utils/helpers'

// Custom Tooltip
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs space-y-1 border-white/12">
      <p className="font-semibold text-surface-300">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {formatAmount(p.value)}
        </p>
      ))}
    </div>
  )
}

// ── Monthly Trend Chart ───────────────────────────────────────────────────────
export function MonthlyTrendChart() {
  const { data, isLoading } = useMonthlyTrend(6)

  if (isLoading) return <div className="skeleton h-64 rounded-xl" />
  if (!data?.length) return (
    <div className="h-64 flex items-center justify-center text-surface-500 text-sm">
      No data yet
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Area type="monotone" dataKey="income" name="Income" stroke="#22c55e" strokeWidth={2} fill="url(#incomeGrad)" />
        <Area type="monotone" dataKey="expense" name="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#expenseGrad)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Category Donut Chart ──────────────────────────────────────────────────────
interface DonutChartProps {
  data: { name: string; value: number; color: string }[]
}

export function CategoryDonutChart({ data }: DonutChartProps) {
  if (!data.length) return (
    <div className="h-48 flex items-center justify-center text-surface-500 text-sm">No spending data</div>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.color} opacity={0.85} />
          ))}
        </Pie>
        <Tooltip
          formatter={(v) => [formatAmount(Number(v ?? 0)), ''] as [string, string]}
          contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ── Monthly Bar Chart ─────────────────────────────────────────────────────────
export function MonthlyBarChart() {
  const { data, isLoading } = useMonthlyTrend(6)

  if (isLoading) return <div className="skeleton h-48 rounded-xl" />

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
        <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="income" name="Income" fill="#22c55e" radius={[4, 4, 0, 0]} opacity={0.8} />
        <Bar dataKey="expense" name="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} opacity={0.8} />
      </BarChart>
    </ResponsiveContainer>
  )
}

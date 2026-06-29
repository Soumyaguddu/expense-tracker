import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, ArrowLeftRight, PieChart, Target,
  Settings, LogOut, Zap, Eye, EyeOff, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import { cn, getInitials } from '@/utils/helpers'
import { useAuthStore } from '@/store/authStore'
import { authService } from '@/services/authService'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/analytics', icon: PieChart, label: 'Analytics' },
  { to: '/budgets', icon: Target, label: 'Budgets' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { profile, user, isRevealed, toggleReveal } = useAuthStore()
  const navigate = useNavigate()

  async function handleSignOut() {
    await authService.signOut()
    navigate('/auth/login')
  }

  const initials = getInitials(profile?.full_name, user?.email ?? 'U')

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen border-r border-white/8 bg-surface-950/80 backdrop-blur-xl">
      {/* Logo */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <p className="font-bold text-surface-50">Trackr</p>
            <p className="text-xs text-surface-500">Expense Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
              isActive
                ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                : 'text-surface-400 hover:text-surface-100 hover:bg-white/5'
            )}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="p-3 space-y-2 border-t border-white/8">
        {/* Reveal toggle */}
        <button
          onClick={toggleReveal}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
            isRevealed
              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
              : 'text-surface-400 hover:text-surface-100 hover:bg-white/5'
          )}
        >
          {isRevealed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {isRevealed ? 'Amounts Visible' : 'Amounts Hidden'}
        </button>

        {/* User */}
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-surface-200 truncate">{profile?.full_name ?? 'User'}</p>
            <p className="text-xs text-surface-500 truncate">{user?.email}</p>
          </div>
          <button onClick={handleSignOut} className="text-surface-500 hover:text-rose-400 transition-colors p-1">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  )
}

// Mobile bottom nav
export function BottomNav() {
  const { isRevealed, toggleReveal } = useAuthStore()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-950/90 backdrop-blur-xl border-t border-white/8 z-40">
      <div className="flex items-center justify-around px-2 py-2">
        {NAV.slice(0, 4).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all',
              isActive ? 'text-brand-400' : 'text-surface-500'
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
        <button
          onClick={toggleReveal}
          className={cn('flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all',
            isRevealed ? 'text-yellow-400' : 'text-surface-500')}
        >
          {isRevealed ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          <span className="text-[10px] font-medium">Reveal</span>
        </button>
      </div>
    </nav>
  )
}

// App layout wrapper
export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}

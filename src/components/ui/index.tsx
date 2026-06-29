import { forwardRef } from 'react'
import { cn } from '@/utils/helpers'
import { Loader2, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'

// ── Button ────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className, children, disabled, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed'
    const variants = {
      primary: 'bg-brand-500 hover:bg-brand-400 active:bg-brand-600 text-white shadow-glow-green/20',
      secondary: 'bg-surface-800 hover:bg-surface-700 text-surface-200 border border-white/8',
      ghost: 'text-surface-400 hover:text-surface-100 hover:bg-white/5',
      danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20',
    }
    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3 text-base',
    }
    return (
      <button ref={ref} disabled={disabled || loading} className={cn(base, variants[variant], sizes[size], className)} {...props}>
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'

// ── Input ─────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500">{leftIcon}</div>
        )}
        <input
          ref={ref}
          className={cn('input', leftIcon && 'pl-9', error && 'border-rose-500/50 focus:ring-rose-500/40', className)}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'

// ── Select ────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, children, ...props }, ref) => (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <select ref={ref} className={cn('input appearance-none cursor-pointer', error && 'border-rose-500/50', className)} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  )
)
Select.displayName = 'Select'

// ── Spinner ───────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('animate-spin text-brand-500', className)} />
}

// ── Badge ─────────────────────────────────────────────────────
interface BadgeProps {
  type?: 'income' | 'expense' | 'neutral'
  children: React.ReactNode
  className?: string
}

export function Badge({ type = 'neutral', children, className }: BadgeProps) {
  const styles = {
    income: 'bg-green-500/10 text-green-400 border-green-500/20',
    expense: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    neutral: 'bg-surface-800 text-surface-400 border-white/8',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border', styles[type], className)}>
      {children}
    </span>
  )
}

// ── Card ──────────────────────────────────────────────────────
interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
}

export function Card({ children, className, hover }: CardProps) {
  return (
    <div className={cn(hover ? 'glass-card-hover' : 'glass-card', className)}>
      {children}
    </div>
  )
}

// ── Modal (FIXED — truly centered, scrollable, mobile-safe) ───
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  const maxW = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg' }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Overlay */}
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Dialog.Overlay>

            {/* Scroll container — centers the dialog */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 overflow-y-auto">
              <Dialog.Content asChild>
                <motion.div
                  className={cn(
                    'relative w-full bg-surface-900 border border-white/10 rounded-2xl shadow-glass-lg',
                    'max-h-[85vh] overflow-y-auto',
                    maxW[size],
                    className
                  )}
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Header */}
                  {title && (
                    <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 bg-surface-900 border-b border-white/8 rounded-t-2xl">
                      <Dialog.Title className="text-base font-bold text-surface-50">{title}</Dialog.Title>
                      <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-surface-500 hover:text-surface-200 hover:bg-white/8 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Body */}
                  <div className="p-5">
                    {children}
                  </div>
                </motion.div>
              </Dialog.Content>
            </div>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

// ── Empty State ───────────────────────────────────────────────
interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-surface-800/60 flex items-center justify-center text-surface-500">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-surface-200 mb-1">{title}</h3>
        <p className="text-sm text-surface-500 max-w-xs">{description}</p>
      </div>
      {action}
    </div>
  )
}

// ── Skeleton ──────────────────────────────────────────────────
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass-card p-5 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn('skeleton h-4 rounded', i === 0 ? 'w-1/3' : i === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

// ── Divider ───────────────────────────────────────────────────
export function Divider({ className }: { className?: string }) {
  return <div className={cn('border-t border-white/8', className)} />
}

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO, startOfMonth, endOfMonth, subMonths } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy')
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d')
}

export function formatMonth(dateStr: string): string {
  return format(parseISO(dateStr), 'MMMM yyyy')
}

export function currentMonthRange() {
  const now = new Date()
  return {
    start: format(startOfMonth(now), 'yyyy-MM-dd'),
    end: format(endOfMonth(now), 'yyyy-MM-dd'),
  }
}

export function lastNMonths(n: number): { start: string; end: string; label: string }[] {
  const months = []
  for (let i = n - 1; i >= 0; i--) {
    const d = subMonths(new Date(), i)
    months.push({
      start: format(startOfMonth(d), 'yyyy-MM-dd'),
      end: format(endOfMonth(d), 'yyyy-MM-dd'),
      label: format(d, 'MMM yy'),
    })
  }
  return months
}

export function getInitials(name: string | null | undefined, email: string): string {
  if (name) {
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  }
  return email[0].toUpperCase()
}

export function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const CURRENCIES = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
]

export function getCurrencySymbol(code: string): string {
  return CURRENCIES.find(c => c.code === code)?.symbol ?? '₹'
}

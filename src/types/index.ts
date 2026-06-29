export type TransactionType = 'income' | 'expense'
export type TransactionSource = 'manual' | 'sms' | 'gmail'
export type BudgetPeriod = 'monthly' | 'weekly'
export type CategoryType = 'income' | 'expense' | 'both'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  currency: string
  avatar_url: string | null
  created_at: string
}

export interface Category {
  id: string
  user_id: string | null
  name: string
  icon: string
  color_hex: string
  type: CategoryType
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  amount_masked: string
  amount_encrypted: string
  category_id: string | null
  category?: Category
  description: string | null
  merchant: string | null
  source: TransactionSource
  transaction_date: string
  created_at: string
}

export interface TransactionFormData {
  type: TransactionType
  amount: number
  category_id: string
  description: string
  merchant: string
  transaction_date: string
}

export interface Budget {
  id: string
  user_id: string
  category_id: string
  category?: Category
  limit: number
  period: BudgetPeriod
  alert_at_percent: number
  spent?: number
}

export interface DashboardStats {
  totalIncome: number
  totalExpense: number
  balance: number
  transactionCount: number
  monthlyData: { month: string; income: number; expense: number }[]
  topCategories: { category: Category; total: number; percent: number }[]
}

export interface AuthUser {
  id: string
  email: string
}

export interface EncryptedAmount {
  ciphertext: string
  iv: string
  tag: string
}

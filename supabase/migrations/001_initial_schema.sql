-- ============================================================
-- Expense Tracker - Complete Database Schema
-- Supabase PostgreSQL Migration
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE transaction_type AS ENUM ('income', 'expense');
CREATE TYPE transaction_source AS ENUM ('manual', 'sms', 'gmail');
CREATE TYPE budget_period AS ENUM ('monthly', 'weekly');
CREATE TYPE category_type AS ENUM ('income', 'expense', 'both');

-- ============================================================
-- TABLE: profiles
-- Auto-created on signup via trigger
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  full_name     TEXT,
  currency      TEXT NOT NULL DEFAULT 'INR',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: categories
-- system defaults (user_id IS NULL) + user-created (user_id set)
-- ============================================================
CREATE TABLE IF NOT EXISTS categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL DEFAULT '💳',
  color_hex   TEXT NOT NULL DEFAULT '#64748b',
  type        category_type NOT NULL DEFAULT 'both',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: transactions
-- Core financial records. Amounts AES-256-GCM encrypted.
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type               transaction_type NOT NULL,
  amount             NUMERIC(14,2) NOT NULL DEFAULT 0,  -- plaintext fallback for queries
  amount_encrypted   TEXT,                              -- AES-256-GCM ciphertext (base64)
  amount_masked      TEXT NOT NULL DEFAULT '₹***',      -- always-safe display value
  category_id        UUID REFERENCES categories(id) ON DELETE SET NULL,
  description        TEXT,
  merchant           TEXT,
  source             transaction_source NOT NULL DEFAULT 'manual',
  transaction_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  raw_source_hash    TEXT,                              -- SHA-256 of raw SMS/email for dedup
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type
  ON transactions(user_id, type);
CREATE INDEX IF NOT EXISTS idx_transactions_category
  ON transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_dedup
  ON transactions(raw_source_hash) WHERE raw_source_hash IS NOT NULL;

-- ============================================================
-- TABLE: budgets
-- Per-category spend limits (amounts also encrypted)
-- ============================================================
CREATE TABLE IF NOT EXISTS budgets (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id            UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id        UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  budget_limit       NUMERIC(14,2) NOT NULL,            -- plaintext for queries
  limit_encrypted    TEXT,                              -- AES-256-GCM ciphertext
  period             budget_period NOT NULL DEFAULT 'monthly',
  alert_at_percent   INTEGER NOT NULL DEFAULT 80 CHECK (alert_at_percent BETWEEN 1 AND 100),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id, period)
);

-- ============================================================
-- TABLE: encryption_keys
-- Per-user AES key (stored wrapped, never raw)
-- ============================================================
CREATE TABLE IF NOT EXISTS encryption_keys (
  user_id        UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  key_encrypted  TEXT NOT NULL,  -- AES key wrapped with vault master key
  key_version    INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLE: import_sessions
-- Track Gmail / SMS import runs
-- ============================================================
CREATE TABLE IF NOT EXISTS import_sessions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  source          transaction_source NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | running | done | failed
  parsed_count    INTEGER NOT NULL DEFAULT 0,
  imported_count  INTEGER NOT NULL DEFAULT 0,
  error_message   TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ
);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

CREATE TRIGGER set_budgets_updated_at
  BEFORE UPDATE ON budgets
  FOR EACH ROW EXECUTE PROCEDURE set_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets         ENABLE ROW LEVEL SECURITY;
ALTER TABLE encryption_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;

-- profiles: user sees only own
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());

-- categories: user sees system defaults (user_id IS NULL) + own
CREATE POLICY "categories_select" ON categories FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "categories_insert_own" ON categories FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "categories_update_own" ON categories FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "categories_delete_own" ON categories FOR DELETE
  USING (user_id = auth.uid());

-- transactions: strict user ownership
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "transactions_delete_own" ON transactions FOR DELETE USING (user_id = auth.uid());

-- budgets
CREATE POLICY "budgets_select_own" ON budgets FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "budgets_insert_own" ON budgets FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "budgets_update_own" ON budgets FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "budgets_delete_own" ON budgets FOR DELETE USING (user_id = auth.uid());

-- encryption_keys
CREATE POLICY "keys_select_own" ON encryption_keys FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "keys_insert_own" ON encryption_keys FOR INSERT WITH CHECK (user_id = auth.uid());

-- import_sessions
CREATE POLICY "imports_select_own" ON import_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "imports_insert_own" ON import_sessions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "imports_update_own" ON import_sessions FOR UPDATE USING (user_id = auth.uid());

-- ============================================================
-- SEED DATA: Default Categories
-- ============================================================

INSERT INTO categories (id, user_id, name, icon, color_hex, type) VALUES
  -- Income categories
  (uuid_generate_v4(), NULL, 'Salary',        '💼', '#22c55e', 'income'),
  (uuid_generate_v4(), NULL, 'Freelance',     '💻', '#10b981', 'income'),
  (uuid_generate_v4(), NULL, 'Investment',    '📈', '#06b6d4', 'income'),
  (uuid_generate_v4(), NULL, 'Gift',          '🎁', '#a78bfa', 'income'),
  (uuid_generate_v4(), NULL, 'Rental Income', '🏠', '#f59e0b', 'income'),
  (uuid_generate_v4(), NULL, 'Other Income',  '💰', '#64748b', 'income'),

  -- Expense categories
  (uuid_generate_v4(), NULL, 'Food & Dining', '🍽️', '#f97316', 'expense'),
  (uuid_generate_v4(), NULL, 'Groceries',     '🛒', '#84cc16', 'expense'),
  (uuid_generate_v4(), NULL, 'Transport',     '🚗', '#3b82f6', 'expense'),
  (uuid_generate_v4(), NULL, 'Shopping',      '🛍️', '#ec4899', 'expense'),
  (uuid_generate_v4(), NULL, 'Entertainment', '🎬', '#8b5cf6', 'expense'),
  (uuid_generate_v4(), NULL, 'Health',        '🏥', '#ef4444', 'expense'),
  (uuid_generate_v4(), NULL, 'Utilities',     '💡', '#eab308', 'expense'),
  (uuid_generate_v4(), NULL, 'Rent',          '🏠', '#14b8a6', 'expense'),
  (uuid_generate_v4(), NULL, 'Education',     '📚', '#6366f1', 'expense'),
  (uuid_generate_v4(), NULL, 'Travel',        '✈️', '#0ea5e9', 'expense'),
  (uuid_generate_v4(), NULL, 'Subscriptions', '📱', '#d946ef', 'expense'),
  (uuid_generate_v4(), NULL, 'Insurance',     '🔒', '#78716c', 'expense'),
  (uuid_generate_v4(), NULL, 'EMI / Loan',    '🏦', '#dc2626', 'expense'),
  (uuid_generate_v4(), NULL, 'Miscellaneous', '📦', '#64748b', 'expense')
ON CONFLICT DO NOTHING;

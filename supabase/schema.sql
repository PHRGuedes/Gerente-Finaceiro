-- ==============================================================================
-- SISTEMA DE CONTROLE FINANCEIRO PESSOAL (ESTILO FINTECH)
-- Schema Completo do Supabase com Políticas de Segurança Row Level Security (RLS)
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. FUNÇÃO E TRIGGER PARA ATUALIZAÇÃO AUTOMÁTICA DE `updated_at`
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. TABELA DE CATEGORIAS (`categories`)
-- Suporta categorias padrão globais (user_id IS NULL) e personalizadas por usuário
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('income', 'expense', 'both')),
  icon TEXT,
  color TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

-- ==============================================================================
-- 4. TABELA DE TRANSAÇÕES (`transactions`)
-- Registra todas as receitas e despesas (Pix, Crédito, Dinheiro, Notinhas/Terceiros)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('pix', 'credit', 'cash')),
  category TEXT NOT NULL,
  is_third_party BOOLEAN NOT NULL DEFAULT FALSE,
  debtor_name TEXT DEFAULT NULL,
  installment_current INTEGER NOT NULL DEFAULT 1 CHECK (installment_current >= 1),
  installment_total INTEGER NOT NULL DEFAULT 1 CHECK (installment_total >= 1),
  billing_cycle TEXT, -- Formato 'YYYY-MM' (ex: '2026-11')
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_billing ON public.transactions(user_id, billing_cycle);
CREATE INDEX IF NOT EXISTS idx_transactions_user_third_party ON public.transactions(user_id, is_third_party);

-- Trigger para updated_at em transactions
DROP TRIGGER IF EXISTS trigger_transactions_updated_at ON public.transactions;
CREATE TRIGGER trigger_transactions_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 5. TABELA DE RECEBÍVEIS / NOTINHAS (`receivables`)
-- Controle de valores a receber (empréstimos a amigos, compras passadas no cartão para terceiros)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  debtor_name TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  installment_current INTEGER NOT NULL DEFAULT 1 CHECK (installment_current >= 1),
  installment_total INTEGER NOT NULL DEFAULT 1 CHECK (installment_total >= 1),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  billing_cycle TEXT, -- Formato 'YYYY-MM'
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receivables_user_status ON public.receivables(user_id, status);
CREATE INDEX IF NOT EXISTS idx_receivables_user_billing ON public.receivables(user_id, billing_cycle);

-- Trigger para updated_at em receivables
DROP TRIGGER IF EXISTS trigger_receivables_updated_at ON public.receivables;
CREATE TRIGGER trigger_receivables_updated_at
  BEFORE UPDATE ON public.receivables
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 6. TABELA DE DÍVIDAS INFORMAIS (`informal_debts`)
-- Empréstimos tomados de conhecidos/família ou acordos informais a pagar
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.informal_debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  creditor_name TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_informal_debts_user ON public.informal_debts(user_id);

-- Trigger para updated_at em informal_debts
DROP TRIGGER IF EXISTS trigger_informal_debts_updated_at ON public.informal_debts;
CREATE TRIGGER trigger_informal_debts_updated_at
  BEFORE UPDATE ON public.informal_debts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 7. TABELA DE PREVISÃO E ORÇAMENTO (`forecast_items`)
-- Gastos fixos, receitas recorrentes e estimativas mensais
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.forecast_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  type TEXT NOT NULL CHECK (type IN ('income', 'fixed_expense')),
  description TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  is_variable BOOLEAN NOT NULL DEFAULT FALSE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  category TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forecast_items_user_active ON public.forecast_items(user_id, active);

-- Trigger para updated_at em forecast_items
DROP TRIGGER IF EXISTS trigger_forecast_items_updated_at ON public.forecast_items;
CREATE TRIGGER trigger_forecast_items_updated_at
  BEFORE UPDATE ON public.forecast_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 8. TABELA DE SALDOS DE CONTAS (`account_balances`)
-- Saldos iniciais e contas correntes/carteiras para conciliação
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.account_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  account_name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'checking' CHECK (account_type IN ('checking', 'cash', 'savings', 'investment', 'credit')),
  initial_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  current_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_account_balances_user ON public.account_balances(user_id);

-- Trigger para updated_at em account_balances
DROP TRIGGER IF EXISTS trigger_account_balances_updated_at ON public.account_balances;
CREATE TRIGGER trigger_account_balances_updated_at
  BEFORE UPDATE ON public.account_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- 9. CONFIGURAÇÃO DE ROW LEVEL SECURITY (RLS)
-- Garante isolamento estrito: cada usuário só acessa seus próprios registros
-- ==============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.informal_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forecast_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_balances ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Políticas RLS: categories
-- Usuários podem visualizar categorias globais (user_id IS NULL) ou criadas por eles.
-- Apenas podem inserir/atualizar/excluir as categorias vinculadas ao seu user_id.
-- ------------------------------------------------------------------------------
CREATE POLICY "Categories select policy"
  ON public.categories
  FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Categories insert policy"
  ON public.categories
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

CREATE POLICY "Categories update policy"
  ON public.categories
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Categories delete policy"
  ON public.categories
  FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Políticas RLS: transactions
-- ------------------------------------------------------------------------------
CREATE POLICY "Transactions select policy"
  ON public.transactions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Transactions insert policy"
  ON public.transactions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Transactions update policy"
  ON public.transactions
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Transactions delete policy"
  ON public.transactions
  FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Políticas RLS: receivables
-- ------------------------------------------------------------------------------
CREATE POLICY "Receivables select policy"
  ON public.receivables
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Receivables insert policy"
  ON public.receivables
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Receivables update policy"
  ON public.receivables
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Receivables delete policy"
  ON public.receivables
  FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Políticas RLS: informal_debts
-- ------------------------------------------------------------------------------
CREATE POLICY "Informal debts select policy"
  ON public.informal_debts
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Informal debts insert policy"
  ON public.informal_debts
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Informal debts update policy"
  ON public.informal_debts
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Informal debts delete policy"
  ON public.informal_debts
  FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Políticas RLS: forecast_items
-- ------------------------------------------------------------------------------
CREATE POLICY "Forecast items select policy"
  ON public.forecast_items
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Forecast items insert policy"
  ON public.forecast_items
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Forecast items update policy"
  ON public.forecast_items
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Forecast items delete policy"
  ON public.forecast_items
  FOR DELETE
  USING (user_id = auth.uid());

-- ------------------------------------------------------------------------------
-- Políticas RLS: account_balances
-- ------------------------------------------------------------------------------
CREATE POLICY "Account balances select policy"
  ON public.account_balances
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Account balances insert policy"
  ON public.account_balances
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Account balances update policy"
  ON public.account_balances
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Account balances delete policy"
  ON public.account_balances
  FOR DELETE
  USING (user_id = auth.uid());

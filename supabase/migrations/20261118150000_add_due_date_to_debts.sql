-- Migration: 20261118150000_add_due_date_to_debts.sql
-- Description: Adiciona coluna due_date (data prevista de pagamento) na tabela informal_debts

ALTER TABLE public.informal_debts
  ADD COLUMN IF NOT EXISTS due_date DATE DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_informal_debts_user_due_date
  ON public.informal_debts(user_id, due_date);

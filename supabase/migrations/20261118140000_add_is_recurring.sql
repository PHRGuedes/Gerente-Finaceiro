-- Migration: 20261118140000_add_is_recurring.sql
-- Description: Adiciona coluna is_recurring na tabela transactions para controle de despesas recorrentes e assinaturas

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_transactions_user_recurring
  ON public.transactions(user_id, is_recurring);

-- ==============================================================================
-- SISTEMA DE CONTROLE FINANCEIRO PESSOAL (ESTILO FINTECH)
-- Script de Seed: Categorias Padrão e Saldos Iniciais
-- ==============================================================================

-- 1. CADASTRO DAS CATEGORIAS PADRÃO DO SISTEMA
-- Categorias com user_id = NULL são compartilhadas para todos os usuários lerem.
-- Cada categoria inclui ícone do Lucide e paleta de cor moderna no padrão Dark Mode.

INSERT INTO public.categories (name, type, icon, color, is_default, user_id)
VALUES
  ('Alimentação', 'expense', 'Utensils', '#f97316', TRUE, NULL),
  ('Lazer', 'expense', 'Gamepad2', '#8b5cf6', TRUE, NULL),
  ('Assinatura', 'expense', 'Tv', '#3b82f6', TRUE, NULL),
  ('Contas', 'expense', 'Receipt', '#ef4444', TRUE, NULL),
  ('Poker', 'both', 'Spade', '#10b981', TRUE, NULL),
  ('Saúde', 'expense', 'HeartPulse', '#06b6d4', TRUE, NULL),
  ('Roupas', 'expense', 'Shirt', '#ec4899', TRUE, NULL),
  ('Airsoft', 'expense', 'Crosshair', '#eab308', TRUE, NULL),
  ('Cuidado Pessoal', 'expense', 'Sparkles', '#a855f7', TRUE, NULL),
  ('Transporte', 'expense', 'Car', '#6366f1', TRUE, NULL),
  ('Empréstimo', 'both', 'HandCoins', '#14b8a6', TRUE, NULL),
  ('Presente', 'expense', 'Gift', '#f43f5e', TRUE, NULL),
  ('Notinha / Terceiros', 'both', 'Users', '#f59e0b', TRUE, NULL),
  ('Outros', 'both', 'MoreHorizontal', '#64748b', TRUE, NULL),
  -- Categorias complementares de Receita
  ('Salário', 'income', 'Briefcase', '#22c55e', TRUE, NULL),
  ('Rendimentos / Investimentos', 'income', 'TrendingUp', '#10b981', TRUE, NULL),
  ('Freelance / Extra', 'income', 'Laptop', '#0ea5e9', TRUE, NULL)
ON CONFLICT DO NOTHING;


-- ==============================================================================
-- 2. FUNÇÃO E TRIGGER PARA CRIAÇÃO AUTOMÁTICA DE SALDOS INICIAIS AO CRIAR USUÁRIO
-- Quando um usuário se cadastra no Supabase Auth, suas carteiras iniciais são geradas.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_finance_setup()
RETURNS TRIGGER AS $$
BEGIN
  -- Criação das contas/carteiras com saldo zerado ou valor padrão
  INSERT INTO public.account_balances (user_id, account_name, account_type, initial_balance, current_balance)
  VALUES
    (NEW.id, 'Conta Corrente / Pix', 'checking', 0.00, 0.00),
    (NEW.id, 'Dinheiro em Espécie', 'cash', 0.00, 0.00),
    (NEW.id, 'Reserva de Emergência', 'savings', 0.00, 0.00);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger disparado após a criação de um usuário no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created_finance ON auth.users;
CREATE TRIGGER on_auth_user_created_finance
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_finance_setup();


-- ==============================================================================
-- 3. SEED DE EXEMPLO PARA TESTE LOCAL / USUÁRIO EXISTENTE
-- Caso você já tenha criado um usuário no Supabase Auth, substitua o UUID abaixo
-- pelo id do seu usuário (obtido em Supabase > Authentication > Users):
-- ==============================================================================
DO $$
DECLARE
  v_first_user_id UUID;
BEGIN
  -- Tenta obter o primeiro usuário cadastrado no auth.users (se existir)
  SELECT id INTO v_first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF v_first_user_id IS NOT NULL THEN
    -- Inserir saldos iniciais caso ainda não existam para este usuário
    IF NOT EXISTS (SELECT 1 FROM public.account_balances WHERE user_id = v_first_user_id) THEN
      INSERT INTO public.account_balances (user_id, account_name, account_type, initial_balance, current_balance)
      VALUES
        (v_first_user_id, 'Conta Corrente / Pix', 'checking', 1500.00, 1500.00),
        (v_first_user_id, 'Dinheiro em Espécie', 'cash', 200.00, 200.00),
        (v_first_user_id, 'Reserva de Emergência', 'savings', 5000.00, 5000.00);
    END IF;

    -- Inserir itens de previsão de exemplo
    IF NOT EXISTS (SELECT 1 FROM public.forecast_items WHERE user_id = v_first_user_id) THEN
      INSERT INTO public.forecast_items (user_id, type, description, amount, is_variable, active, category)
      VALUES
        (v_first_user_id, 'income', 'Salário Mensal', 6500.00, FALSE, TRUE, 'Salário'),
        (v_first_user_id, 'fixed_expense', 'Aluguel & Condomínio', 1800.00, FALSE, TRUE, 'Contas'),
        (v_first_user_id, 'fixed_expense', 'Internet & Celular', 160.00, FALSE, TRUE, 'Contas'),
        (v_first_user_id, 'fixed_expense', 'Assinaturas (Netflix/Spotify)', 85.90, FALSE, TRUE, 'Assinatura');
    END IF;
  END IF;
END $$;

# Gerente Financeiro Pessoal (Fintech Dark Mode)

Sistema web moderno de controle financeiro pessoal construído com **Next.js (App Router)**, **TypeScript**, **Tailwind CSS** e **Supabase**.

---

## 🚀 Etapa 1 - Entregáveis Concluídos

1. **Estrutura de Pastas do Projeto**
   - Configuração do Next.js App Router com suporte a Server/Client Components.
   - Organização modular em `components/`, `lib/supabase/`, `types/` e `supabase/`.
   - Visual Dark Mode moderno inspirado em interfaces de fintechs.

2. **Modelagem de Dados e Scripts SQL no Supabase**
   - `transactions`: Receitas e despesas (`pix`, `credit`, `cash`), parcelamentos e compras de terceiros / notinhas (`is_third_party`, `debtor_name`, `billing_cycle`).
   - `receivables`: A receber de terceiros por devedor, parcelas e fatura/ciclo de cobrança.
   - `informal_debts`: Dívidas informais / empréstimos tomados com controle de valor total e amortizado.
   - `forecast_items`: Planejamento orçamentário mensal (gastos fixos e receitas recorrentes/variáveis).
   - `account_balances`: Controle de saldos de contas e carteiras.
   - `categories`: Suporte a categorias compartilhadas (sistema) e personalizadas por usuário.
   - **Row Level Security (RLS)** ativo com políticas rigorosas para todas as tabelas.

3. **Scripts de Seed e Migrations**
   - Seed de **14 categorias padrão** com cores e ícones fintech: *Alimentação, Lazer, Assinatura, Contas, Poker, Saúde, Roupas, Airsoft, Cuidado Pessoal, Transporte, Empréstimo, Presente, Notinha / Terceiros, Outros*.
   - Trigger automático para provisionamento de saldos iniciais de contas ao registrar novos usuários (`auth.users`).

4. **Configuração dos Clientes Supabase**
   - `src/lib/supabase/client.ts`: Cliente de navegador para Client Components.
   - `src/lib/supabase/server.ts`: Cliente de servidor para Server Components, Server Actions e Route Handlers.
   - `src/lib/supabase/middleware.ts` + `middleware.ts`: Renovação automática de sessão e tokens de autenticação via cookies.
   - Tipagem completa em `src/types/database.types.ts` e `src/types/finance.ts`.

---

## 🚀 Etapa 3 - Lançamento Rápido Inteligente (Chat Parser)

O componente **Lançamento Rápido** fica fixado no topo do Dashboard e oferece dois modos de uso:

1. **⚡ Texto Inteligente (Parser em Linguagem Natural):**
   - **Formato Estruturado em Bloco:**
     `Tipo: Despesa | Descrição: 2 Açaís | Valor: 25,82 | Data: 11/11 | Forma de pagamento: Crédito | Categoria: Lazer`
   - **Frases Curtas Naturais:**
     - `+100 Croupier freeroll pix` → Receita de R$ 100,00 no Pix (Categoria: Poker).
     - `12,90 Barrinha Spincoffee alimentacao credito` → Despesa de R$ 12,90 no Crédito (Categoria: Alimentação).
   - **Sessões de Poker (Entrada e Saída Juntas):**
     - `cash poker -90 +151` → Cria automaticamente a despesa de Buy-in (R$ 90,00) e a receita de Cashout (R$ 151,00) no Pix e exibe o Lucro Líquido (+R$ 61,00) antes de salvar.
   - **Pré-visualização Instantânea:** Conforme você digita, o sistema exibe um card com os dados interpretados e permite salvar com `Enter ↵`.

2. **📝 Formulário Expresso:**
   - Formulário horizontal rápido com seleção de tipo, descrição, valor, categoria, meio de pagamento e compra de terceiros (notinha).

---

## 📂 Estrutura de Diretórios

```
Gerente-Finaceiro/
├── .env.local.example                   # Modelo de variáveis de ambiente
├── .env.local                           # Credenciais locais do Supabase
├── middleware.ts                        # Middleware Next.js (renovação de sessão Supabase)
├── package.json                         # Dependências do projeto
├── tsconfig.json                        # Configuração do TypeScript
├── supabase/
│   ├── schema.sql                       # DDL completo das tabelas, índices e políticas RLS
│   ├── seed.sql                         # Seed das 14 categorias padrão e saldos iniciais
│   └── migrations/
│       └── 20261116000000_initial_schema.sql # Migration pronta para Supabase CLI
└── src/
    ├── app/
    │   ├── globals.css                  # Estilos globais e tokens de cores Dark Mode
    │   ├── layout.tsx                   # Root layout com tema escuro e fontes Geist
    │   └── page.tsx                     # Dashboard moderno de status da Etapa 1
    ├── components/
    │   └── ui/                          # Componentes reutilizáveis (Card, Badge, Button)
    ├── lib/
    │   ├── utils.ts                     # Utilitários de classes (cn), moeda BRL e datas
    │   └── supabase/
    │       ├── client.ts                # createBrowserClient (Client Components)
    │       ├── server.ts                # createServerClient com cookies() (Server)
    │       └── middleware.ts            # Gerenciador de cookies do middleware
    └── types/
        ├── database.types.ts            # Tipos gerados do banco Supabase
        └── finance.ts                   # Interfaces e tipos de domínio da aplicação
```

---

## ⚡ Como Rodar o Banco no Supabase

1. Acesse o painel do seu projeto no [Supabase](https://supabase.com).
2. Abra o menu **SQL Editor**.
3. Crie uma nova query e copie e cole o conteúdo de:
   - [`supabase/schema.sql`](supabase/schema.sql)
4. Execute o script (`Run`).
5. Em seguida, execute o conteúdo de:
   - [`supabase/seed.sql`](supabase/seed.sql)

---

## 💻 Como Rodar o Projeto Localmente

1. Preencha suas credenciais do Supabase no arquivo `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

2. Instale as dependências (já instaladas):
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

4. Abra no navegador: [http://localhost:3000](http://localhost:3000)

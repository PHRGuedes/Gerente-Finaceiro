import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  HandCoins,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  Database,
  Layers,
  Sparkles,
  Tag,
  CreditCard,
  QrCode,
  Banknote,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

export default function Home() {
  const defaultCategories = [
    { name: 'Alimentação', color: '#f97316', icon: 'Utensils' },
    { name: 'Lazer', color: '#8b5cf6', icon: 'Gamepad2' },
    { name: 'Assinatura', color: '#3b82f6', icon: 'Tv' },
    { name: 'Contas', color: '#ef4444', icon: 'Receipt' },
    { name: 'Poker', color: '#10b981', icon: 'Spade' },
    { name: 'Saúde', color: '#06b6d4', icon: 'HeartPulse' },
    { name: 'Roupas', color: '#ec4899', icon: 'Shirt' },
    { name: 'Airsoft', color: '#eab308', icon: 'Crosshair' },
    { name: 'Cuidado Pessoal', color: '#a855f7', icon: 'Sparkles' },
    { name: 'Transporte', color: '#6366f1', icon: 'Car' },
    { name: 'Empréstimo', color: '#14b8a6', icon: 'HandCoins' },
    { name: 'Presente', color: '#f43f5e', icon: 'Gift' },
    { name: 'Notinha / Terceiros', color: '#f59e0b', icon: 'Users' },
    { name: 'Outros', color: '#64748b', icon: 'MoreHorizontal' },
  ]

  return (
    <div className="min-h-screen bg-[#07090e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.08),rgba(255,255,255,0))] text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-white/[0.06] bg-[#0c101a]/70 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="h-5 w-5 text-black" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                Fintech Manager
              </span>
              <span className="ml-2 text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Etapa 1: Arquitetura & Banco
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-white/[0.03] border border-white/[0.08] px-3 py-1.5 rounded-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Supabase SSR Configurado
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Controle Financeiro Pessoal Inteligente
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Infraestrutura & Modelagem Concluída
          </h1>
          <p className="text-slate-400 max-w-3xl text-sm sm:text-base leading-relaxed">
            Estrutura Next.js App Router, TypeScript, Tailwind CSS, clientes Supabase SSR e scripts SQL com Row Level Security (RLS) configurados para o seu ecossistema financeiro.
          </p>
        </div>

        {/* Financial KPI Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-emerald-500/20 bg-gradient-to-b from-[#111927] to-[#0c121d]">
            <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-xs uppercase font-medium tracking-wider text-slate-400">
                Saldo Consolidado
              </CardDescription>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Wallet className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(6700.0)}
              </div>
              <p className="text-xs text-emerald-400/90 mt-1 flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5" /> Saldos Iniciais Provisionados
              </p>
            </CardContent>
          </Card>

          <Card className="border-rose-500/20 bg-gradient-to-b from-[#111927] to-[#0c121d]">
            <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-xs uppercase font-medium tracking-wider text-slate-400">
                Previsão de Despesas Fixas
              </CardDescription>
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                <CalendarDays className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold text-white tracking-tight">
                {formatCurrency(2045.9)}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                Tabela <code className="text-xs font-mono text-slate-300">forecast_items</code>
              </p>
            </CardContent>
          </Card>

          <Card className="border-amber-500/20 bg-gradient-to-b from-[#111927] to-[#0c121d]">
            <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-xs uppercase font-medium tracking-wider text-slate-400">
                Notinhas / Terceiros (A Receber)
              </CardDescription>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Users className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold text-amber-400 tracking-tight">
                {formatCurrency(850.0)}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                Tabela <code className="text-xs font-mono text-slate-300">receivables</code>
              </p>
            </CardContent>
          </Card>

          <Card className="border-violet-500/20 bg-gradient-to-b from-[#111927] to-[#0c121d]">
            <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
              <CardDescription className="text-xs uppercase font-medium tracking-wider text-slate-400">
                Dívidas Informais (A Pagar)
              </CardDescription>
              <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400">
                <HandCoins className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="text-2xl font-bold text-violet-400 tracking-tight">
                {formatCurrency(1200.0)}
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                Tabela <code className="text-xs font-mono text-slate-300">informal_debts</code>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Database Architecture Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-emerald-400" />
                <CardTitle>Tabelas & Modelagem SQL do Supabase</CardTitle>
              </div>
              <CardDescription>
                Tabelas criadas com chaves primárias UUID, índices de performance e isolamento rigoroso via Row Level Security (RLS).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* transactions */}
                <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0c101a]/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-emerald-400">
                      transactions
                    </span>
                    <Badge variant="success">RLS Ativo</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Lançamentos de receitas e despesas (Pix, Crédito, Dinheiro), parcelamentos e compras de terceiros.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      type (income|expense)
                    </span>
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      payment_method (pix|credit|cash)
                    </span>
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      is_third_party
                    </span>
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      billing_cycle
                    </span>
                  </div>
                </div>

                {/* receivables */}
                <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0c101a]/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-amber-400">
                      receivables
                    </span>
                    <Badge variant="success">RLS Ativo</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Controle de notinhas e empréstimos a receber de terceiros por devedor, parcela e fatura.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      debtor_name
                    </span>
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      status (pending|paid)
                    </span>
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      installment
                    </span>
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      billing_cycle
                    </span>
                  </div>
                </div>

                {/* informal_debts */}
                <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0c101a]/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-violet-400">
                      informal_debts
                    </span>
                    <Badge variant="success">RLS Ativo</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Dívidas informais com pessoas físicas/familiares, saldo total contratado e amortizações parciais.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      creditor_name
                    </span>
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      total_amount
                    </span>
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      paid_amount
                    </span>
                  </div>
                </div>

                {/* forecast_items */}
                <div className="p-4 rounded-xl border border-white/[0.06] bg-[#0c101a]/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-semibold text-rose-400">
                      forecast_items
                    </span>
                    <Badge variant="success">RLS Ativo</Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Projeção de fluxo de caixa com despesas fixas recorrentes, receitas e itens variáveis.
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      type (income|fixed_expense)
                    </span>
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      is_variable
                    </span>
                    <span className="text-[10px] bg-white/[0.05] text-slate-300 px-2 py-0.5 rounded font-mono">
                      active
                    </span>
                  </div>
                </div>
              </div>

              {/* Arquivos de Script */}
              <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-slate-400">
                  Scripts SQL disponíveis para execução direta no Supabase SQL Editor:
                </span>
                <div className="flex items-center gap-2">
                  <code className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded">
                    supabase/schema.sql
                  </code>
                  <code className="text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">
                    supabase/seed.sql
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Setup / Checklist */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <CardTitle>Checklist da Etapa 1</CardTitle>
              </div>
              <CardDescription>Status de entrega das especificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { title: 'Estrutura de Pastas Next.js', status: 'Concluído' },
                { title: 'Tabela transactions (RLS)', status: 'Concluído' },
                { title: 'Tabela receivables (RLS)', status: 'Concluído' },
                { title: 'Tabela informal_debts (RLS)', status: 'Concluído' },
                { title: 'Tabela forecast_items (RLS)', status: 'Concluído' },
                { title: 'Seed de 14 Categorias', status: 'Concluído' },
                { title: 'Configuração Saldos Iniciais', status: 'Concluído' },
                { title: 'Cliente Supabase SSR (Browser/Server)', status: 'Concluído' },
              ].map((item, index) => (
                <div key={index} className="flex items-center justify-between text-xs py-1 border-b border-white/[0.04] last:border-none">
                  <span className="text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    {item.title}
                  </span>
                  <Badge variant="success" className="text-[10px]">
                    {item.status}
                  </Badge>
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Meios de Pagamento Atendidos
                </span>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] flex flex-col items-center gap-1">
                    <QrCode className="h-4 w-4 text-emerald-400" />
                    <span className="text-[11px] font-mono">pix</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] flex flex-col items-center gap-1">
                    <CreditCard className="h-4 w-4 text-blue-400" />
                    <span className="text-[11px] font-mono">credit</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06] flex flex-col items-center gap-1">
                    <Banknote className="h-4 w-4 text-amber-400" />
                    <span className="text-[11px] font-mono">cash</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Categorias Padrão Cadastradas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-emerald-400" />
                <div>
                  <CardTitle>Categorias Padrão Cadastradas (Seed)</CardTitle>
                  <CardDescription>
                    14 categorias padrão com ícones e paleta customizada no Dark Mode
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline">{defaultCategories.length} Categorias</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {defaultCategories.map((cat, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-white/[0.06] bg-[#0d121e] hover:border-white/20 transition-all flex flex-col items-center text-center gap-2 group"
                >
                  <div
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${cat.color}25`, color: cat.color, border: `1px solid ${cat.color}40` }}
                  >
                    •
                  </div>
                  <span className="text-xs font-medium text-slate-200 truncate w-full">
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

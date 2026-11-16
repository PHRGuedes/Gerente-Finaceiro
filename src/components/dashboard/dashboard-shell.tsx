'use client'

import React, { useState } from 'react'
import {
  Wallet,
  PlusCircle,
  CreditCard,
  QrCode,
  Sparkles,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { HeaderStats } from '@/components/dashboard/header-stats'
import { QuickEntryBar } from '@/components/dashboard/quick-entry-bar'
import { TransactionList } from '@/components/dashboard/transaction-list'
import { CategoryChart } from '@/components/dashboard/category-chart'
import { NewTransactionModal } from '@/components/dashboard/new-transaction-modal'
import { PayInvoiceModal } from '@/components/dashboard/pay-invoice-modal'
import { SettleReceivableModal } from '@/components/dashboard/settle-receivable-modal'
import { AmortizeDebtModal } from '@/components/dashboard/amortize-debt-modal'
import { BillingCycleInfo } from '@/lib/billing'
import {
  Transaction,
  Category,
  Receivable,
  InformalDebt,
  ForecastItem,
  AccountBalance,
} from '@/types/finance'

interface DashboardShellProps {
  initialData: {
    checkingBalance: number
    billingCycle: BillingCycleInfo
    creditInvoice: {
      total: number
      ownExpense: number
      thirdPartyExpense: number
    }
    fixedObligations: {
      total: number
      items: ForecastItem[]
    }
    informalDebts: {
      totalRemaining: number
      items: InformalDebt[]
    }
    receivables: {
      totalPending: number
      items: Receivable[]
    }
    transactions: Transaction[]
    categories: Category[]
  }
}

export function DashboardShell({ initialData }: DashboardShellProps) {
  const [isNewTxOpen, setIsNewTxOpen] = useState(false)
  const [isPayInvoiceOpen, setIsPayInvoiceOpen] = useState(false)
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null)
  const [selectedDebt, setSelectedDebt] = useState<InformalDebt | null>(null)

  const {
    checkingBalance,
    billingCycle,
    creditInvoice,
    fixedObligations,
    informalDebts,
    receivables,
    transactions,
    categories,
  } = initialData

  return (
    <div className="min-h-screen bg-[#07090e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.07),rgba(255,255,255,0))] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-white/[0.06] bg-[#0c101a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Wallet className="h-5 w-5 text-black" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent block leading-tight">
                Fintech Manager
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Controle Financeiro Pessoal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Ciclo Info Badge */}
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-300 bg-[#121927] border border-white/[0.08] px-3 py-1.5 rounded-xl font-mono">
              <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse"></span>
              {billingCycle.label}
            </div>

            {/* Botão Novo Lançamento */}
            <Button
              size="sm"
              onClick={() => setIsNewTxOpen(true)}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4 text-black" />
              <span>Novo Lançamento</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1 w-full">
        {/* Banner Informativo da Regra Financeira */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#0e1626] to-violet-950/30 border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Regra Ativa:</strong> Saldo em conta atualizado via <strong>Pix/Dinheiro</strong>. Compras no <strong>Crédito</strong> acumulam na fatura (fechamento todo <strong>dia 04</strong>) sem deduzir da conta.
            </span>
          </div>
          <div className="text-[11px] text-slate-400 shrink-0 font-mono">
            Próximo Fechamento: {billingCycle.daysUntilClosing} dias
          </div>
        </div>

        {/* Lançamento Rápido Inteligente (Etapa 3) */}
        <QuickEntryBar categories={categories} />

        {/* 1. Cards do Topo (Os 5 KPIs essenciais) */}
        <HeaderStats
          checkingBalance={checkingBalance}
          billingCycle={billingCycle}
          creditInvoice={creditInvoice}
          fixedObligations={fixedObligations}
          informalDebts={informalDebts}
          receivables={receivables}
          onOpenPayInvoice={() => setIsPayInvoiceOpen(true)}
          onOpenNewTransaction={() => setIsNewTxOpen(true)}
          onOpenAmortizeDebt={(debt) => setSelectedDebt(debt)}
          onOpenSettleReceivable={(rec) => setSelectedReceivable(rec)}
        />

        {/* 2. Grid com Listagem e Gráfico de Categorias */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Listagem com Filtros (Ocupa 2 colunas) */}
          <div className="lg:col-span-2">
            <TransactionList
              transactions={transactions}
              categories={categories}
              cycleLabel={billingCycle.label}
            />
          </div>

          {/* Gráfico / Resumo Visual de Gastos (Ocupa 1 coluna) */}
          <div className="lg:col-span-1">
            <CategoryChart
              transactions={transactions}
              categories={categories}
            />
          </div>
        </div>
      </main>

      {/* Modals */}
      <NewTransactionModal
        isOpen={isNewTxOpen}
        onClose={() => setIsNewTxOpen(false)}
        categories={categories}
      />

      <PayInvoiceModal
        isOpen={isPayInvoiceOpen}
        onClose={() => setIsPayInvoiceOpen(false)}
        cycleId={billingCycle.cycleId}
        cycleLabel={billingCycle.label}
        checkingBalance={checkingBalance}
        invoiceTotal={creditInvoice.total}
        ownExpense={creditInvoice.ownExpense}
        thirdPartyExpense={creditInvoice.thirdPartyExpense}
      />

      <SettleReceivableModal
        receivable={selectedReceivable}
        onClose={() => setSelectedReceivable(null)}
      />

      <AmortizeDebtModal
        debt={selectedDebt}
        onClose={() => setSelectedDebt(null)}
        checkingBalance={checkingBalance}
      />
    </div>
  )
}

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
  LayoutDashboard,
  Users,
  Layers,
  HandCoins,
  CalendarDays,
  Spade,
  LogOut,
  User as UserIcon,
} from 'lucide-react'
import { signOutAction } from '@/actions/auth'
import { Button } from '@/components/ui/button'
import { HeaderStats } from '@/components/dashboard/header-stats'
import { TransactionList } from '@/components/dashboard/transaction-list'
import { CategoryChart } from '@/components/dashboard/category-chart'
import { ReceivablesSection } from '@/components/dashboard/receivables-section'
import { DebtsManager } from '@/components/dashboard/debts-manager'
import { ForecastSimulator } from '@/components/dashboard/forecast-simulator'
import { PokerSection } from '@/components/dashboard/poker-section'
import { NewTransactionModal } from '@/components/dashboard/new-transaction-modal'
import { PayInvoiceModal } from '@/components/dashboard/pay-invoice-modal'
import { SettleReceivableModal } from '@/components/dashboard/settle-receivable-modal'
import { AmortizeDebtModal } from '@/components/dashboard/amortize-debt-modal'
import { CSVConciliatorModal } from '@/components/dashboard/csv-conciliator-modal'
import { ExportPdfModal } from '@/components/dashboard/export-pdf-modal'
import { BillingCycleInfo } from '@/lib/billing'
import {
  Transaction,
  Category,
  Receivable,
  InformalDebt,
  ForecastItem,
  AccountBalance,
  PokerEntry,
} from '@/types/finance'

export type ActiveTab = 'overview' | 'notinhas' | 'forecast' | 'debts' | 'poker'

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
    allReceivables: Receivable[]
    allForecastItems: ForecastItem[]
    transactions: Transaction[]
    categories: Category[]
    pokerEntries?: PokerEntry[]
    currentUser?: {
      id: string
      email: string
      fullName: string
    }
  }
}

export function DashboardShell({ initialData }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [isNewTxOpen, setIsNewTxOpen] = useState(false)
  const [isPayInvoiceOpen, setIsPayInvoiceOpen] = useState(false)
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null)
  const [selectedDebt, setSelectedDebt] = useState<InformalDebt | null>(null)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)

  const {
    checkingBalance,
    billingCycle,
    creditInvoice,
    fixedObligations,
    informalDebts,
    receivables,
    allReceivables,
    allForecastItems,
    transactions,
    categories,
    pokerEntries = [],
    currentUser,
  } = initialData

  const pendingNotinhasCount = allReceivables.filter((r) => r.status === 'pending').length
  const currentCreditTransactions = transactions.filter((t) => t.payment_method === 'credit')

  return (
    <div className="min-h-screen bg-[#07090e] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.07),rgba(255,255,255,0))] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-white/[0.06] bg-[#0c101a]/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Wallet className="h-4.5 w-4.5 text-black" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-none">
                Controle Financeiro
              </span>
            </div>
          </div>

          {/* Abas de Navegação Principal */}
          <div className="hidden lg:flex items-center gap-1 p-1 bg-[#111726]/90 rounded-xl border border-white/[0.08]">
            <button
              onClick={() => setActiveTab('overview')}
              className={`h-8 px-3 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'overview'
                  ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Visão Geral
            </button>

            <button
              onClick={() => setActiveTab('notinhas')}
              className={`h-8 px-3 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'notinhas'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              Notinhas
              {pendingNotinhasCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    activeTab === 'notinhas'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {pendingNotinhasCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('forecast')}
              className={`h-8 px-3 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'forecast'
                  ? 'bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" />
              Previsão
            </button>

            <button
              onClick={() => setActiveTab('debts')}
              className={`h-8 px-3 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'debts'
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <HandCoins className="h-3.5 w-3.5" />
              Dívidas
            </button>

            <button
              onClick={() => setActiveTab('poker')}
              className={`h-8 px-3 rounded-lg text-xs transition-all flex items-center gap-1.5 ${
                activeTab === 'poker'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Spade className="h-3.5 w-3.5 text-emerald-400" />
              Poker
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Ciclo Info Badge */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-[#111726]/90 border border-white/[0.08] px-3 h-8 rounded-lg font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse"></span>
              <span>{billingCycle.label}</span>
            </div>

            {/* Botão Novo Lançamento */}
            <Button
              size="sm"
              onClick={() => setIsNewTxOpen(true)}
              className="h-8 px-2.5 sm:px-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 rounded-lg"
            >
              <PlusCircle className="h-3.5 w-3.5 text-black shrink-0" />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
            </Button>

            {/* Usuário Conectado & Logout */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-white/10 shrink-0">
                <div
                  className="h-8 w-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 uppercase"
                  title={currentUser.email}
                >
                  {currentUser.fullName.charAt(0) || currentUser.email.charAt(0)}
                </div>
                <div className="hidden xl:block text-left text-xs max-w-[120px] truncate leading-tight">
                  <span className="font-semibold text-white truncate block">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await signOutAction()
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Sair da Conta (Logout)"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Abas Secundárias Mobile e Tablets com Scroll Suave */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto scrollbar-none p-1.5 bg-[#090d16] border-t border-white/[0.06] text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`shrink-0 py-1.5 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'overview'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Visão Geral
          </button>

          <button
            onClick={() => setActiveTab('notinhas')}
            className={`shrink-0 py-1.5 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'notinhas'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            Notinhas
            {pendingNotinhasCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-500/20 text-amber-300 font-bold">
                {pendingNotinhasCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`shrink-0 py-1.5 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'forecast'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Previsão
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`shrink-0 py-1.5 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'debts'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HandCoins className="h-3.5 w-3.5" />
            Dívidas
          </button>

          <button
            onClick={() => setActiveTab('poker')}
            className={`shrink-0 py-1.5 px-3 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
              activeTab === 'poker'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Spade className="h-3.5 w-3.5" />
            Poker
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex-1 w-full">
        {/* Banner Informativo da Regra Financeira */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/30 via-[#0e1626] to-violet-950/30 border border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Regra Financeira:</strong> Saldo em conta alterado via <strong>Pix/Dinheiro</strong>. Cartão de <strong>Crédito</strong> acumula na fatura com fechamento todo <strong>dia 04</strong>.
            </span>
          </div>
          <div className="text-[11px] text-slate-400 shrink-0 font-mono">
            Fechamento em {billingCycle.daysUntilClosing} dias
          </div>
        </div>

        {/* CONTEÚDO CONDICIONAL POR ABA */}
        {activeTab === 'overview' && (
          <>
            {/* 1. Cards do Topo (Os KPIs essenciais) */}
            <HeaderStats
              checkingBalance={checkingBalance}
              billingCycle={billingCycle}
              creditInvoice={creditInvoice}
              informalDebts={informalDebts}
              receivables={receivables}
              onOpenPayInvoice={() => setIsPayInvoiceOpen(true)}
              onOpenNewTransaction={() => setIsNewTxOpen(true)}
              onOpenAmortizeDebt={(debt) => {
                setSelectedDebt(debt)
                setActiveTab('debts')
              }}
              onOpenSettleReceivable={() => setActiveTab('notinhas')}
              onOpenConciliateCsv={() => setIsCsvModalOpen(true)}
              onOpenExportPdf={() => setIsPdfModalOpen(true)}
            />

            {/* 2. Grid com Listagem e Gráfico de Categorias */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              {/* Listagem com Filtros (Ocupa 2 colunas) */}
              <div className="lg:col-span-2">
                <TransactionList
                  transactions={transactions}
                  categories={categories}
                  cycleLabel={billingCycle.label}
                  onOpenConciliateCsv={() => setIsCsvModalOpen(true)}
                  onOpenExportPdf={() => setIsPdfModalOpen(true)}
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
          </>
        )}

        {/* ABA: NOTINHAS (RECEBÍVEIS DE TERCEIROS - ETAPA 4) */}
        {activeTab === 'notinhas' && (
          <ReceivablesSection
            receivables={allReceivables}
            currentCycleId={billingCycle.cycleId}
            currentCycleLabel={billingCycle.label}
          />
        )}

        {/* ABA: PREVISÃO & SIMULADOR DO PRÓXIMO CICLO (ETAPA 5) */}
        {activeTab === 'forecast' && (
          <ForecastSimulator
            checkingBalance={checkingBalance}
            billingCycle={billingCycle}
            forecastItems={allForecastItems}
            informalDebts={informalDebts.items}
            allReceivables={allReceivables}
            creditInvoiceTotal={creditInvoice.total}
          />
        )}

        {/* ABA: GESTÃO DE DÍVIDAS */}
        {activeTab === 'debts' && (
          <DebtsManager
            debts={informalDebts.items}
            checkingBalance={checkingBalance}
          />
        )}

        {/* ABA: TRACKER & BANKROLL DE POKER INDEPENDENTE */}
        {activeTab === 'poker' && (
          <PokerSection entries={pokerEntries} />
        )}
      </main>

      {/* Modals Globais */}
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

      {/* Etapa 6: Conciliador de CSV do Nubank */}
      <CSVConciliatorModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        existingTransactions={transactions}
        categories={categories}
        currentCycleId={billingCycle.cycleId}
        currentCycleLabel={billingCycle.label}
      />

      {/* Etapa 6: Exportação de Fatura em PDF */}
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        cycle={billingCycle}
        creditTransactions={currentCreditTransactions}
        totals={{
          general: creditInvoice.total,
          ownExpense: creditInvoice.ownExpense,
          thirdParty: creditInvoice.thirdPartyExpense,
        }}
      />
    </div>
  )
}

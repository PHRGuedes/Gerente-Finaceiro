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
      <header className="border-b border-white/[0.06] bg-[#0c101a]/90 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 lg:gap-4">
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              <Wallet className="h-4.5 w-4.5 text-black" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block leading-none whitespace-nowrap">
                Controle Financeiro
              </span>
            </div>
          </div>

          {/* Abas de Navegação Principal (Desktop - alturas uniformes h-9 e sem quebra de texto) */}
          <nav className="hidden lg:flex items-center gap-1 p-1 bg-[#111726]/90 rounded-xl border border-white/[0.08] shrink-0">
            <button
              onClick={() => setActiveTab('overview')}
              className={`h-9 px-3.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-all border ${
                activeTab === 'overview'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('notinhas')}
              className={`h-9 px-3.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-all border ${
                activeTab === 'notinhas'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>Notinhas</span>
              {pendingNotinhasCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold leading-none ${
                    activeTab === 'notinhas'
                      ? 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                      : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  {pendingNotinhasCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('forecast')}
              className={`h-9 px-3.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-all border ${
                activeTab === 'forecast'
                  ? 'bg-teal-500/15 text-teal-300 border-teal-500/30 font-semibold shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5 shrink-0" />
              <span>Previsão</span>
            </button>

            <button
              onClick={() => setActiveTab('debts')}
              className={`h-9 px-3.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-all border ${
                activeTab === 'debts'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 font-semibold shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <HandCoins className="h-3.5 w-3.5 shrink-0" />
              <span>Dívidas</span>
            </button>

            <button
              onClick={() => setActiveTab('poker')}
              className={`h-9 px-3.5 rounded-lg text-xs font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-all border ${
                activeTab === 'poker'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-semibold shadow-sm'
                  : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Spade className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>Poker</span>
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Ciclo Info Badge (h-9 uniforme, responsivo e sem quebra de texto) */}
            <div className="hidden md:inline-flex items-center gap-2 text-xs text-slate-300 bg-[#111726]/90 border border-white/[0.08] px-3.5 h-9 rounded-xl font-mono whitespace-nowrap shrink-0">
              <span className="h-2 w-2 rounded-full bg-violet-400 animate-pulse shrink-0"></span>
              <span className="hidden 2xl:inline">{billingCycle.label}</span>
              <span className="2xl:hidden">Fatura 04/{billingCycle.cycleId.split('-')[1]}</span>
            </div>

            {/* Botão Novo Lançamento (h-9 uniforme com os demais botões) */}
            <button
              type="button"
              onClick={() => setIsNewTxOpen(true)}
              className="h-9 px-3 sm:px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all active:scale-[0.98] cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-black shrink-0" />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
            </button>

            {/* Usuário Conectado & Logout (alinhado rigorosamente a h-9) */}
            {currentUser && (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-2.5 border-l border-white/10 shrink-0 h-9">
                <div
                  className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 uppercase select-none shadow-sm"
                  title={currentUser.email}
                >
                  {currentUser.fullName.charAt(0) || currentUser.email.charAt(0)}
                </div>
                <div className="hidden xl:block text-left text-xs max-w-[120px] truncate leading-tight select-none">
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
                  className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all cursor-pointer shrink-0"
                  title="Sair da Conta (Logout)"
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Abas Secundárias Mobile e Tablets com Scroll Suave (touch-friendly h-9) */}
        <div className="lg:hidden flex items-center gap-1.5 overflow-x-auto scrollbar-none px-3.5 py-2 bg-[#090d17] border-t border-white/[0.06] text-xs">
          <button
            onClick={() => setActiveTab('overview')}
            className={`h-9 px-3.5 rounded-xl font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all active:scale-95 border ${
              activeTab === 'overview'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35 font-semibold shadow-sm'
                : 'bg-[#111726]/60 border-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5 shrink-0" />
            <span>Visão Geral</span>
          </button>

          <button
            onClick={() => setActiveTab('notinhas')}
            className={`h-9 px-3.5 rounded-xl font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all active:scale-95 border ${
              activeTab === 'notinhas'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/35 font-semibold shadow-sm'
                : 'bg-[#111726]/60 border-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>Notinhas</span>
            {pendingNotinhasCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-amber-500/25 text-amber-300 border border-amber-500/40 font-bold leading-none">
                {pendingNotinhasCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('forecast')}
            className={`h-9 px-3.5 rounded-xl font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all active:scale-95 border ${
              activeTab === 'forecast'
                ? 'bg-teal-500/20 text-teal-300 border-teal-500/35 font-semibold shadow-sm'
                : 'bg-[#111726]/60 border-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5 shrink-0" />
            <span>Previsão</span>
          </button>

          <button
            onClick={() => setActiveTab('debts')}
            className={`h-9 px-3.5 rounded-xl font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all active:scale-95 border ${
              activeTab === 'debts'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/35 font-semibold shadow-sm'
                : 'bg-[#111726]/60 border-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            <HandCoins className="h-3.5 w-3.5 shrink-0" />
            <span>Dívidas</span>
          </button>

          <button
            onClick={() => setActiveTab('poker')}
            className={`h-9 px-3.5 rounded-xl font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all active:scale-95 border ${
              activeTab === 'poker'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/35 font-semibold shadow-sm'
                : 'bg-[#111726]/60 border-white/[0.06] text-slate-400 hover:text-white'
            }`}
          >
            <Spade className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            <span>Poker</span>
          </button>
        </div>
      </header>

      {/* Main Content Area (otimizado com padding respirável em celulares) */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 flex-1 w-full">
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

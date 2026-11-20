'use client'

import React, { useState, useMemo } from 'react'
import {
  Wallet,
  PlusCircle,
  CreditCard,
  QrCode,
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
  ChevronLeft,
  ChevronRight,
  RotateCcw,
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
import { ProfileModal } from '@/components/dashboard/profile-modal'
import { BillingCycleInfo, addMonthsToCycle, getCycleForDate } from '@/lib/billing'
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
      avatarUrl?: string | null
    }
  }
}

export function DashboardShell({ initialData }: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [cycleOffset, setCycleOffset] = useState<number>(0)
  const [isNewTxOpen, setIsNewTxOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isPayInvoiceOpen, setIsPayInvoiceOpen] = useState(false)
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null)
  const [selectedDebt, setSelectedDebt] = useState<InformalDebt | null>(null)
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false)
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const {
    checkingBalance,
    billingCycle,
    informalDebts,
    allReceivables,
    allForecastItems,
    transactions,
    categories,
    pokerEntries = [],
    currentUser,
  } = initialData

  // Ciclo atualmente selecionado pelo usuário (0 = vigente, -1 = anterior, +1 = próximo...)
  const activeCycle = useMemo(() => {
    if (cycleOffset === 0) return billingCycle
    return addMonthsToCycle(billingCycle.cycleId, cycleOffset)
  }, [billingCycle, cycleOffset])

  // Transações pertencentes ao ciclo selecionado
  const activeCycleTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const txCycle = tx.billing_cycle || getCycleForDate(tx.date)
      return txCycle === activeCycle.cycleId
    })
  }, [transactions, activeCycle.cycleId])

  // Cálculo dinâmico da Fatura de Crédito do ciclo selecionado
  const activeCreditInvoice = useMemo(() => {
    const creditExpenses = activeCycleTransactions.filter(
      (tx) => tx.type === 'expense' && tx.payment_method === 'credit'
    )
    let ownExpense = 0
    let thirdPartyExpense = 0

    for (const tx of creditExpenses) {
      const totalAmount = Number(tx.amount)
      if (tx.is_third_party) {
        const tpAmount =
          tx.third_party_amount !== null && tx.third_party_amount !== undefined
            ? Number(tx.third_party_amount)
            : totalAmount
        thirdPartyExpense += tpAmount
        ownExpense += Math.max(0, totalAmount - tpAmount)
      } else {
        ownExpense += totalAmount
      }
    }

    return {
      total: ownExpense + thirdPartyExpense,
      ownExpense,
      thirdPartyExpense,
    }
  }, [activeCycleTransactions])

  // Notinhas pendentes do ciclo selecionado
  const activeReceivables = useMemo(() => {
    const pendingInCycle = allReceivables.filter(
      (r) =>
        r.status === 'pending' &&
        (!r.billing_cycle || r.billing_cycle === activeCycle.cycleId)
    )
    const totalPending = pendingInCycle.reduce((acc, curr) => acc + Number(curr.amount), 0)
    return {
      totalPending,
      items: pendingInCycle,
    }
  }, [allReceivables, activeCycle.cycleId])

  const pendingNotinhasCount = allReceivables.filter((r) => r.status === 'pending').length
  const currentCreditTransactions = activeCycleTransactions.filter(
    (t) => t.payment_method === 'credit'
  )

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
            {/* Seletor Interativo de Ciclo / Mês (h-9 uniforme) */}
            <div className="hidden md:inline-flex items-center gap-1 text-xs text-slate-300 bg-[#111726]/90 border border-white/[0.08] px-1.5 h-9 rounded-xl font-mono whitespace-nowrap shrink-0">
              <button
                type="button"
                onClick={() => setCycleOffset((prev) => prev - 1)}
                className="h-6 w-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Ciclo / Mês Anterior"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              <div className="flex items-center gap-1.5 px-1.5">
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    cycleOffset === 0 ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="hidden 2xl:inline">{activeCycle.label}</span>
                <span className="2xl:hidden">
                  Fatura 04/{activeCycle.cycleId.split('-')[1]}/{activeCycle.cycleId.split('-')[0].slice(2)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setCycleOffset((prev) => prev + 1)}
                className="h-6 w-6 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Próximo Ciclo / Mês"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              {cycleOffset !== 0 && (
                <button
                  type="button"
                  onClick={() => setCycleOffset(0)}
                  className="h-6 px-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-sans font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  title="Voltar para a Fatura Atual"
                >
                  <RotateCcw className="h-2.5 w-2.5" />
                  <span>Atual</span>
                </button>
              )}
            </div>

            {/* Botão Novo Lançamento (h-9 uniforme com os demais botões) */}
            <button
              type="button"
              onClick={() => {
                setEditingTransaction(null)
                setIsNewTxOpen(true)
              }}
              className="h-9 px-3 sm:px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 transition-all active:scale-[0.98] cursor-pointer"
            >
              <PlusCircle className="h-4 w-4 text-black shrink-0" />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
            </button>

            {/* Usuário Conectado & Logout (alinhado rigorosamente a h-9) */}
            {currentUser && (
              <div className="flex items-center gap-1.5 sm:gap-2 pl-2 sm:pl-2.5 border-l border-white/10 shrink-0 h-9">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-1.5 sm:gap-2 hover:opacity-85 transition-opacity cursor-pointer group text-left"
                  title="Configurar Perfil (Nome, Foto, Senha)"
                >
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-xs flex items-center justify-center shrink-0 uppercase select-none shadow-sm overflow-hidden group-hover:border-emerald-400/60 transition-colors">
                    {currentUser.avatarUrl ? (
                      <img
                        src={currentUser.avatarUrl}
                        alt={currentUser.fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      currentUser.fullName.charAt(0) || currentUser.email.charAt(0)
                    )}
                  </div>
                  <div className="hidden xl:block text-left text-xs max-w-[120px] truncate leading-tight select-none">
                    <span className="font-semibold text-white truncate block group-hover:text-emerald-300 transition-colors">
                      {currentUser.fullName}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {currentUser.email}
                    </span>
                  </div>
                </button>
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
      </header>

      {/* Main Content Area (pb-24 no mobile para dar espaço à Bottom Navigation Bar estilo app de banco) */}
      <main className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6 pb-24 lg:pb-8 space-y-4 sm:space-y-6 flex-1 w-full">
        {/* Seletor de Ciclo Mobile (Compacto, elegante, sem banners invasivos) */}
        <div className="md:hidden flex items-center justify-between gap-2 px-1">
          <div className="inline-flex items-center gap-1 bg-[#111726]/90 border border-white/[0.08] px-2 h-9 rounded-xl font-mono text-xs shrink-0">
            <button
              type="button"
              onClick={() => setCycleOffset((prev) => prev - 1)}
              className="h-7 w-7 rounded-lg active:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Ciclo / Mês Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5 px-1.5">
              <span
                className={`h-2 w-2 rounded-full shrink-0 ${
                  cycleOffset === 0 ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="font-semibold text-white whitespace-nowrap">
                Fatura 04/{activeCycle.cycleId.split('-')[1]}/{activeCycle.cycleId.split('-')[0].slice(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCycleOffset((prev) => prev + 1)}
              className="h-7 w-7 rounded-lg active:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
              title="Próximo Ciclo / Mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {cycleOffset !== 0 && (
              <button
                type="button"
                onClick={() => setCycleOffset(0)}
                className="h-6 px-1.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-sans font-bold ml-0.5"
                title="Voltar ao ciclo atual"
              >
                Atual
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap shrink-0">
            {cycleOffset === 0
              ? `Fecha em ${activeCycle.daysUntilClosing} dias`
              : cycleOffset < 0
              ? 'Ciclo Anterior'
              : 'Projetada'}
          </div>
        </div>

        {/* CONTEÚDO CONDICIONAL POR ABA */}
        {activeTab === 'overview' && (
          <>
            {/* 1. Cards do Topo (Os KPIs essenciais) */}
            <HeaderStats
              checkingBalance={checkingBalance}
              billingCycle={activeCycle}
              creditInvoice={activeCreditInvoice}
              informalDebts={informalDebts}
              receivables={activeReceivables}
              onOpenPayInvoice={() => setIsPayInvoiceOpen(true)}
              onOpenNewTransaction={() => {
                setEditingTransaction(null)
                setIsNewTxOpen(true)
              }}
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
                  transactions={activeCycleTransactions}
                  categories={categories}
                  cycleLabel={activeCycle.label}
                  cycleId={activeCycle.cycleId}
                  onOpenConciliateCsv={() => setIsCsvModalOpen(true)}
                  onOpenExportPdf={() => setIsPdfModalOpen(true)}
                  onEditTransaction={(tx) => {
                    setEditingTransaction(tx)
                    setIsNewTxOpen(true)
                  }}
                />
              </div>

              {/* Gráfico / Resumo Visual de Gastos (Ocupa 1 coluna) */}
              <div className="lg:col-span-1">
                <CategoryChart
                  transactions={activeCycleTransactions}
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
            currentCycleId={activeCycle.cycleId}
            currentCycleLabel={activeCycle.label}
          />
        )}

        {/* ABA: PREVISÃO & SIMULADOR DO PRÓXIMO CICLO (ETAPA 5) */}
        {activeTab === 'forecast' && (
          <ForecastSimulator
            checkingBalance={checkingBalance}
            billingCycle={activeCycle}
            forecastItems={allForecastItems}
            informalDebts={informalDebts.items}
            allReceivables={allReceivables}
            creditInvoiceTotal={activeCreditInvoice.total}
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

      {/* BARRA DE NAVEGAÇÃO INFERIOR FIXA NO CELULAR (ESTILO APP DE BANCO) */}
      <nav
        aria-label="Navegação Mobile"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0f19]/95 backdrop-blur-xl border-t border-white/[0.08] px-2 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
      >
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'overview'
                ? 'bg-emerald-500/15 text-emerald-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 mb-0.5 shrink-0" />
            <span className="text-[10px] leading-tight whitespace-nowrap">Início</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('notinhas')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'notinhas'
                ? 'bg-amber-500/15 text-amber-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="h-4 w-4 mb-0.5 shrink-0" />
            <span className="text-[10px] leading-tight whitespace-nowrap">Notinhas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('forecast')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'forecast'
                ? 'bg-teal-500/15 text-teal-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-4 w-4 mb-0.5 shrink-0" />
            <span className="text-[10px] leading-tight whitespace-nowrap">Previsão</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('debts')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'debts'
                ? 'bg-cyan-500/15 text-cyan-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HandCoins className="h-4 w-4 mb-0.5 shrink-0" />
            <span className="text-[10px] leading-tight whitespace-nowrap">Dívidas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('poker')}
            className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all active:scale-95 ${
              activeTab === 'poker'
                ? 'bg-emerald-500/20 text-emerald-300 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Spade className="h-4 w-4 mb-0.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] leading-tight whitespace-nowrap">Poker</span>
          </button>
        </div>
      </nav>

      {/* Modals Globais */}
      <NewTransactionModal
        key={editingTransaction?.id || (isNewTxOpen ? `new-tx-${activeCycle.cycleId}` : 'closed-tx')}
        isOpen={isNewTxOpen}
        onClose={() => {
          setIsNewTxOpen(false)
          setEditingTransaction(null)
        }}
        categories={categories}
        editingTransaction={editingTransaction}
        currentCycleId={activeCycle.cycleId}
        currentCycleLabel={activeCycle.label}
      />

      <PayInvoiceModal
        isOpen={isPayInvoiceOpen}
        onClose={() => setIsPayInvoiceOpen(false)}
        cycleId={activeCycle.cycleId}
        cycleLabel={activeCycle.label}
        checkingBalance={checkingBalance}
        invoiceTotal={activeCreditInvoice.total}
        ownExpense={activeCreditInvoice.ownExpense}
        thirdPartyExpense={activeCreditInvoice.thirdPartyExpense}
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
        currentCycleId={activeCycle.cycleId}
        currentCycleLabel={activeCycle.label}
      />

      {/* Etapa 6: Exportação de Fatura em PDF */}
      <ExportPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        cycle={activeCycle}
        creditTransactions={currentCreditTransactions}
        totals={{
          general: activeCreditInvoice.total,
          ownExpense: activeCreditInvoice.ownExpense,
          thirdParty: activeCreditInvoice.thirdPartyExpense,
        }}
      />
      {/* Modal de Personalização de Perfil */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
      />
    </div>
  )
}

'use client'

import React, { useState, useMemo, useTransition } from 'react'
import {
  Search,
  Edit2,
  Trash2,
  Users,
  QrCode,
  CreditCard,
  Banknote,
  Calendar,
  Layers,
  Utensils,
  Gamepad2,
  Tv,
  Receipt,
  Spade,
  HeartPulse,
  Shirt,
  Crosshair,
  Sparkles,
  Car,
  HandCoins,
  Gift,
  MoreHorizontal,
  Briefcase,
  TrendingUp,
  Laptop,
  Tag,
  FileSpreadsheet,
  FileDown,
  RefreshCw,
  LayoutList,
  FolderKanban,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { Transaction, Category } from '@/types/finance'
import {
  deleteTransactionAction,
  replicateRecurringSubscriptionsAction,
} from '@/actions/finance'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Utensils,
  Gamepad2,
  Tv,
  Receipt,
  Spade,
  HeartPulse,
  Shirt,
  Crosshair,
  Sparkles,
  Car,
  HandCoins,
  Gift,
  Users,
  MoreHorizontal,
  Briefcase,
  TrendingUp,
  Laptop,
}

interface TransactionListProps {
  transactions: Transaction[]
  categories: Category[]
  cycleLabel: string
  cycleId?: string
  onOpenConciliateCsv?: () => void
  onOpenExportPdf?: () => void
  onEditTransaction?: (tx: Transaction) => void
}

type FilterMethod = 'all' | 'pix_cash' | 'credit'
type QuickFilterType = 'all' | 'own' | 'third_party' | 'recurring' | 'installment'
type ViewMode = 'list' | 'category'
type SortOption = 'date_desc' | 'amount_desc' | 'amount_asc'

export function TransactionList({
  transactions,
  categories,
  cycleLabel,
  cycleId,
  onOpenConciliateCsv,
  onOpenExportPdf,
  onEditTransaction,
}: TransactionListProps) {
  const [filterMethod, setFilterMethod] = useState<FilterMethod>('all')
  const [quickFilter, setQuickFilter] = useState<QuickFilterType>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortBy, setSortBy] = useState<SortOption>('date_desc')
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})

  // Estado para replicação de assinaturas
  const [isPendingReplication, startReplicationTransition] = useTransition()
  const [replicationFeedback, setReplicationFeedback] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Mapa de categorias por nome para pegar cor e ícone
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((cat) => map.set(cat.name, cat))
    return map
  }, [categories])

  // Contagens para os Filtros Rápidos
  const filterCounts = useMemo(() => {
    let ownCount = 0
    let tpCount = 0
    let recurringCount = 0
    let installmentCount = 0

    transactions.forEach((tx) => {
      if (tx.is_third_party) {
        tpCount++
        // Se for compartilhado, também conta como gasto próprio parcial
        if (tx.third_party_amount && Number(tx.third_party_amount) < Number(tx.amount)) {
          ownCount++
        }
      } else {
        ownCount++
      }

      if (tx.is_recurring) {
        recurringCount++
      }

      if (tx.installment_total > 1) {
        installmentCount++
      }
    })

    return {
      all: transactions.length,
      own: ownCount,
      third_party: tpCount,
      recurring: recurringCount,
      installment: installmentCount,
    }
  }, [transactions])

  // Filtragem e Ordenação
  const processedTransactions = useMemo(() => {
    // 1. Filtrar
    const filtered = transactions.filter((tx) => {
      // Método de pagamento
      if (filterMethod === 'pix_cash') {
        if (tx.payment_method !== 'pix' && tx.payment_method !== 'cash') return false
      } else if (filterMethod === 'credit') {
        if (tx.payment_method !== 'credit') return false
      }

      // Filtro rápido de tipo
      if (quickFilter === 'own') {
        if (tx.is_third_party && (!tx.third_party_amount || Number(tx.third_party_amount) >= Number(tx.amount))) {
          return false
        }
      } else if (quickFilter === 'third_party') {
        if (!tx.is_third_party) return false
      } else if (quickFilter === 'recurring') {
        if (!tx.is_recurring) return false
      } else if (quickFilter === 'installment') {
        if (tx.installment_total <= 1) return false
      }

      // Busca por texto
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchesDesc = tx.description.toLowerCase().includes(query)
        const matchesCat = tx.category.toLowerCase().includes(query)
        const matchesDebtor = tx.debtor_name?.toLowerCase().includes(query)
        return matchesDesc || matchesCat || matchesDebtor
      }

      return true
    })

    // 2. Ordenar
    return [...filtered].sort((a, b) => {
      if (sortBy === 'amount_desc') {
        return Number(b.amount) - Number(a.amount)
      }
      if (sortBy === 'amount_asc') {
        return Number(a.amount) - Number(b.amount)
      }
      // date_desc (padrão)
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [transactions, filterMethod, quickFilter, searchTerm, sortBy])

  // Agrupamento por Categoria (quando viewMode === 'category')
  const categoryGroups = useMemo(() => {
    if (viewMode !== 'category') return []

    const map = new Map<string, Transaction[]>()
    processedTransactions.forEach((tx) => {
      const cat = tx.category || 'Outros'
      const list = map.get(cat) || []
      list.push(tx)
      map.set(cat, list)
    })

    const totalCycleSum = processedTransactions.reduce((acc, t) => acc + Number(t.amount), 0)

    const groups = Array.from(map.entries()).map(([catName, items]) => {
      const subtotal = items.reduce((acc, t) => acc + Number(t.amount), 0)
      const percent = totalCycleSum > 0 ? (subtotal / totalCycleSum) * 100 : 0
      return {
        catName,
        items,
        subtotal,
        percent,
      }
    })

    // Ordenar grupos pelo maior subtotal
    return groups.sort((a, b) => b.subtotal - a.subtotal)
  }, [processedTransactions, viewMode])

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) return
    setDeletingId(id)
    try {
      await deleteTransactionAction(id)
    } finally {
      setDeletingId(null)
    }
  }

  const handleReplicateSubscriptions = () => {
    if (!cycleId) return
    setReplicationFeedback(null)
    startReplicationTransition(async () => {
      try {
        const res = await replicateRecurringSubscriptionsAction(cycleId)
        if (res.count > 0) {
          setReplicationFeedback({
            type: 'success',
            message: `${res.count} assinatura(s) lançada(s) com sucesso para o ciclo!`,
          })
        } else {
          setReplicationFeedback({
            type: 'info',
            message: res.message || 'Todas as assinaturas cadastradas já estão neste ciclo.',
          })
        }
      } catch (err: unknown) {
        setReplicationFeedback({
          type: 'error',
          message: err instanceof Error ? err.message : 'Erro ao replicar assinaturas.',
        })
      }
    })
  }

  const toggleCategoryCollapse = (catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }))
  }

  // Renderizador de um único card de transação
  const renderTransactionCard = (tx: Transaction) => {
    const catInfo = categoryMap.get(tx.category)
    const IconComp = catInfo?.icon && iconMap[catInfo.icon] ? iconMap[catInfo.icon] : Tag
    const catColor = catInfo?.color || '#10b981'
    const isIncome = tx.type === 'income'
    const isCredit = tx.payment_method === 'credit'

    // Limpeza da descrição: se já tiver sufixo (X/Y) na string e tiver badge de parcela, evita duplicar
    const displayTitle =
      tx.installment_total > 1
        ? tx.description.replace(/\s*\(\d+\/\d+\)$/, '').trim()
        : tx.description

    return (
      <div
        key={tx.id}
        className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors group"
      >
        {/* Ícone & Descrição */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{
              backgroundColor: `${catColor}20`,
              color: catColor,
              border: `1px solid ${catColor}35`,
            }}
          >
            <IconComp className="h-4 w-4" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <span className="font-semibold text-sm text-white truncate max-w-[190px] sm:max-w-[280px]">
                {displayTitle}
              </span>

              {tx.is_third_party && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium shrink-0"
                  title={
                    tx.third_party_amount && Number(tx.third_party_amount) < Number(tx.amount)
                      ? `Notinha ${tx.debtor_name}: ${formatCurrency(Number(tx.third_party_amount))} | Gasto Próprio: ${formatCurrency(Number(tx.amount) - Number(tx.third_party_amount))}`
                      : `100% Notinha de ${tx.debtor_name || 'Terceiro'}`
                  }
                >
                  <Users className="h-2.5 w-2.5 text-amber-400" />
                  {tx.third_party_amount && Number(tx.third_party_amount) < Number(tx.amount) ? (
                    <span>
                      {tx.debtor_name || 'Notinha'}: {formatCurrency(Number(tx.third_party_amount))}
                      <span className="text-slate-400 font-normal ml-1 hidden sm:inline">
                        (Meu: {formatCurrency(Number(tx.amount) - Number(tx.third_party_amount))})
                      </span>
                    </span>
                  ) : (
                    <span>{tx.debtor_name || 'Notinha'}</span>
                  )}
                </span>
              )}

              {tx.is_recurring && (
                <span
                  className={cn(
                    'inline-flex items-center gap-1 text-[10px] border px-1.5 py-0.5 rounded-md font-medium shrink-0',
                    tx.type === 'income'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      : 'bg-sky-500/10 text-sky-300 border-sky-500/20'
                  )}
                >
                  <RefreshCw className="h-2.5 w-2.5" />
                  {tx.type === 'income' ? 'Recorrente' : 'Assinatura'}
                </span>
              )}

              {tx.installment_total > 1 && (
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0 border',
                    tx.installment_current === tx.installment_total
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-semibold'
                      : 'bg-white/[0.05] text-slate-400 border-white/[0.06]'
                  )}
                  title={
                    tx.installment_current === tx.installment_total
                      ? 'Última parcela! Fatura mais leve no próximo ciclo.'
                      : `Parcela ${tx.installment_current} de ${tx.installment_total}`
                  }
                >
                  {tx.installment_current}/{tx.installment_total}
                  {tx.installment_current === tx.installment_total && ' • Última!'}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(tx.date)}
              </span>
              <span>•</span>
              <span className="truncate max-w-[100px]">{tx.category}</span>
              <span>•</span>
              <span
                className={`inline-flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.2 rounded ${
                  isCredit
                    ? 'text-violet-300 bg-violet-500/10'
                    : tx.payment_method === 'pix'
                    ? 'text-emerald-300 bg-emerald-500/10'
                    : 'text-amber-300 bg-amber-500/10'
                }`}
              >
                {isCredit && <CreditCard className="h-2.5 w-2.5" />}
                {tx.payment_method === 'pix' && <QrCode className="h-2.5 w-2.5" />}
                {tx.payment_method === 'cash' && <Banknote className="h-2.5 w-2.5" />}
                {tx.payment_method.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Valor & Ações */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div
              className={`text-sm sm:text-base font-bold font-mono ${
                isIncome ? 'text-emerald-400' : 'text-slate-100'
              }`}
            >
              {isIncome ? '+ ' : '- '}
              {formatCurrency(Number(tx.amount))}
            </div>
            <span className="text-[10px] text-slate-500 block">
              {isCredit ? 'Fatura' : 'Conta'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onEditTransaction && (
              <button
                onClick={() => onEditTransaction(tx)}
                className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer shrink-0"
                title="Editar lançamento"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            )}

            <button
              onClick={() => handleDelete(tx.id)}
              disabled={deletingId === tx.id}
              className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 p-2 sm:p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
              title="Excluir lançamento"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <Card className="border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-xl">
      <CardHeader className="p-4 sm:p-5 pb-3 space-y-3">
        {/* Cabeçalho Principal: Título + Ações Gerais */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
              <Layers className="h-4 w-4 text-emerald-400" />
              Movimentações do Ciclo Atual
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {cycleLabel} • {processedTransactions.length} de {transactions.length} lançamentos
            </CardDescription>
          </div>

          {/* Botões de Ações Rápidas (Replicar Assinaturas, CSV, PDF) */}
          <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
            {cycleId && (
              <Button
                size="sm"
                variant="outline"
                disabled={isPendingReplication}
                onClick={handleReplicateSubscriptions}
                className="text-xs h-8 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center gap-1.5 shrink-0 transition-colors"
                title="Lançar assinaturas recorrentes ativas para este ciclo"
              >
                {isPendingReplication ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 text-slate-400" />
                )}
                <span>Lançar Assinaturas</span>
              </Button>
            )}

            {onOpenConciliateCsv && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenConciliateCsv}
                className="text-xs h-8 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center gap-1 shrink-0 transition-colors"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Conciliar CSV</span>
                <span className="sm:hidden">CSV</span>
              </Button>
            )}

            {onOpenExportPdf && (
              <Button
                size="sm"
                variant="outline"
                onClick={onOpenExportPdf}
                className="text-xs h-8 border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center gap-1 shrink-0 transition-colors"
              >
                <FileDown className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline">Exportar PDF</span>
                <span className="sm:hidden">PDF</span>
              </Button>
            )}
          </div>
        </div>

        {/* Feedback de Assinaturas */}
        {replicationFeedback && (
          <div
            className={cn(
              'p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all',
              replicationFeedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : replicationFeedback.type === 'info'
                ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            )}
          >
            <div className="flex items-center gap-2">
              {replicationFeedback.type === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              {replicationFeedback.type === 'info' && <RefreshCw className="h-4 w-4 shrink-0" />}
              {replicationFeedback.type === 'error' && <AlertCircle className="h-4 w-4 shrink-0" />}
              <span>{replicationFeedback.message}</span>
            </div>
            <button
              onClick={() => setReplicationFeedback(null)}
              className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/[0.05]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Barra de Filtros Rápidos (Pill Bar Mobile-First com Scroll Suave e Cores Unificadas) */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 -mx-1 px-1 shrink-0">
          <button
            onClick={() => setQuickFilter('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border',
              quickFilter === 'all'
                ? 'bg-white/[0.12] text-white border-white/[0.2] font-semibold shadow-sm'
                : 'bg-[#111726]/80 text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <span>Todas</span>
            <span className="text-[10px] bg-white/[0.08] px-1.5 py-0.2 rounded font-mono text-slate-300">
              {filterCounts.all}
            </span>
          </button>

          <button
            onClick={() => setQuickFilter('own')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border',
              quickFilter === 'own'
                ? 'bg-white/[0.12] text-white border-white/[0.2] font-semibold shadow-sm'
                : 'bg-[#111726]/80 text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <span>👤 Só Meus</span>
            <span className="text-[10px] bg-white/[0.08] px-1.5 py-0.2 rounded font-mono text-slate-300">
              {filterCounts.own}
            </span>
          </button>

          <button
            onClick={() => setQuickFilter('third_party')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border',
              quickFilter === 'third_party'
                ? 'bg-white/[0.12] text-white border-white/[0.2] font-semibold shadow-sm'
                : 'bg-[#111726]/80 text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <span>👥 Só Notinhas</span>
            <span className="text-[10px] bg-white/[0.08] px-1.5 py-0.2 rounded font-mono text-slate-300">
              {filterCounts.third_party}
            </span>
          </button>

          <button
            onClick={() => setQuickFilter('recurring')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border',
              quickFilter === 'recurring'
                ? 'bg-white/[0.12] text-white border-white/[0.2] font-semibold shadow-sm'
                : 'bg-[#111726]/80 text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <span>🔄 Assinaturas</span>
            <span className="text-[10px] bg-white/[0.08] px-1.5 py-0.2 rounded font-mono text-slate-300">
              {filterCounts.recurring}
            </span>
          </button>

          <button
            onClick={() => setQuickFilter('installment')}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 border',
              quickFilter === 'installment'
                ? 'bg-white/[0.12] text-white border-white/[0.2] font-semibold shadow-sm'
                : 'bg-[#111726]/80 text-slate-400 border-white/[0.06] hover:text-white hover:bg-white/[0.04]'
            )}
          >
            <span>💳 Parceladas</span>
            <span className="text-[10px] bg-white/[0.08] px-1.5 py-0.2 rounded font-mono text-slate-300">
              {filterCounts.installment}
            </span>
          </button>
        </div>

        {/* Linha de Ferramentas: Busca + Meio de Pagamento + Alternador de Visualização + Ordenação */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 pt-1">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por descrição, categoria ou amigo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#111726]/80 border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none shrink-0">
            {/* Filtro de Meio de Pagamento */}
            <div className="flex items-center gap-1 p-1 bg-[#111726]/80 rounded-xl border border-white/[0.08] shrink-0">
              <button
                onClick={() => setFilterMethod('all')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap',
                  filterMethod === 'all'
                    ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterMethod('pix_cash')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 whitespace-nowrap',
                  filterMethod === 'pix_cash'
                    ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <QrCode className="h-3 w-3" />
                <span>Pix/Dinheiro</span>
              </button>
              <button
                onClick={() => setFilterMethod('credit')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 whitespace-nowrap',
                  filterMethod === 'credit'
                    ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
              >
                <CreditCard className="h-3 w-3" />
                <span>Crédito</span>
              </button>
            </div>

            {/* Alternador de Visualização (Lista vs Por Categoria) */}
            <div className="flex items-center gap-1 p-1 bg-[#111726]/80 rounded-xl border border-white/[0.08] shrink-0">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 whitespace-nowrap',
                  viewMode === 'list'
                    ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
                title="Visualização em Lista Cronológica"
              >
                <LayoutList className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Lista</span>
              </button>

              <button
                onClick={() => setViewMode('category')}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 whitespace-nowrap',
                  viewMode === 'category'
                    ? 'bg-white/[0.12] text-white font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                )}
                title="Visualização Agrupada por Categoria"
              >
                <FolderKanban className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Por Categoria</span>
              </button>
            </div>

            {/* Seletor de Ordenação */}
            <div className="relative shrink-0">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="bg-[#121826] border border-white/[0.08] text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50 cursor-pointer"
                title="Ordenar lançamentos"
              >
                <option value="date_desc">📅 Mais recentes</option>
                <option value="amount_desc">💰 Maior valor</option>
                <option value="amount_asc">📉 Menor valor</option>
              </select>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-0">
        {processedTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-500">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">Nenhuma movimentação encontrada</p>
            <p className="text-xs text-slate-500">
              {searchTerm || quickFilter !== 'all' || filterMethod !== 'all'
                ? 'Tente ajustar ou limpar os filtros de pesquisa.'
                : 'Cadastre sua primeira receita ou despesa usando o botão "+ Novo Lançamento".'}
            </p>
          </div>
        ) : viewMode === 'list' ? (
          // VISUALIZAÇÃO EM LISTA
          <div className="divide-y divide-white/[0.04]">
            {processedTransactions.map((tx) => renderTransactionCard(tx))}
          </div>
        ) : (
          // VISUALIZAÇÃO AGRUPADA POR CATEGORIA
          <div className="space-y-4 pt-1">
            {categoryGroups.map((group) => {
              const catInfo = categoryMap.get(group.catName)
              const IconComp = catInfo?.icon && iconMap[catInfo.icon] ? iconMap[catInfo.icon] : Tag
              const catColor = catInfo?.color || '#10b981'
              const isCollapsed = collapsedCategories[group.catName]

              return (
                <div
                  key={group.catName}
                  className="rounded-2xl border border-white/[0.08] bg-[#0f1422]/70 overflow-hidden"
                >
                  {/* Cabeçalho do Grupo de Categoria */}
                  <div
                    onClick={() => toggleCategoryCollapse(group.catName)}
                    className="p-3 sm:p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors cursor-pointer flex items-center justify-between gap-3 border-b border-white/[0.04]"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${catColor}20`,
                          color: catColor,
                          border: `1px solid ${catColor}35`,
                        }}
                      >
                        <IconComp className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {group.catName}
                          </span>
                          <span className="text-[10px] bg-white/[0.06] text-slate-300 px-1.5 py-0.2 rounded font-mono shrink-0">
                            {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span>{group.percent.toFixed(1)}% do total do ciclo</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm sm:text-base font-bold font-mono text-emerald-400">
                          {formatCurrency(group.subtotal)}
                        </div>
                        <span className="text-[10px] text-slate-500 block">Subtotal</span>
                      </div>
                      <div className="text-slate-400">
                        {isCollapsed ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronUp className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lançamentos da Categoria */}
                  {!isCollapsed && (
                    <div className="divide-y divide-white/[0.04] px-2 sm:px-3 py-1">
                      {group.items.map((tx) => renderTransactionCard(tx))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

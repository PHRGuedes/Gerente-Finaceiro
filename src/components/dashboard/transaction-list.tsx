'use client'

import React, { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  Trash2,
  Users,
  QrCode,
  CreditCard,
  Banknote,
  ArrowUpRight,
  ArrowDownLeft,
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
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Transaction, Category } from '@/types/finance'
import { deleteTransactionAction } from '@/actions/finance'

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
  onOpenConciliateCsv?: () => void
  onOpenExportPdf?: () => void
}

type FilterMethod = 'all' | 'pix_cash' | 'credit'

export function TransactionList({
  transactions,
  categories,
  cycleLabel,
  onOpenConciliateCsv,
  onOpenExportPdf,
}: TransactionListProps) {
  const [filterMethod, setFilterMethod] = useState<FilterMethod>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Mapa de categorias por nome para pegar cor e ícone
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((cat) => map.set(cat.name, cat))
    return map
  }, [categories])

  // Filtragem das transações
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Filtro por método de pagamento
      if (filterMethod === 'pix_cash') {
        if (tx.payment_method !== 'pix' && tx.payment_method !== 'cash') return false
      } else if (filterMethod === 'credit') {
        if (tx.payment_method !== 'credit') return false
      }

      // Filtro por busca
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchesDesc = tx.description.toLowerCase().includes(query)
        const matchesCat = tx.category.toLowerCase().includes(query)
        const matchesDebtor = tx.debtor_name?.toLowerCase().includes(query)
        return matchesDesc || matchesCat || matchesDebtor
      }

      return true
    })
  }, [transactions, filterMethod, searchTerm])

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este lançamento?')) return
    setDeletingId(id)
    try {
      await deleteTransactionAction(id)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card className="border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-xl">
      <CardHeader className="p-5 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Layers className="h-4 w-4 text-emerald-400" />
              Movimentações do Ciclo Atual
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              {cycleLabel} • {filteredTransactions.length} lançamentos encontrados
            </CardDescription>
          </div>

          {/* Filtros de Meio de Pagamento */}
          <div className="flex items-center gap-1.5 p-1 bg-[#121826] rounded-xl border border-white/[0.08] self-start sm:self-auto">
            <button
              onClick={() => setFilterMethod('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterMethod === 'all'
                  ? 'bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setFilterMethod('pix_cash')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                filterMethod === 'pix_cash'
                  ? 'bg-emerald-500 text-black font-semibold shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="h-3 w-3" />
              Pix / Dinheiro
            </button>
            <button
              onClick={() => setFilterMethod('credit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                filterMethod === 'credit'
                  ? 'bg-violet-500 text-white font-semibold shadow-md shadow-violet-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CreditCard className="h-3 w-3" />
              Crédito
            </button>
          </div>
        </div>

        {/* Campo de Busca Rápida + Ações Fatura */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3">
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

          {(onOpenConciliateCsv || onOpenExportPdf) && (
            <div className="flex items-center gap-1.5 shrink-0">
              {onOpenConciliateCsv && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenConciliateCsv}
                  className="text-xs h-8 border-violet-500/30 text-violet-300 hover:bg-violet-500/20 flex items-center gap-1"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-violet-400" />
                  <span className="hidden sm:inline">Conciliar CSV</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              )}
              {onOpenExportPdf && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onOpenExportPdf}
                  className="text-xs h-8 border-violet-500/30 text-violet-300 hover:bg-violet-500/20 flex items-center gap-1"
                >
                  <FileDown className="h-3.5 w-3.5 text-violet-400" />
                  <span className="hidden sm:inline">Exportar PDF</span>
                  <span className="sm:hidden">PDF</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        {filteredTransactions.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-500">
              <Receipt className="h-6 w-6" />
            </div>
            <p className="text-sm font-medium text-slate-300">Nenhuma movimentação encontrada</p>
            <p className="text-xs text-slate-500">
              {searchTerm
                ? 'Tente ajustar os termos da sua pesquisa.'
                : 'Cadastre sua primeira receita ou despesa usando o botão "+ Novo Lançamento".'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filteredTransactions.map((tx) => {
              const catInfo = categoryMap.get(tx.category)
              const IconComp = catInfo?.icon && iconMap[catInfo.icon] ? iconMap[catInfo.icon] : Tag
              const catColor = catInfo?.color || '#10b981'
              const isIncome = tx.type === 'income'
              const isCredit = tx.payment_method === 'credit'

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
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white truncate max-w-[200px] sm:max-w-[280px]">
                          {tx.description}
                        </span>

                        {tx.is_third_party && (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-md font-medium shrink-0">
                            <Users className="h-2.5 w-2.5" />
                            {tx.debtor_name || 'Notinha'}
                          </span>
                        )}

                        {tx.installment_total > 1 && (
                          <span className="text-[10px] bg-white/[0.05] text-slate-400 px-1.5 py-0.5 rounded font-mono shrink-0">
                            {tx.installment_current}/{tx.installment_total}
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

                    <button
                      onClick={() => handleDelete(tx.id)}
                      disabled={deletingId === tx.id}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                      title="Excluir lançamento"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

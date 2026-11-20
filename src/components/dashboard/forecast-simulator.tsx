'use client'

import React, { useState, useMemo } from 'react'
import {
  TrendingUp,
  PlusCircle,
  Calendar,
  Layers,
  Users,
  HandCoins,
  CreditCard,
  Wallet,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  HelpCircle,
  Clock,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { ForecastItem, InformalDebt, Receivable } from '@/types/finance'
import { BillingCycleInfo, addMonthsToCycle } from '@/lib/billing'
import {
  createForecastItemAction,
  updateForecastItemAction,
  deleteForecastItemAction,
} from '@/actions/finance'

interface ForecastSimulatorProps {
  checkingBalance: number
  billingCycle: BillingCycleInfo
  forecastItems: ForecastItem[]
  informalDebts: InformalDebt[]
  allReceivables: Receivable[]
  creditInvoiceTotal: number
}

export function ForecastSimulator({
  checkingBalance,
  billingCycle,
  forecastItems,
  informalDebts,
  allReceivables,
  creditInvoiceTotal,
}: ForecastSimulatorProps) {
  // Ciclo selecionado para a projeção: Ciclo Vigente ou Próximo Ciclo (+1)
  const [selectedCycleOffset, setSelectedCycleOffset] = useState<number>(1) // Padrão: Próximo Mês (+1)
  const [isNewIncomeOpen, setIsNewIncomeOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editAmount, setEditAmount] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newIsVariable, setNewIsVariable] = useState(false)
  const [newCategory, setNewCategory] = useState('Salário')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Informações do ciclo projetado
  const projectedCycle = useMemo(() => {
    return addMonthsToCycle(billingCycle.cycleId, selectedCycleOffset)
  }, [billingCycle.cycleId, selectedCycleOffset])

  // 1. Receitas Previstas (forecast_items com type = 'income')
  const incomeItems = useMemo(() => {
    return forecastItems.filter((item) => item.type === 'income')
  }, [forecastItems])

  const totalForecastIncomes = useMemo(() => {
    return incomeItems
      .filter((item) => item.active)
      .reduce((acc, curr) => acc + Number(curr.amount), 0)
  }, [incomeItems])

  // 2. Notinhas a Receber pendentes que caem no ciclo projetado
  const projectedReceivables = useMemo(() => {
    return allReceivables.filter(
      (r) =>
        r.status === 'pending' &&
        (!r.billing_cycle || r.billing_cycle === projectedCycle.cycleId)
    )
  }, [allReceivables, projectedCycle.cycleId])

  const totalProjectedReceivables = useMemo(() => {
    return projectedReceivables.reduce((acc, curr) => acc + Number(curr.amount), 0)
  }, [projectedReceivables])

  // Soma Total de Entradas Previstas
  const totalEntradasPrevistas = totalForecastIncomes + totalProjectedReceivables

  // 4. Fatura de Crédito no Ciclo
  const totalFaturaCredito = creditInvoiceTotal

  // Total de Saídas Previstas = Fatura em Formação
  const totalSaidasPrevistas = totalFaturaCredito

  // 5. Total de Dívidas Restantes (Geral e Próximos 30 Dias)
  const totalDividasRestantes = useMemo(() => {
    return informalDebts.reduce(
      (acc, d) => acc + (Number(d.total_amount) - Number(d.paid_amount)),
      0
    )
  }, [informalDebts])

  // Dívidas ativas que possuem data definida e vencem em até 30 dias (ou já vencidas)
  const dividasProximos30Dias = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const maxDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
    maxDate.setHours(23, 59, 59, 999)

    return informalDebts.filter((d) => {
      const remaining = Number(d.total_amount) - Number(d.paid_amount)
      if (remaining <= 0) return false
      // Deve ter data definida (ignora dívidas sem data)
      if (!d.due_date) return false

      const [year, month, day] = d.due_date.split('-').map(Number)
      if (!year || !month || !day) return false
      const dueDate = new Date(year, month - 1, day)
      dueDate.setHours(12, 0, 0, 0)

      // Apenas dívidas com data até os próximos 30 dias (inclui vencidas)
      return dueDate <= maxDate
    })
  }, [informalDebts])

  const totalDividas30Dias = useMemo(() => {
    return dividasProximos30Dias.reduce(
      (acc, d) => acc + (Number(d.total_amount) - Number(d.paid_amount)),
      0
    )
  }, [dividasProximos30Dias])

  // 6. CÁLCULO DA FÓRMULA EM TEMPO REAL:
  // Saldo Atual + Receitas Previstas - Fatura = Saldo Livre (Antes de quitar dívidas)
  const saldoLivreAntesDividas =
    checkingBalance + totalEntradasPrevistas - totalSaidasPrevistas

  // Saldo Livre Projetado (Após abater apenas dívidas com data nos próximos 30 dias)
  const saldoLivreAposDividas = saldoLivreAntesDividas - totalDividas30Dias

  // Ações de Receitas Previstas
  const handleToggleActive = async (item: ForecastItem) => {
    await updateForecastItemAction(item.id, { active: !item.active })
  }

  const handleStartEdit = (item: ForecastItem) => {
    setEditingItemId(item.id)
    setEditAmount(item.amount.toString())
  }

  const handleSaveEdit = async (id: string) => {
    const parsed = parseFloat(editAmount.replace(',', '.'))
    if (!isNaN(parsed) && parsed >= 0) {
      await updateForecastItemAction(id, { amount: parsed })
    }
    setEditingItemId(null)
  }

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Deseja remover esta receita prevista?')) return
    await deleteForecastItemAction(id)
  }

  const handleCreateIncome = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(newAmount.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0 || !newDesc.trim()) return

    setLoading(true)
    try {
      await createForecastItemAction({
        type: 'income',
        description: newDesc.trim(),
        amount: parsed,
        is_variable: newIsVariable,
        category: newCategory,
      })

      setFeedback(`Receita prevista "${newDesc}" adicionada com sucesso!`)
      setIsNewIncomeOpen(false)
      setNewDesc('')
      setNewAmount('')
      setTimeout(() => setFeedback(null), 4000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Seletor de Ciclo da Projeção - Otimizado e sem banners pesados */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="text-xs text-slate-300">
            Projeção calculada para: <strong className="text-emerald-300 font-mono">{projectedCycle.label}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#111726]/90 rounded-xl border border-white/[0.08] self-start sm:self-auto text-xs overflow-x-auto scrollbar-none shrink-0">
          <button
            onClick={() => setSelectedCycleOffset(0)}
            className={`h-8 px-3 rounded-lg font-medium transition-all whitespace-nowrap shrink-0 ${
              selectedCycleOffset === 0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Ciclo Atual
          </button>
          <button
            onClick={() => setSelectedCycleOffset(1)}
            className={`h-8 px-3 rounded-lg font-medium transition-all whitespace-nowrap shrink-0 ${
              selectedCycleOffset === 1
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Próximo (+1 Mês)
          </button>
          <button
            onClick={() => setSelectedCycleOffset(2)}
            className={`h-8 px-3 rounded-lg font-medium transition-all whitespace-nowrap shrink-0 ${
              selectedCycleOffset === 2
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Em 2 Meses (+2)
          </button>
        </div>
      </div>

      {/* DESTAQUE PRINCIPAL: OS RESULTADOS DO CÁLCULO DA FÓRMULA */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card 1: Saldo Livre Projetado (Antes de Dívidas) */}
        <Card
          className={`relative overflow-hidden border shadow-xl ${
            saldoLivreAntesDividas >= 0
              ? 'border-emerald-500/40 bg-gradient-to-b from-[#0f2419] to-[#08120d]'
              : 'border-rose-500/40 bg-gradient-to-b from-[#240e16] to-[#12080d]'
          }`}
        >
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Saldo Livre Projetado (Antes de Dívidas)
              </span>
              <span className="text-[11px] text-slate-400">
                Saldo Atual + Receitas Previstas - Fatura
              </span>
            </div>
            <Badge variant={saldoLivreAntesDividas >= 0 ? 'success' : 'danger'}>
              {saldoLivreAntesDividas >= 0 ? 'Superávit' : 'Déficit'}
            </Badge>
          </CardHeader>
          <CardContent className="p-5 pt-1 space-y-2">
            <div
              className={`text-3xl font-extrabold font-mono tracking-tight ${
                saldoLivreAntesDividas >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {saldoLivreAntesDividas >= 0 ? '+ ' : ''}
              {formatCurrency(saldoLivreAntesDividas)}
            </div>
            <p className="text-xs text-slate-300">
              Disponível para lazer, reservas ou quitação de empréstimos informais.
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Saldo Livre Projetado (Após Quitar Dívidas Informais com data em até 30 dias) */}
        <Card
          className={`relative overflow-hidden border shadow-xl ${
            saldoLivreAposDividas >= 0
              ? 'border-cyan-500/40 bg-gradient-to-b from-[#0c222e] to-[#06121a]'
              : 'border-amber-500/40 bg-gradient-to-b from-[#241c0e] to-[#120e06]'
          }`}
        >
          <CardHeader className="p-5 pb-2 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-bold text-cyan-300 uppercase tracking-wider block">
                Saldo Líquido Final (Após Quitar Dívidas)
              </span>
              <span className="text-[11px] text-slate-400">
                {totalDividas30Dias > 0
                  ? `Abatendo dívidas com data em até 30 dias (${formatCurrency(totalDividas30Dias)})`
                  : 'Nenhuma dívida com data para os próximos 30 dias'}
              </span>
            </div>
            <Badge variant={saldoLivreAposDividas >= 0 ? 'info' : 'warning'}>
              {saldoLivreAposDividas >= 0 ? 'Sobra Líquida' : 'Atenção ao Saldo'}
            </Badge>
          </CardHeader>
          <CardContent className="p-5 pt-1 space-y-2">
            <div
              className={`text-3xl font-extrabold font-mono tracking-tight ${
                saldoLivreAposDividas >= 0 ? 'text-cyan-300' : 'text-amber-400'
              }`}
            >
              {saldoLivreAposDividas >= 0 ? '+ ' : ''}
              {formatCurrency(saldoLivreAposDividas)}
            </div>
            <p className="text-xs text-slate-300">
              {saldoLivreAposDividas >= 0
                ? totalDividas30Dias > 0
                  ? 'Você pode quitar as dívidas com vencimento nos próximos 30 dias e ainda manter saldo positivo!'
                  : 'Nenhuma dívida com data para os próximos 30 dias. Saldo 100% livre!'
                : 'Recomenda-se amortizar as dívidas dos próximos 30 dias em parcelas menores para não negativar.'}
            </p>
            {totalDividasRestantes > totalDividas30Dias && (
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-slate-400">
                <span>Dívidas sem data ou &gt; 30 dias:</span>
                <span className="font-mono font-semibold text-slate-300">
                  {formatCurrency(totalDividasRestantes - totalDividas30Dias)}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento Passo a Passo da Fórmula */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Saldo Atual */}
        <div className="p-3.5 rounded-xl bg-[#0e1624] border border-white/[0.06] space-y-1">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">1. Saldo em Conta</span>
          <div className="font-bold font-mono text-emerald-400 text-base">{formatCurrency(checkingBalance)}</div>
          <span className="text-[10px] text-slate-500">Pix disponível hoje</span>
        </div>

        {/* (+) Receitas Previstas */}
        <div className="p-3.5 rounded-xl bg-[#0e1624] border border-white/[0.06] space-y-1">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">(+) Receitas Previstas</span>
          <div className="font-bold font-mono text-emerald-400 text-base">{formatCurrency(totalForecastIncomes)}</div>
          <span className="text-[10px] text-slate-500">Salário, Poker, etc.</span>
        </div>

        {/* (+) Notinhas a Receber */}
        <div className="p-3.5 rounded-xl bg-[#0e1624] border border-white/[0.06] space-y-1">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">(+) Notinhas do Mês</span>
          <div className="font-bold font-mono text-amber-400 text-base">{formatCurrency(totalProjectedReceivables)}</div>
          <span className="text-[10px] text-slate-500">{projectedReceivables.length} parcela(s) a receber</span>
        </div>

        {/* (-) Fatura Crédito */}
        <div className="p-3.5 rounded-xl bg-[#0e1624] border border-white/[0.06] space-y-1">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">(-) Fatura Cartão</span>
          <div className="font-bold font-mono text-violet-400 text-base">{formatCurrency(totalFaturaCredito)}</div>
          <span className="text-[10px] text-slate-500">Compras no crédito</span>
        </div>
      </div>

      {/* Grid com a Tabela Editável de Receitas Previstas e Notinhas do Ciclo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* TABELA EDITÁVEL DE RECEITAS PREVISTAS (2 Colunas) */}
        <Card className="lg:col-span-2 border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-xl">
          <CardHeader className="p-5 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  Tabela Editável de Receitas Previstas
                </CardTitle>
                <CardDescription className="text-xs text-slate-400">
                  Salário + Diária, Pensão, Dias fixos de Poker, Comissão variável
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => setIsNewIncomeOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-8 text-xs shadow-md shadow-emerald-500/20 self-start sm:self-auto flex items-center gap-1"
              >
                <PlusCircle className="h-3.5 w-3.5 text-black" />
                <span>Nova Receita</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-5 pt-1">
            <div className="divide-y divide-white/[0.04]">
              {incomeItems.map((item) => {
                const isEditing = editingItemId === item.id
                return (
                  <div
                    key={item.id}
                    className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02] px-2 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Toggle Active */}
                      <button
                        onClick={() => handleToggleActive(item)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title={item.active ? 'Desativar receita' : 'Ativar receita'}
                      >
                        {item.active ? (
                          <ToggleRight className="h-6 w-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="h-6 w-6 text-slate-600" />
                        )}
                      </button>

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold text-xs sm:text-sm truncate ${
                              item.active ? 'text-white' : 'text-slate-500 line-through'
                            }`}
                          >
                            {item.description}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.2 rounded-full font-mono ${
                              item.is_variable
                                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                            }`}
                          >
                            {item.is_variable ? 'Variável' : 'Fixa'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 block">{item.category}</span>
                      </div>
                    </div>

                    {/* Valor e Edição Inline */}
                    <div className="flex items-center gap-2 shrink-0">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveEdit(item.id)
                              if (e.key === 'Escape') setEditingItemId(null)
                            }}
                            className="w-24 bg-[#111726] border border-emerald-500 rounded-lg px-2 py-1 text-xs font-mono text-white text-right"
                          />
                          <Button size="sm" onClick={() => handleSaveEdit(item.id)} className="h-7 px-2 text-xs">
                            OK
                          </Button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleStartEdit(item)}
                          className="flex items-center gap-1 cursor-pointer group-hover:text-emerald-300"
                          title="Clique para editar valor"
                        >
                          <span
                            className={`text-sm sm:text-base font-bold font-mono ${
                              item.active ? 'text-emerald-400' : 'text-slate-600'
                            }`}
                          >
                            {formatCurrency(Number(item.amount))}
                          </span>
                          <Edit2 className="h-3 w-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      )}

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.06] flex justify-between items-center text-xs">
              <span className="text-slate-400">Total de Receitas Previstas Ativas:</span>
              <span className="font-bold font-mono text-emerald-400 text-sm">
                {formatCurrency(totalForecastIncomes)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* NOTINHAS PENDENTES QUE ENTRAM NO CICLO (1 Coluna) */}
        <Card className="border-amber-500/20 bg-[#0c101a]/70 backdrop-blur-xl">
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-400" />
                <CardTitle className="text-base font-bold text-white">Notinhas do Ciclo</CardTitle>
              </div>
              <Badge variant="warning">{projectedReceivables.length} a receber</Badge>
            </div>
            <CardDescription className="text-xs text-slate-400">
              Soma automática das notinhas que vencem em {projectedCycle.cycleId}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 pt-1 space-y-3">
            {projectedReceivables.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Nenhuma notinha pendente prevista para este ciclo.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {projectedReceivables.map((rec) => (
                  <div key={rec.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0 space-y-0.5">
                      <span className="font-semibold text-slate-200 block truncate">{rec.debtor_name}</span>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {rec.description}
                      </span>
                    </div>
                    <span className="font-bold font-mono text-amber-400 shrink-0">
                      {formatCurrency(Number(rec.amount))}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 border-t border-white/[0.06] flex justify-between items-center text-xs">
              <span className="text-slate-400">Soma Automática:</span>
              <span className="font-bold font-mono text-amber-400 text-sm">
                + {formatCurrency(totalProjectedReceivables)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal: Nova Receita Prevista */}
      {isNewIncomeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0e1422] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nova Receita Prevista</h3>
                  <p className="text-xs text-slate-400">Salário, Poker, Diária, Freela</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewIncomeOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateIncome} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Salário + Diária, Dias fixos de Poker..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Valor Estimado por Mês (R$)
                </label>
                <input
                  type="text"
                  required
                  placeholder="0,00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isVariable"
                  checked={newIsVariable}
                  onChange={(e) => setNewIsVariable(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                />
                <label htmlFor="isVariable" className="text-xs text-slate-300 cursor-pointer">
                  Esta receita é variável (ex: Poker, Comissão)?
                </label>
              </div>

              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewIncomeOpen(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold"
                >
                  {loading ? 'Salvando...' : 'Adicionar Receita'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

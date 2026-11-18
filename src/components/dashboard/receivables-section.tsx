'use client'

import React, { useState, useMemo } from 'react'
import {
  Users,
  CheckCircle2,
  Clock,
  QrCode,
  Search,
  PlusCircle,
  Calendar,
  CreditCard,
  Trash2,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Copy,
  MessageCircle,
  CheckCheck,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Receivable } from '@/types/finance'
import {
  markReceivablePaidAction,
  markPersonReceivablesPaidAction,
  deleteReceivableAction,
} from '@/actions/finance'
import { NewReceivableModal } from '@/components/dashboard/new-receivable-modal'

interface ReceivablesSectionProps {
  receivables: Receivable[]
  currentCycleId: string
  currentCycleLabel: string
}

export function ReceivablesSection({
  receivables,
  currentCycleId,
  currentCycleLabel,
}: ReceivablesSectionProps) {
  const [selectedDebtor, setSelectedDebtor] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'pending' | 'paid' | 'all'>('pending')
  const [cycleFilter, setCycleFilter] = useState<'current' | 'all'>('current')
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [batchLoadingDebtor, setBatchLoadingDebtor] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Extrair lista de pessoas únicas
  const debtorsList = useMemo(() => {
    const set = new Set<string>()
    receivables.forEach((r) => set.add(r.debtor_name))
    return Array.from(set).sort()
  }, [receivables])

  // Métricas do Topo da Seção
  const metrics = useMemo(() => {
    const currentCycleReceivables = receivables.filter(
      (r) => !r.billing_cycle || r.billing_cycle === currentCycleId
    )

    const pendingCurrent = currentCycleReceivables
      .filter((r) => r.status === 'pending')
      .reduce((acc, curr) => acc + Number(curr.amount), 0)

    const paidCurrent = currentCycleReceivables
      .filter((r) => r.status === 'paid')
      .reduce((acc, curr) => acc + Number(curr.amount), 0)

    const totalAllPending = receivables
      .filter((r) => r.status === 'pending')
      .reduce((acc, curr) => acc + Number(curr.amount), 0)

    const activePeopleCount = new Set(
      receivables.filter((r) => r.status === 'pending').map((r) => r.debtor_name)
    ).size

    return {
      pendingCurrent,
      paidCurrent,
      totalAllPending,
      activePeopleCount,
    }
  }, [receivables, currentCycleId])

  // Filtragem
  const filteredReceivables = useMemo(() => {
    return receivables.filter((r) => {
      // Filtro de pessoa
      if (selectedDebtor !== 'all' && r.debtor_name !== selectedDebtor) return false

      // Filtro de status
      if (statusFilter !== 'all' && r.status !== statusFilter) return false

      // Filtro de ciclo
      if (cycleFilter === 'current') {
        if (r.billing_cycle && r.billing_cycle !== currentCycleId) return false
      }

      // Filtro de busca
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase()
        const matchesName = r.debtor_name.toLowerCase().includes(q)
        const matchesDesc = r.description.toLowerCase().includes(q)
        return matchesName || matchesDesc
      }

      return true
    })
  }, [receivables, selectedDebtor, statusFilter, cycleFilter, searchTerm, currentCycleId])

  // Agrupamento de pendentes por pessoa no filtro atual (para Baixa em Lote e Cobrança WhatsApp)
  const pendingByDebtor = useMemo(() => {
    const map = new Map<string, { debtorName: string; items: Receivable[]; total: number }>()
    filteredReceivables
      .filter((r) => r.status === 'pending')
      .forEach((r) => {
        const entry = map.get(r.debtor_name) || {
          debtorName: r.debtor_name,
          items: [],
          total: 0,
        }
        entry.items.push(r)
        entry.total += Number(r.amount)
        map.set(r.debtor_name, entry)
      })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filteredReceivables])

  const buildWhatsAppMessage = (debtorName: string, items: Receivable[], total: number) => {
    const cycleTitle =
      cycleFilter === 'current'
        ? currentCycleLabel.split('(')[0].trim()
        : 'Geral (Todas as Faturas)'
    const lines = items.map((item) => {
      const inst =
        item.installment_total > 1
          ? ` [Parcela ${item.installment_current}/${item.installment_total}]`
          : ''
      return `• ${item.description}${inst}: ${formatCurrency(Number(item.amount))}`
    })
    return `Oi ${debtorName}! Tudo bem? Segue o resumo das notinhas (${cycleTitle}):\n\n${lines.join(
      '\n'
    )}\n\n💰 *Total: ${formatCurrency(total)}*`
  }

  const handleCopyWhatsApp = async (debtorName: string, items: Receivable[], total: number) => {
    const msg = buildWhatsAppMessage(debtorName, items, total)
    try {
      await navigator.clipboard.writeText(msg)
      setFeedback(`Resumo de cobrança de ${debtorName} (${formatCurrency(total)}) copiado! Só colar no WhatsApp.`)
      setTimeout(() => setFeedback(null), 5000)
    } catch {
      alert(msg)
    }
  }

  const handleOpenWhatsApp = (debtorName: string, items: Receivable[], total: number) => {
    const msg = buildWhatsAppMessage(debtorName, items, total)
    const url = `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleBatchSettlePerson = async (debtorName: string, items: Receivable[], total: number) => {
    if (
      !confirm(
        `Confirmar recebimento em lote de ${items.length} ${
          items.length === 1 ? 'notinha' : 'notinhas'
        } de ${debtorName} no valor total de ${formatCurrency(total)} via Pix?`
      )
    ) {
      return
    }
    setBatchLoadingDebtor(debtorName)
    setFeedback(null)
    try {
      await markPersonReceivablesPaidAction({
        debtorName,
        receivableIds: items.map((i) => i.id),
        creditToBalance: true,
      })
      setFeedback(
        `Todas as ${items.length} notinhas de ${debtorName} (${formatCurrency(
          total
        )}) foram baixadas e somadas ao seu Saldo Principal (Pix)!`
      )
      setTimeout(() => setFeedback(null), 6000)
    } finally {
      setBatchLoadingDebtor(null)
    }
  }

  // Marcar como Recebido (Pix) - Regra 2
  const handleMarkAsPaid = async (rec: Receivable) => {
    setLoadingId(rec.id)
    setFeedback(null)
    try {
      const instInfo =
        rec.installment_total > 1
          ? `${rec.installment_current}/${rec.installment_total}`
          : undefined

      await markReceivablePaidAction({
        receivableId: rec.id,
        amount: Number(rec.amount),
        debtorName: rec.debtor_name,
        creditToBalance: true, // Soma diretamente ao Saldo Principal via Pix!
        installmentInfo: instInfo,
      })

      setFeedback(
        `Notinha de ${rec.debtor_name} (${formatCurrency(
          Number(rec.amount)
        )}) marcada como recebida e creditada no seu Saldo Principal (Pix)!`
      )
      setTimeout(() => setFeedback(null), 5000)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover esta notinha?')) return
    await deleteReceivableAction(id)
  }

  // Cores de avatar por nome
  const getAvatarColor = (name: string) => {
    const colors = [
      'from-amber-500 to-orange-500',
      'from-pink-500 to-rose-500',
      'from-purple-500 to-indigo-500',
      'from-cyan-500 to-blue-500',
      'from-emerald-500 to-teal-500',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const idx = Math.abs(hash) % colors.length
    return colors[idx]
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Feedback Toast */}
      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Cards de Notinhas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total a Receber no Ciclo Atual */}
        <Card className="border-amber-500/30 bg-gradient-to-b from-[#1c140a] to-[#0e0a05]">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              A Receber no Ciclo Atual
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl font-extrabold text-white tracking-tight">
              {formatCurrency(metrics.pendingCurrent)}
            </div>
            <p className="text-[11px] text-slate-400">
              Fatura {currentCycleLabel.split('(')[0]}
            </p>
          </CardContent>
        </Card>

        {/* Total Geral Projetado (Todas as parcelas futuras) */}
        <Card className="border-violet-500/20 bg-gradient-to-b from-[#140e24] to-[#0a0712]">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-violet-300 uppercase tracking-wider">
              Total Geral Futuro
            </span>
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl font-extrabold text-violet-300 tracking-tight">
              {formatCurrency(metrics.totalAllPending)}
            </div>
            <p className="text-[11px] text-slate-400">Todas as parcelas até o fim</p>
          </CardContent>
        </Card>

        {/* Total Já Recebido no Mês */}
        <Card className="border-emerald-500/20 bg-gradient-to-b from-[#0e1c14] to-[#070e0a]">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Recebido no Ciclo (Pix)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl font-extrabold text-emerald-400 tracking-tight">
              {formatCurrency(metrics.paidCurrent)}
            </div>
            <p className="text-[11px] text-slate-400">Creditado no Saldo Principal</p>
          </CardContent>
        </Card>

        {/* Pessoas Ativas */}
        <Card className="border-cyan-500/20 bg-gradient-to-b from-[#0c1622] to-[#060b11]">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Pessoas com Notinhas
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl font-extrabold text-cyan-300 tracking-tight">
              {metrics.activePeopleCount} {metrics.activePeopleCount === 1 ? 'pessoa' : 'pessoas'}
            </div>
            <p className="text-[11px] text-slate-400">Com parcelas pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Seção Principal: Controles e Tabela/Cards de Notinhas */}
      <Card className="border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-xl">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                <Users className="h-5 w-5 text-amber-400" />
                Notinhas a Receber (Terceiros)
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Gerencie compras feitas no seu cartão de crédito para terceiros e parcelamentos
              </CardDescription>
            </div>

            {/* Botão Nova Notinha */}
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/20 self-start md:self-auto flex items-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4 text-black" />
              <span>Nova Notinha</span>
            </Button>
          </div>

          {/* Filtros: Status e Ciclo */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06] mt-3">
            {/* Status (Pendentes / Recebidas / Todas) */}
            <div className="flex items-center gap-1 p-1 bg-[#121826] rounded-xl border border-white/[0.08]">
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Pendentes
              </button>
              <button
                onClick={() => setStatusFilter('paid')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'paid'
                    ? 'bg-emerald-500 text-black font-bold shadow-md shadow-emerald-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Recebidas (Pagas)
              </button>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  statusFilter === 'all'
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas
              </button>
            </div>

            {/* Ciclo (Ciclo Atual / Todas incluindo Futuras) */}
            <div className="flex items-center gap-1 p-1 bg-[#121826] rounded-xl border border-white/[0.08]">
              <button
                onClick={() => setCycleFilter('current')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  cycleFilter === 'current'
                    ? 'bg-violet-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ciclo Vigente
              </button>
              <button
                onClick={() => setCycleFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  cycleFilter === 'all'
                    ? 'bg-violet-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Todas as Faturas (Futuras)
              </button>
            </div>

            {/* Campo de Busca */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar por Luiza, Nalyne, Yara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#111726] border border-white/[0.08] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          {/* Chips de Filtro por Devedor (Luiza, Nalyne, Yara, Marcos...) */}
          {debtorsList.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-1 no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-400 shrink-0">Filtrar por:</span>
              <button
                onClick={() => setSelectedDebtor('all')}
                className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all shrink-0 ${
                  selectedDebtor === 'all'
                    ? 'bg-amber-500 text-black border-amber-500 font-bold'
                    : 'bg-white/[0.03] text-slate-300 border-white/[0.06] hover:border-white/20'
                }`}
              >
                Todos ({receivables.length})
              </button>
              {debtorsList.map((debtor) => {
                const count = receivables.filter((r) => r.debtor_name === debtor).length
                const isSelected = selectedDebtor === debtor
                return (
                  <button
                    key={debtor}
                    onClick={() => setSelectedDebtor(debtor)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-black border-amber-500 font-bold'
                        : 'bg-white/[0.03] text-slate-300 border-white/[0.06] hover:border-white/20'
                    }`}
                  >
                    <span>{debtor}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </CardHeader>

        {/* Lista de Notinhas */}
        <CardContent className="p-5 pt-2 space-y-5">
          {/* Painel de Cobrança Rápida WhatsApp e Baixa em Lote por Pessoa */}
          {pendingByDebtor.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  Ações Rápidas por Pessoa ({cycleFilter === 'current' ? 'Ciclo Vigente' : 'Todas as Faturas'})
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingByDebtor.map((group) => (
                  <div
                    key={group.debtorName}
                    className="p-3.5 rounded-2xl bg-[#121826]/90 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-10 w-10 rounded-xl bg-gradient-to-tr ${getAvatarColor(
                          group.debtorName
                        )} flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0`}
                      >
                        {group.debtorName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">
                            {group.debtorName}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
                            {group.items.length} {group.items.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                        <span className="text-sm font-extrabold font-mono text-amber-400 block">
                          Total: {formatCurrency(group.total)}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyWhatsApp(group.debtorName, group.items, group.total)
                        }
                        className="h-8 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                        title="Copiar resumo formatado para colar no WhatsApp"
                      >
                        <Copy className="h-3.5 w-3.5 text-amber-400" />
                        <span>Copiar Cobrança</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenWhatsApp(group.debtorName, group.items, group.total)
                        }
                        className="h-8 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[11px] font-semibold inline-flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap"
                        title="Abrir direto no WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                        <span>WhatsApp</span>
                      </button>

                      <button
                        type="button"
                        disabled={batchLoadingDebtor === group.debtorName}
                        onClick={() =>
                          handleBatchSettlePerson(group.debtorName, group.items, group.total)
                        }
                        className="h-8 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-bold inline-flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer whitespace-nowrap"
                        title="Dar baixa em todas as notinhas desta pessoa de uma vez via Pix"
                      >
                        <CheckCheck className="h-3.5 w-3.5 text-black" />
                        <span>
                          {batchLoadingDebtor === group.debtorName
                            ? 'Baixando...'
                            : 'Receber Tudo (Pix)'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredReceivables.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-500">
                <Users className="h-6 w-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">Nenhuma notinha encontrada</p>
              <p className="text-xs text-slate-500">
                {searchTerm || selectedDebtor !== 'all' || statusFilter !== 'all'
                  ? 'Ajuste os filtros para ver outros registros.'
                  : 'Clique no botão "+ Nova Notinha" para cadastrar um recebível de terceiros.'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredReceivables.map((rec) => {
                const isPaid = rec.status === 'paid'
                const isCurrent = !rec.billing_cycle || rec.billing_cycle === currentCycleId
                const initials = rec.debtor_name
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

                return (
                  <div
                    key={rec.id}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] px-3 rounded-xl transition-colors group"
                  >
                    {/* Devedor & Descrição */}
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Avatar */}
                      <div
                        className={`h-11 w-11 rounded-xl bg-gradient-to-tr ${getAvatarColor(
                          rec.debtor_name
                        )} flex items-center justify-center text-white font-bold text-xs shadow-md shrink-0`}
                      >
                        {initials}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white">
                            {rec.debtor_name}
                          </span>

                          {/* Parcela Badge (ex: 2/10 ou 2/4) */}
                          {rec.installment_total > 1 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 font-bold shrink-0">
                              <Layers className="h-3 w-3" />
                              Parcela {rec.installment_current}/{rec.installment_total}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">À vista</span>
                          )}

                          {/* Status Badge */}
                          {isPaid ? (
                            <Badge variant="success" className="text-[10px] py-0 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Recebido
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px] py-0 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Pendente
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          <span className="truncate max-w-[200px] sm:max-w-[300px] text-slate-300">
                            {rec.description}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-[11px] text-slate-400 flex items-center gap-1">
                            <CreditCard className="h-3 w-3 text-slate-500" />
                            Fatura: {rec.billing_cycle || currentCycleId}
                            {isCurrent && (
                              <span className="text-emerald-400 font-semibold ml-1">(Atual)</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Valor e Botão "Marcar como Recebido (Pix)" */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.04]">
                      <div className="text-left sm:text-right">
                        <span
                          className={`text-base sm:text-lg font-bold font-mono ${
                            isPaid ? 'text-emerald-400 line-through opacity-70' : 'text-amber-400'
                          }`}
                        >
                          {formatCurrency(Number(rec.amount))}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {isPaid ? 'Pago via Pix' : 'Aguardando pagamento'}
                        </span>
                      </div>

                      {/* Botão de Ação: Marcar como Recebido (Pix) */}
                      {!isPaid ? (
                        <Button
                          size="sm"
                          onClick={() => handleMarkAsPaid(rec)}
                          disabled={loadingId === rec.id}
                          className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-9 px-3.5 shadow-md shadow-emerald-500/20 shrink-0 text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <QrCode className="h-3.5 w-3.5 text-black" />
                          <span>{loadingId === rec.id ? 'Baixando...' : 'Marcar como Recebido (Pix)'}</span>
                        </Button>
                      ) : (
                        <div className="p-2 rounded-lg text-emerald-400 bg-emerald-500/10 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-4 w-4" />
                          Quitado
                        </div>
                      )}

                      {/* Excluir notinha */}
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="opacity-80 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Remover notinha"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Nova Notinha */}
      <NewReceivableModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentCycleId={currentCycleId}
      />
    </div>
  )
}

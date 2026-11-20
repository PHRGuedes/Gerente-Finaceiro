'use client'

import React, { useState, useMemo } from 'react'
import {
  Spade,
  Trophy,
  Coins,
  PlusCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Search,
  Trash2,
  CheckCircle2,
  DollarSign,
  Layers,
  Sparkles,
  MapPin,
  FileText,
  AlertCircle,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Edit2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PokerEntry, PokerGameType, PokerEntryType } from '@/types/finance'
import {
  createPokerEntryAction,
  createPokerTrackerSessionAction,
  updatePokerEntryAction,
  deletePokerEntryAction,
} from '@/actions/finance'

interface PokerSectionProps {
  entries: PokerEntry[]
}

type PeriodFilter = 'all' | 'this_month' | 'last_month' | 'this_year' | 'last_30_days' | 'custom'
type GameTypeFilter = 'all' | 'tournament' | 'cash'
type EntryTypeFilter = 'all' | 'buy_in' | 'cash_out'

export function PokerSection({ entries }: PokerSectionProps) {
  // Filtros
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [gameFilter, setGameFilter] = useState<GameTypeFilter>('all')
  const [entryTypeFilter, setEntryTypeFilter] = useState<EntryTypeFilter>('all')
  const [searchTerm, setSearchTerm] = useState('')

  // Modal de Criação / Edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'session' | 'single'>('session')
  const [editingEntry, setEditingEntry] = useState<PokerEntry | null>(null)

  // Form: Sessão Completa (Buy-in + Cashout)
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0])
  const [sessionDesc, setSessionDesc] = useState('')
  const [sessionGameType, setSessionGameType] = useState<PokerGameType>('tournament')
  const [sessionBuyIn, setSessionBuyIn] = useState('')
  const [sessionCashOut, setSessionCashOut] = useState('')
  const [sessionLocation, setSessionLocation] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')

  // Form: Lançamento Avulso (Só Buy-in ou Só Cashout)
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0])
  const [singleDesc, setSingleDesc] = useState('')
  const [singleGameType, setSingleGameType] = useState<PokerGameType>('tournament')
  const [singleEntryType, setSingleEntryType] = useState<PokerEntryType>('buy_in')
  const [singleAmount, setSingleAmount] = useState('')
  const [singleLocation, setSingleLocation] = useState('')
  const [singleNotes, setSingleNotes] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 1. Filtragem das Entradas
  const filteredEntries = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    return entries.filter((entry) => {
      const entryDate = new Date(`${entry.date}T12:00:00`)

      // Filtro de Período
      if (periodFilter === 'this_month') {
        if (entryDate.getFullYear() !== currentYear || entryDate.getMonth() !== currentMonth) {
          return false
        }
      } else if (periodFilter === 'last_month') {
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
        const yearOfLastMonth = currentMonth === 0 ? currentYear - 1 : currentYear
        if (entryDate.getFullYear() !== yearOfLastMonth || entryDate.getMonth() !== lastMonth) {
          return false
        }
      } else if (periodFilter === 'this_year') {
        if (entryDate.getFullYear() !== currentYear) {
          return false
        }
      } else if (periodFilter === 'last_30_days') {
        const diffMs = now.getTime() - entryDate.getTime()
        const diffDays = diffMs / (1000 * 60 * 60 * 24)
        if (diffDays < 0 || diffDays > 30) {
          return false
        }
      } else if (periodFilter === 'custom') {
        if (startDate && entry.date < startDate) return false
        if (endDate && entry.date > endDate) return false
      }

      // Filtro de Modalidade (Torneio vs Cash)
      if (gameFilter !== 'all' && entry.game_type !== gameFilter) {
        return false
      }

      // Filtro de Entrada vs Saída
      if (entryTypeFilter !== 'all' && entry.entry_type !== entryTypeFilter) {
        return false
      }

      // Busca por texto
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const matchesDesc = entry.description.toLowerCase().includes(term)
        const matchesLoc = entry.location?.toLowerCase().includes(term) || false
        const matchesNotes = entry.notes?.toLowerCase().includes(term) || false
        if (!matchesDesc && !matchesLoc && !matchesNotes) return false
      }

      return true
    })
  }, [entries, periodFilter, startDate, endDate, gameFilter, entryTypeFilter, searchTerm])

  // 2. Cálculos Totais (Período Filtrado)
  const stats = useMemo(() => {
    let totalBuyIn = 0
    let totalCashOut = 0

    let tournamentBuyIn = 0
    let tournamentCashOut = 0

    let cashGameBuyIn = 0
    let cashGameCashOut = 0

    filteredEntries.forEach((e) => {
      const val = Number(e.amount)
      if (e.entry_type === 'buy_in') {
        totalBuyIn += val
        if (e.game_type === 'tournament') tournamentBuyIn += val
        if (e.game_type === 'cash') cashGameBuyIn += val
      } else {
        totalCashOut += val
        if (e.game_type === 'tournament') tournamentCashOut += val
        if (e.game_type === 'cash') cashGameCashOut += val
      }
    })

    const netProfit = totalCashOut - totalBuyIn
    const roi = totalBuyIn > 0 ? (netProfit / totalBuyIn) * 100 : 0

    const tournamentProfit = tournamentCashOut - tournamentBuyIn
    const cashGameProfit = cashGameCashOut - cashGameBuyIn

    return {
      totalBuyIn,
      totalCashOut,
      netProfit,
      roi,
      isPositive: netProfit >= 0,
      tournament: {
        buyIn: tournamentBuyIn,
        cashOut: tournamentCashOut,
        net: tournamentProfit,
      },
      cash: {
        buyIn: cashGameBuyIn,
        cashOut: cashGameCashOut,
        net: cashGameProfit,
      },
      count: filteredEntries.length,
    }
  }, [filteredEntries])

  // 4. Curva Cronológica de Evolução do Bankroll (Lucro Acumulado por Data)
  const bankrollCurve = useMemo(() => {
    if (filteredEntries.length === 0) return []

    // Ordenar da data mais antiga para a mais recente
    const chronological = [...filteredEntries].sort((a, b) =>
      a.date === b.date
        ? (a.created_at || '').localeCompare(b.created_at || '')
        : a.date.localeCompare(b.date)
    )

    // Agrupar saldo líquido por data para uma curva limpa
    const dailyMap = new Map<string, number>()
    chronological.forEach((e) => {
      const delta = e.entry_type === 'cash_out' ? Number(e.amount) : -Number(e.amount)
      dailyMap.set(e.date, (dailyMap.get(e.date) || 0) + delta)
    })

    let runningNet = 0
    const points: Array<{ date: string; dailyNet: number; cumulativeNet: number }> = [
      { date: 'Início', dailyNet: 0, cumulativeNet: 0 },
    ]

    Array.from(dailyMap.entries()).forEach(([date, dailyNet]) => {
      runningNet += dailyNet
      points.push({
        date,
        dailyNet,
        cumulativeNet: runningNet,
      })
    })

    return points
  }, [filteredEntries])

  const handleOpenEdit = (entry: PokerEntry) => {
    setEditingEntry(entry)
    setModalMode('single')
    setSingleDate(entry.date)
    setSingleDesc(entry.description)
    setSingleGameType(entry.game_type)
    setSingleEntryType(entry.entry_type)
    setSingleAmount(String(entry.amount).replace('.', ','))
    setSingleLocation(entry.location || '')
    setSingleNotes(entry.notes || '')
    setErrorMsg(null)
    setIsModalOpen(true)
  }

  const handleOpenNewModal = () => {
    setEditingEntry(null)
    setModalMode('session')
    setSingleDesc('')
    setSingleAmount('')
    setSingleLocation('')
    setSingleNotes('')
    setErrorMsg(null)
    setIsModalOpen(true)
  }

  // Handlers de Submit
  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const buyInNum = parseFloat(sessionBuyIn.replace(',', '.')) || 0
    const cashOutNum = parseFloat(sessionCashOut.replace(',', '.')) || 0

    if (buyInNum <= 0 && cashOutNum <= 0) {
      setErrorMsg('Informe ao menos o valor de Buy-in ou Cashout.')
      return
    }

    if (!sessionDesc.trim()) {
      setErrorMsg('Informe uma descrição para a sessão (ex: Home Game, Torneio 50k).')
      return
    }

    setIsSubmitting(true)
    try {
      await createPokerTrackerSessionAction({
        date: sessionDate,
        description: sessionDesc,
        game_type: sessionGameType,
        buy_in_amount: buyInNum,
        cash_out_amount: cashOutNum,
        location: sessionLocation,
        notes: sessionNotes,
      })

      setSuccessMsg('Sessão de poker salva com sucesso!')
      setIsModalOpen(false)
      // Reset form
      setSessionDesc('')
      setSessionBuyIn('')
      setSessionCashOut('')
      setSessionLocation('')
      setSessionNotes('')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao salvar sessão.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateSingle = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    const amountNum = parseFloat(singleAmount.replace(',', '.')) || 0
    if (amountNum <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.')
      return
    }

    if (!singleDesc.trim()) {
      setErrorMsg('Informe uma descrição para a movimentação.')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingEntry) {
        await updatePokerEntryAction(editingEntry.id, {
          date: singleDate,
          description: singleDesc,
          game_type: singleGameType,
          entry_type: singleEntryType,
          amount: amountNum,
          location: singleLocation,
          notes: singleNotes,
        })
        setSuccessMsg('Lançamento atualizado com sucesso!')
      } else {
        await createPokerEntryAction({
          date: singleDate,
          description: singleDesc,
          game_type: singleGameType,
          entry_type: singleEntryType,
          amount: amountNum,
          location: singleLocation,
          notes: singleNotes,
        })
        setSuccessMsg('Lançamento registrado com sucesso!')
      }

      setIsModalOpen(false)
      setEditingEntry(null)
      // Reset form
      setSingleDesc('')
      setSingleAmount('')
      setSingleLocation('')
      setSingleNotes('')
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao salvar lançamento.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string, desc: string) => {
    if (!confirm(`Deseja realmente excluir o lançamento "${desc}"?`)) return

    setDeletingId(id)
    try {
      await deletePokerEntryAction(id)
    } catch (err) {
      console.error('Erro ao deletar:', err)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successMsg && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* CARDS DE KPIS DO POKER (PERÍODO SELECIONADO) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Lucro / Prejuízo Líquido */}
        <Card
          className={`relative overflow-hidden border shadow-lg ${
            stats.isPositive
              ? 'border-emerald-500/40 bg-gradient-to-b from-[#0e2417] to-[#07130c]'
              : 'border-rose-500/40 bg-gradient-to-b from-[#240e15] to-[#13070b]'
          }`}
        >
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Resultado Líquido
              </span>
              <span className="text-[10px] text-slate-400">
                {periodFilter === 'all' ? 'Vitalício Geral' : 'No período selecionado'}
              </span>
            </div>
            <div
              className={`p-2 rounded-xl ${
                stats.isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <Spade className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div
              className={`text-2xl lg:text-3xl font-extrabold font-mono tracking-tight ${
                stats.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {stats.isPositive ? '+ ' : ''}
              {formatCurrency(stats.netProfit)}
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px]">
              <span
                className={`font-semibold ${
                  stats.isPositive ? 'text-emerald-300' : 'text-rose-300'
                }`}
              >
                ROI: {stats.roi.toFixed(1)}%
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{stats.count} registros</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Total Saídas (Premiações / Cashout / Receitas) */}
        <Card className="border-emerald-500/20 bg-gradient-to-b from-[#0c1815] to-[#060e0c]">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Premiações / Saídas
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {formatCurrency(stats.totalCashOut)}
            </div>
            <p className="text-[11px] text-slate-400">
              Total recebido em mesas e torneios
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Entradas (Buy-ins / Rebuys / Despesas) */}
        <Card className="border-rose-500/20 bg-gradient-to-b from-[#180e14] to-[#0e070c]">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
              Buy-ins / Entradas
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl lg:text-3xl font-extrabold text-rose-400 font-mono tracking-tight">
              {formatCurrency(stats.totalBuyIn)}
            </div>
            <p className="text-[11px] text-slate-400">
              Total investido em inscrições e fichas
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Breakdown Torneio vs Cash Game */}
        <Card className="border-white/[0.08] bg-gradient-to-b from-[#111726] to-[#0a0f1a]">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Torneio vs Cash
            </span>
            <div className="p-2 rounded-xl bg-white/[0.05] text-slate-300">
              <Layers className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Trophy className="h-3 w-3 text-amber-400" />
                Torneios:
              </span>
              <span
                className={`font-mono font-bold text-xs ${
                  stats.tournament.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stats.tournament.net >= 0 ? '+' : ''}
                {formatCurrency(stats.tournament.net)}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-white/[0.04]">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Coins className="h-3 w-3 text-cyan-400" />
                Cash Game:
              </span>
              <span
                className={`font-mono font-bold text-xs ${
                  stats.cash.net >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {stats.cash.net >= 0 ? '+' : ''}
                {formatCurrency(stats.cash.net)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CURVA VISUAL DE EVOLUÇÃO DO BANKROLL (RESUMO COMPACTO) */}
      {bankrollCurve.length > 1 && (
        <Card className="border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-xl">
          <CardHeader className="p-4 sm:p-5 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2 text-white">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                Curva de Evolução do Bankroll
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Progressão acumulada de lucro/prejuízo ao longo das datas filtradas
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-400">
                Pico:{' '}
                <strong className="text-emerald-400">
                  {formatCurrency(Math.max(...bankrollCurve.map((p) => p.cumulativeNet)))}
                </strong>
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">
                Atual:{' '}
                <strong className={stats.isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                  {stats.isPositive ? '+' : ''}
                  {formatCurrency(stats.netProfit)}
                </strong>
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-1">
            {(() => {
              const values = bankrollCurve.map((p) => p.cumulativeNet)
              const minVal = Math.min(0, ...values)
              const maxVal = Math.max(0, ...values)
              const range = maxVal - minVal || 100
              const width = 640
              const height = 135
              const padX = 16
              const padY = 18
              const innerW = width - padX * 2
              const innerH = height - padY * 2

              const getX = (idx: number) =>
                padX + (idx / Math.max(1, bankrollCurve.length - 1)) * innerW
              const getY = (val: number) =>
                padY + innerH - ((val - minVal) / range) * innerH

              const zeroY = getY(0)
              const pointsStr = bankrollCurve
                .map((p, idx) => `${getX(idx).toFixed(1)},${getY(p.cumulativeNet).toFixed(1)}`)
                .join(' ')

              const areaPointsStr = `${getX(0).toFixed(1)},${zeroY.toFixed(1)} ${pointsStr} ${getX(
                bankrollCurve.length - 1
              ).toFixed(1)},${zeroY.toFixed(1)}`

              const strokeColor = stats.isPositive ? '#10b981' : '#f43f5e'

              return (
                <div className="space-y-2">
                  <div className="w-full overflow-hidden rounded-xl bg-[#090d16] border border-white/[0.05] p-2">
                    <svg
                      viewBox={`0 0 ${width} ${height}`}
                      className="w-full h-32 sm:h-36 overflow-visible"
                      preserveAspectRatio="none"
                    >
                      <defs>
                        <linearGradient id="pokerCurveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.28" />
                          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.02" />
                        </linearGradient>
                      </defs>

                      {/* Linha de Zero (Break-even) */}
                      <line
                        x1={padX}
                        y1={zeroY}
                        x2={width - padX}
                        y2={zeroY}
                        stroke="rgba(255,255,255,0.14)"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />

                      {/* Área Preenchida */}
                      <polygon points={areaPointsStr} fill="url(#pokerCurveGrad)" />

                      {/* Linha de Evolução */}
                      <polyline
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={pointsStr}
                      />

                      {/* Pontos da Curva */}
                      {bankrollCurve.map((p, idx) => (
                        <circle
                          key={idx}
                          cx={getX(idx)}
                          cy={getY(p.cumulativeNet)}
                          r={idx === bankrollCurve.length - 1 ? 4.5 : 3}
                          fill={p.cumulativeNet >= 0 ? '#10b981' : '#f43f5e'}
                          stroke="#090d16"
                          strokeWidth="1.5"
                        >
                          <title>
                            {p.date === 'Início' ? 'Início' : formatDate(p.date)}: Acumulado{' '}
                            {formatCurrency(p.cumulativeNet)}
                          </title>
                        </circle>
                      ))}
                    </svg>
                  </div>

                  {/* Legenda de Datas Extremos */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
                    <span>
                      Início:{' '}
                      {bankrollCurve[1] ? formatDate(bankrollCurve[1].date) : '—'}
                    </span>
                    <span className="text-slate-500">Linha tracejada = R$ 0,00</span>
                    <span>
                      Último:{' '}
                      {formatDate(bankrollCurve[bankrollCurve.length - 1].date)}
                    </span>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* SEÇÃO PRINCIPAL: FILTROS + LISTAGEM */}
      <Card className="border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-xl">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                <Spade className="h-5 w-5 text-emerald-400" />
                Histórico de Sessões & Jogatinas
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Acompanhe o desempenho de cada sessão de Poker ao longo do tempo
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleOpenNewModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 self-start sm:self-auto h-9 px-3.5"
            >
              <PlusCircle className="h-4 w-4 text-black" />
              <span>Nova Sessão / Lançamento</span>
            </Button>
          </div>

          {/* BARRA DE FILTROS */}
          <div className="space-y-3 pt-3">
            {/* Filtros de Período Rápido */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Período:
              </span>

              {[
                { id: 'all', label: 'Vitalício (Tudo)' },
                { id: 'this_month', label: 'Este Mês' },
                { id: 'last_month', label: 'Mês Passado' },
                { id: 'this_year', label: 'Este Ano' },
                { id: 'last_30_days', label: 'Últimos 30 Dias' },
                { id: 'custom', label: 'Personalizado' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodFilter(p.id as PeriodFilter)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    periodFilter === p.id
                      ? 'bg-emerald-500 text-black font-semibold shadow-sm'
                      : 'bg-[#121826] text-slate-400 hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Inputs de Data Personalizada se selecionado "custom" */}
            {periodFilter === 'custom' && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-[#121826] border border-white/[0.08] text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">De:</span>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[#182032] border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 text-[11px]">Até:</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-[#182032] border border-white/10 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
                {(startDate || endDate) && (
                  <button
                    onClick={() => {
                      setStartDate('')
                      setEndDate('')
                    }}
                    className="text-[11px] text-slate-400 hover:text-white underline ml-2"
                  >
                    Limpar datas
                  </button>
                )}
              </div>
            )}

            {/* Linha com Busca + Modalidade + Tipo de Movimentação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Campo de Busca */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar por descrição, torneio ou local..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-[#111726]/80 border border-white/[0.08] rounded-xl pl-9 pr-4 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Filtro por Modalidade: Todos / Torneio / Cash */}
              <div className="flex items-center gap-1 bg-[#121826] p-1 rounded-xl border border-white/[0.08] shrink-0 text-xs">
                <button
                  onClick={() => setGameFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    gameFilter === 'all'
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setGameFilter('tournament')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    gameFilter === 'tournament'
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Trophy className="h-3 w-3" />
                  Torneios
                </button>
                <button
                  onClick={() => setGameFilter('cash')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    gameFilter === 'cash'
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Coins className="h-3 w-3" />
                  Cash Game
                </button>
              </div>

              {/* Filtro por Entrada vs Saída */}
              <div className="flex items-center gap-1 bg-[#121826] p-1 rounded-xl border border-white/[0.08] shrink-0 text-xs">
                <button
                  onClick={() => setEntryTypeFilter('all')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    entryTypeFilter === 'all'
                      ? 'bg-white/10 text-white font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Tudo
                </button>
                <button
                  onClick={() => setEntryTypeFilter('cash_out')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    entryTypeFilter === 'cash_out'
                      ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                  Receitas
                </button>
                <button
                  onClick={() => setEntryTypeFilter('buy_in')}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1 ${
                    entryTypeFilter === 'buy_in'
                      ? 'bg-rose-500/20 text-rose-300 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ArrowDownLeft className="h-3 w-3 text-rose-400" />
                  Despesas
                </button>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* TABELA DE SESSÕES */}
        <CardContent className="p-5 pt-0">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-slate-500">
                <Spade className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">Nenhum lançamento de poker encontrado</p>
              <p className="text-xs text-slate-500">
                Altere os filtros acima ou cadastre uma nova jogatina no botão &quot;+ Nova Sessão&quot;.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredEntries.map((entry) => {
                const isCashOut = entry.entry_type === 'cash_out'
                const isTournament = entry.game_type === 'tournament'

                return (
                  <div
                    key={entry.id}
                    className="p-3.5 rounded-xl bg-[#111726]/60 hover:bg-[#111726] border border-white/[0.05] hover:border-white/[0.12] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Ícone de Entrada ou Saída */}
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isCashOut
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isCashOut ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {entry.description}
                          </span>

                          {/* Badge de Modalidade (Torneio vs Cash) */}
                          <Badge
                            variant="outline"
                            className={`text-[10px] py-0 px-2 flex items-center gap-1 ${
                              isTournament
                                ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                            }`}
                          >
                            {isTournament ? (
                              <Trophy className="h-2.5 w-2.5" />
                            ) : (
                              <Coins className="h-2.5 w-2.5" />
                            )}
                            {isTournament ? 'Torneio' : 'Cash Game'}
                          </Badge>

                          {/* Badge de Tipo (Receita vs Despesa) */}
                          <Badge
                            className={`text-[10px] py-0 px-1.5 ${
                              isCashOut
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            }`}
                          >
                            {isCashOut ? 'Receita / Prêmio' : 'Despesa / Buy-in'}
                          </Badge>
                        </div>

                        {/* Metadados: Data, Local, Notas */}
                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                          <span className="font-mono text-slate-300">
                            {formatDate(entry.date)}
                          </span>

                          {entry.location && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <MapPin className="h-3 w-3 text-slate-500" />
                              {entry.location}
                            </span>
                          )}

                          {entry.notes && (
                            <span className="text-slate-500 truncate max-w-[200px]" title={entry.notes}>
                              Nota: {entry.notes}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lado Direito: Valor e Ação de Excluir */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                      <div className="text-right">
                        <span
                          className={`font-mono font-bold text-base block ${
                            isCashOut ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isCashOut ? '+ ' : '- '}
                          {formatCurrency(Number(entry.amount))}
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          {isCashOut ? 'Cashout' : 'Buy-in'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(entry)}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                          title="Editar lançamento"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(entry.id, entry.description)}
                          disabled={deletingId === entry.id}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL: NOVO / EDITAR LANÇAMENTO DE POKER */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#0c101a] border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111726]/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {editingEntry ? <Edit2 className="h-5 w-5" /> : <Spade className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingEntry ? 'Editar Lançamento de Poker' : 'Novo Lançamento de Poker'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Bankroll independente (não altera saldo em conta)
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingEntry(null)
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Abas do Modal: Sessão Completa vs Lançamento Avulso */}
            {!editingEntry && (
            <div className="p-3 bg-[#111726]/50 border-b border-white/[0.06] flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setModalMode('session')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modalMode === 'session'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Sessão Completa (Buy-in & Cashout)
              </button>
              <button
                type="button"
                onClick={() => setModalMode('single')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  modalMode === 'single'
                    ? 'bg-emerald-500 text-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Movimentação Avulsa
              </button>
            </div>
            )}

            {/* Mensagem de Erro */}
            {errorMsg && (
              <div className="m-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* FORMULÁRIO 1: SESSÃO COMPLETA */}
            {modalMode === 'session' && (
              <form onSubmit={handleCreateSession} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Data da Sessão
                    </label>
                    <input
                      type="date"
                      required
                      value={sessionDate}
                      onChange={(e) => setSessionDate(e.target.value)}
                      className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Modalidade
                    </label>
                    <select
                      value={sessionGameType}
                      onChange={(e) => setSessionGameType(e.target.value as PokerGameType)}
                      className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="tournament">Torneio</option>
                      <option value="cash">Cash Game</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Descrição da Sessão
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Freeroll Quinta, Cash 1/2 Home Game"
                    value={sessionDesc}
                    onChange={(e) => setSessionDesc(e.target.value)}
                    className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Valores: Buy-in vs Cashout */}
                <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-[#151c2e]/60 border border-white/[0.06]">
                  <div>
                    <label className="block text-xs font-medium text-rose-300 mb-1 flex items-center gap-1">
                      <ArrowDownLeft className="h-3 w-3 text-rose-400" />
                      Buy-in (Despesa R$)
                    </label>
                    <input
                      type="text"
                      placeholder="90,00"
                      value={sessionBuyIn}
                      onChange={(e) => setSessionBuyIn(e.target.value)}
                      className="w-full bg-[#0c101a] border border-rose-500/30 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-emerald-300 mb-1 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                      Cashout (Receita R$)
                    </label>
                    <input
                      type="text"
                      placeholder="151,00"
                      value={sessionCashOut}
                      onChange={(e) => setSessionCashOut(e.target.value)}
                      className="w-full bg-[#0c101a] border border-emerald-500/30 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Prévia do Resultado Líquido da Sessão */}
                {(() => {
                  const b = parseFloat(sessionBuyIn.replace(',', '.')) || 0
                  const c = parseFloat(sessionCashOut.replace(',', '.')) || 0
                  if (b > 0 || c > 0) {
                    const net = c - b
                    return (
                      <div
                        className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
                          net >= 0
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                        }`}
                      >
                        <span className="font-semibold">Resultado desta sessão:</span>
                        <span className="font-mono font-bold text-sm">
                          {net >= 0 ? '+ ' : ''}
                          {formatCurrency(net)}
                        </span>
                      </div>
                    )
                  }
                  return null
                })()}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Local / Clube (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Clube H2, GGPoker"
                      value={sessionLocation}
                      onChange={(e) => setSessionLocation(e.target.value)}
                      className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Notas / Detalhes (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 2º Lugar, blefe final"
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                    className="border-white/10 text-slate-400"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Sessão'}
                  </Button>
                </div>
              </form>
            )}

            {/* FORMULÁRIO 2: LANÇAMENTO AVULSO */}
            {modalMode === 'single' && (
              <form onSubmit={handleCreateSingle} className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Data
                    </label>
                    <input
                      type="date"
                      required
                      value={singleDate}
                      onChange={(e) => setSingleDate(e.target.value)}
                      className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Modalidade
                    </label>
                    <select
                      value={singleGameType}
                      onChange={(e) => setSingleGameType(e.target.value as PokerGameType)}
                      className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="tournament">Torneio</option>
                      <option value="cash">Cash Game</option>
                    </select>
                  </div>
                </div>

                {/* Tipo de Movimentação: Entrada vs Saída */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Tipo de Movimentação
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSingleEntryType('buy_in')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        singleEntryType === 'buy_in'
                          ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                          : 'bg-[#151c2e] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      <ArrowDownLeft className="h-3.5 w-3.5 text-rose-400" />
                      Entrada (Buy-in / Despesa)
                    </button>

                    <button
                      type="button"
                      onClick={() => setSingleEntryType('cash_out')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        singleEntryType === 'cash_out'
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-[#151c2e] border-white/[0.08] text-slate-400'
                      }`}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
                      Saída (Prêmio / Receita)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Descrição
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Croupier Freeroll, Cash Game 1/2"
                    value={singleDesc}
                    onChange={(e) => setSingleDesc(e.target.value)}
                    className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={singleAmount}
                    onChange={(e) => setSingleAmount(e.target.value)}
                    className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Local (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Clube H2"
                      value={singleLocation}
                      onChange={(e) => setSingleLocation(e.target.value)}
                      className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Notas (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Rebuy"
                      value={singleNotes}
                      onChange={(e) => setSingleNotes(e.target.value)}
                      className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                    className="border-white/10 text-slate-400"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs shadow-md shadow-emerald-500/20"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salvar Lançamento'}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

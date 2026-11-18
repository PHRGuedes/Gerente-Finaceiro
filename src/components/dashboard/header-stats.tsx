'use client'

import React, { useState } from 'react'
import {
  Wallet,
  CreditCard,
  CalendarDays,
  HandCoins,
  Users,
  AlertTriangle,
  ArrowUpRight,
  Receipt,
  Sparkles,
  FileSpreadsheet,
  FileDown,
  Edit2,
  Check,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { BillingCycleInfo } from '@/lib/billing'
import { AccountBalance, ForecastItem, InformalDebt, Receivable } from '@/types/finance'
import { setCheckingBalanceAction } from '@/actions/finance'

interface HeaderStatsProps {
  checkingBalance: number
  billingCycle: BillingCycleInfo
  creditInvoice: {
    total: number
    ownExpense: number
    thirdPartyExpense: number
  }
  fixedObligations?: {
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
  onOpenPayInvoice: () => void
  onOpenNewTransaction: () => void
  onOpenAmortizeDebt: (debt: InformalDebt) => void
  onOpenSettleReceivable: (rec: Receivable) => void
  onOpenConciliateCsv?: () => void
  onOpenExportPdf?: () => void
}

export function HeaderStats({
  checkingBalance,
  billingCycle,
  creditInvoice,
  informalDebts,
  receivables,
  onOpenPayInvoice,
  onOpenNewTransaction,
  onOpenAmortizeDebt,
  onOpenSettleReceivable,
  onOpenConciliateCsv,
  onOpenExportPdf,
}: HeaderStatsProps) {
  const isLowBalance = checkingBalance < 50.0
  const [isEditingBalance, setIsEditingBalance] = useState(false)
  const [balanceInput, setBalanceInput] = useState('')
  const [savingBalance, setSavingBalance] = useState(false)

  const handleOpenEditBalance = () => {
    setBalanceInput(checkingBalance.toFixed(2).replace('.', ','))
    setIsEditingBalance(true)
  }

  const handleSaveBalance = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const parsed = parseFloat(balanceInput.replace(/\./g, '').replace(',', '.'))
    if (isNaN(parsed)) return

    setSavingBalance(true)
    try {
      await setCheckingBalanceAction(parsed)
      setIsEditingBalance(false)
    } finally {
      setSavingBalance(false)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Saldo Atual em Conta (com alerta visual se < R$ 50,00) */}
      <Card
        className={`relative overflow-hidden transition-all duration-300 ${
          isLowBalance
            ? 'border-rose-500/60 bg-gradient-to-b from-[#240e16] to-[#12080d] shadow-lg shadow-rose-950/40 ring-1 ring-rose-500/50'
            : 'border-emerald-500/20 bg-gradient-to-b from-[#0f1725] to-[#0a101b]'
        }`}
      >
        {isLowBalance && (
          <div className="absolute top-0 right-0 left-0 bg-rose-500/20 text-rose-300 text-[10px] font-semibold tracking-wider uppercase py-0.5 text-center flex items-center justify-center gap-1 border-b border-rose-500/30 animate-pulse">
            <AlertTriangle className="h-3 w-3 text-rose-400" />
            Alerta: Saldo abaixo de R$ 50,00!
          </div>
        )}

        <CardHeader className={`p-4 pb-1 flex flex-row items-center justify-between ${isLowBalance ? 'pt-6' : ''}`}>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Saldo em Conta
          </span>
          <div className="flex items-center gap-1.5">
            {!isEditingBalance && (
              <button
                type="button"
                onClick={handleOpenEditBalance}
                className="h-7 px-2 rounded-lg text-[10px] font-semibold bg-white/[0.04] hover:bg-emerald-500/15 text-slate-300 hover:text-emerald-300 border border-white/[0.08] hover:border-emerald-500/30 flex items-center gap-1 transition-all cursor-pointer"
                title="Ajustar saldo real em conta"
              >
                <Edit2 className="h-2.5 w-2.5 text-emerald-400" />
                <span>Ajustar</span>
              </button>
            )}
            <div
              className={`p-2 rounded-xl ${
                isLowBalance
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              <Wallet className="h-4 w-4" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-2">
          {isEditingBalance ? (
            <form onSubmit={handleSaveBalance} className="space-y-2 pt-1 animate-in fade-in">
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">
                  R$
                </span>
                <input
                  type="text"
                  autoFocus
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder="0,00"
                  className="w-full h-9 bg-[#111726] border border-emerald-500/40 rounded-lg pl-8 pr-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="submit"
                  disabled={savingBalance}
                  className="flex-1 h-7 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="h-3 w-3" />
                  {savingBalance ? 'Salvando...' : 'Salvar Saldo'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingBalance(false)}
                  className="h-7 px-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 text-[11px] flex items-center justify-center cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </form>
          ) : (
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${
                  isLowBalance ? 'text-rose-400' : 'text-white'
                }`}
              >
                {formatCurrency(checkingBalance)}
              </span>
            </div>
          )}

          <p className="text-[11px] text-slate-400 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Conta Corrente / Pix disponível
          </p>
        </CardContent>
      </Card>

      {/* 2. Fatura em Formação (Crédito) */}
      <Card className="border-violet-500/30 bg-gradient-to-b from-[#15122a] to-[#0c0a18] shadow-lg shadow-black/40">
        <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
          <div>
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider block">
              Fatura em Formação
            </span>
            <span className="text-[10px] text-violet-400 font-mono">
              Fecha em {billingCycle.daysUntilClosing} dias (04/{billingCycle.cycleId.split('-')[1]})
            </span>
          </div>
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
            <CreditCard className="h-4 w-4" />
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-3">
          <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(creditInvoice.total)}
          </div>

          {/* Breakdown: Gasto Próprio vs Notinhas */}
          <div className="space-y-1.5 pt-1 border-t border-white/[0.06] text-[11px]">
            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-violet-400"></span>
                Gasto Próprio:
              </span>
              <span className="font-semibold">{formatCurrency(creditInvoice.ownExpense)}</span>
            </div>
            <div className="flex justify-between items-center text-amber-300">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                Notinhas / Terceiros:
              </span>
              <span className="font-semibold">{formatCurrency(creditInvoice.thirdPartyExpense)}</span>
            </div>
          </div>

          {/* Ações da Fatura: Conciliar CSV e Exportar PDF */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenConciliateCsv}
              className="text-[10px] font-semibold border-violet-500/30 hover:bg-violet-500/20 text-violet-200 h-7 px-1.5"
              title="Conciliar fatura Nubank via CSV"
            >
              <FileSpreadsheet className="h-3 w-3 mr-1 text-violet-400 shrink-0" />
              <span className="truncate">Conciliar CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenExportPdf}
              className="text-[10px] font-semibold border-violet-500/30 hover:bg-violet-500/20 text-violet-200 h-7 px-1.5"
              title="Exportar fatura em PDF"
            >
              <FileDown className="h-3 w-3 mr-1 text-violet-400 shrink-0" />
              <span className="truncate">Exportar PDF</span>
            </Button>
          </div>

          {/* Botão Pagar Fatura */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenPayInvoice}
            disabled={creditInvoice.total <= 0}
            className="w-full text-xs font-semibold border-violet-500/30 hover:bg-violet-500/20 text-violet-200 mt-1 h-8"
          >
            <Receipt className="h-3.5 w-3.5 mr-1 text-violet-400" />
            Pagar Fatura
          </Button>
        </CardContent>
      </Card>

      {/* 3. Dívidas */}
      <Card className="border-cyan-500/20 bg-gradient-to-b from-[#0e1620] to-[#090f17]">
        <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Dívidas
          </span>
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <HandCoins className="h-4 w-4" />
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-2">
          <div className="text-2xl lg:text-3xl font-extrabold text-cyan-400 tracking-tight">
            {formatCurrency(informalDebts.totalRemaining)}
          </div>

          <div className="space-y-1 pt-1 border-t border-white/[0.06]">
            {informalDebts.items.length === 0 ? (
              <span className="text-[11px] text-emerald-400">Sem dívidas ativas 🎉</span>
            ) : (
              informalDebts.items.slice(0, 2).map((debt) => {
                const remaining = Number(debt.total_amount) - Number(debt.paid_amount)
                return (
                  <div
                    key={debt.id}
                    onClick={() => onOpenAmortizeDebt(debt)}
                    className="flex justify-between items-center text-[11px] text-slate-300 hover:text-cyan-300 cursor-pointer group"
                  >
                    <span className="truncate group-hover:underline">{debt.creditor_name}</span>
                    <span className="font-mono text-cyan-400">{formatCurrency(remaining)}</span>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* 5. Total de Notinhas a Receber no ciclo */}
      <Card className="border-amber-500/20 bg-gradient-to-b from-[#1c160c] to-[#0f0b07]">
        <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Notinhas a Receber
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Users className="h-4 w-4" />
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-2">
          <div className="text-2xl lg:text-3xl font-extrabold text-amber-400 tracking-tight">
            {formatCurrency(receivables.totalPending)}
          </div>

          <div className="space-y-1 pt-1 border-t border-white/[0.06]">
            {receivables.items.length === 0 ? (
              <span className="text-[11px] text-slate-400">Nenhuma pendente no ciclo</span>
            ) : (
              receivables.items.slice(0, 2).map((rec) => (
                <div
                  key={rec.id}
                  onClick={() => onOpenSettleReceivable(rec)}
                  className="flex justify-between items-center text-[11px] text-slate-300 hover:text-amber-300 cursor-pointer group"
                >
                  <span className="truncate group-hover:underline">{rec.debtor_name}</span>
                  <span className="font-mono text-amber-400">{formatCurrency(Number(rec.amount))}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

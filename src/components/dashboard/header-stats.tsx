'use client'

import React from 'react'
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
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { BillingCycleInfo } from '@/lib/billing'
import { AccountBalance, ForecastItem, InformalDebt, Receivable } from '@/types/finance'

interface HeaderStatsProps {
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
  onOpenPayInvoice: () => void
  onOpenNewTransaction: () => void
  onOpenAmortizeDebt: (debt: InformalDebt) => void
  onOpenSettleReceivable: (rec: Receivable) => void
}

export function HeaderStats({
  checkingBalance,
  billingCycle,
  creditInvoice,
  fixedObligations,
  informalDebts,
  receivables,
  onOpenPayInvoice,
  onOpenNewTransaction,
  onOpenAmortizeDebt,
  onOpenSettleReceivable,
}: HeaderStatsProps) {
  const isLowBalance = checkingBalance < 50.0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <div
            className={`p-2 rounded-xl ${
              isLowBalance
                ? 'bg-rose-500/20 text-rose-400'
                : 'bg-emerald-500/10 text-emerald-400'
            }`}
          >
            <Wallet className="h-4 w-4" />
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-2">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl lg:text-3xl font-extrabold tracking-tight ${
                isLowBalance ? 'text-rose-400' : 'text-white'
              }`}
            >
              {formatCurrency(checkingBalance)}
            </span>
          </div>

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

      {/* 3. Obrigações Fixas (ex: Conta Mãe) */}
      <Card className="border-rose-500/20 bg-gradient-to-b from-[#180f1a] to-[#0c0910]">
        <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Obrigações Fixas
          </span>
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
            <CalendarDays className="h-4 w-4" />
          </div>
        </CardHeader>

        <CardContent className="p-4 pt-1 space-y-2">
          <div className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
            {formatCurrency(fixedObligations.total)}
          </div>

          <div className="space-y-1 pt-1 border-t border-white/[0.06]">
            {fixedObligations.items.slice(0, 2).map((item) => (
              <div key={item.id} className="flex justify-between items-center text-[11px] text-slate-400">
                <span className="truncate max-w-[120px]">{item.description}</span>
                <span className="font-mono text-slate-300">{formatCurrency(Number(item.amount))}</span>
              </div>
            ))}
            {fixedObligations.items.length > 2 && (
              <span className="text-[10px] text-slate-500 block">
                + {fixedObligations.items.length - 2} outras fixas
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Dívidas Informais (ex: Saldo devedor com o Vô) */}
      <Card className="border-cyan-500/20 bg-gradient-to-b from-[#0e1620] to-[#090f17]">
        <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Dívidas Informais
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

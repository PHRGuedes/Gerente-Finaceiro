'use client'

import React, { useState } from 'react'
import { X, Receipt, Wallet, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { payInvoiceAction } from '@/actions/finance'

interface PayInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  cycleId: string
  cycleLabel: string
  checkingBalance: number
  invoiceTotal: number
  ownExpense: number
  thirdPartyExpense: number
}

export function PayInvoiceModal({
  isOpen,
  onClose,
  cycleId,
  cycleLabel,
  checkingBalance,
  invoiceTotal,
  ownExpense,
  thirdPartyExpense,
}: PayInvoiceModalProps) {
  const [payOption, setPayOption] = useState<'total' | 'own' | 'custom'>('total')
  const [customAmount, setCustomAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const amountToPay =
    payOption === 'total'
      ? invoiceTotal
      : payOption === 'own'
      ? ownExpense
      : parseFloat(customAmount.replace(',', '.')) || 0

  const hasEnoughBalance = checkingBalance >= amountToPay

  const handlePay = async () => {
    setErrorMsg('')
    if (amountToPay <= 0) {
      setErrorMsg('Informe um valor de pagamento válido.')
      return
    }

    if (!hasEnoughBalance) {
      setErrorMsg(
        `Saldo insuficiente em conta (${formatCurrency(
          checkingBalance
        )}) para pagar ${formatCurrency(amountToPay)}.`
      )
      return
    }

    setLoading(true)
    try {
      await payInvoiceAction({
        cycleId,
        amount: amountToPay,
        description: `Pagamento de Fatura (${cycleLabel})`,
      })
      onClose()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao processar pagamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0e1422] border border-violet-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Pagar Fatura de Crédito</h2>
              <p className="text-xs text-slate-400">{cycleLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Saldo Disponível */}
          <div className="p-3 rounded-xl bg-[#131b2e] border border-white/[0.06] flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              Saldo Principal Disponível:
            </span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {formatCurrency(checkingBalance)}
            </span>
          </div>

          {/* Opções de Pagamento */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300 block">
              Escolha quanto deseja pagar:
            </label>

            {/* Total */}
            <div
              onClick={() => setPayOption('total')}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                payOption === 'total'
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-white/[0.06] bg-[#131b2e] hover:border-white/20'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-white block">
                  Valor Total da Fatura
                </span>
                <span className="text-[11px] text-slate-400">
                  Gasto próprio + Notinhas de terceiros
                </span>
              </div>
              <span className="text-sm font-bold font-mono text-white">
                {formatCurrency(invoiceTotal)}
              </span>
            </div>

            {/* Apenas Gasto Próprio */}
            <div
              onClick={() => setPayOption('own')}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                payOption === 'own'
                  ? 'border-violet-500 bg-violet-500/10'
                  : 'border-white/[0.06] bg-[#131b2e] hover:border-white/20'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-white block">
                  Apenas Meu Gasto Próprio
                </span>
                <span className="text-[11px] text-slate-400">
                  Exclui as notinhas que terceiros devem
                </span>
              </div>
              <span className="text-sm font-bold font-mono text-violet-300">
                {formatCurrency(ownExpense)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 bg-white/[0.02] p-2.5 rounded-lg border border-white/[0.05]">
            💡 <strong>Regra Financeira:</strong> Ao confirmar, o valor de{' '}
            <strong className="text-white font-mono">{formatCurrency(amountToPay)}</strong> será
            debitado do seu <strong>Saldo Principal (Pix/Conta)</strong> e registrado como quitação de fatura.
          </p>

          {/* Actions */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handlePay}
              disabled={loading || amountToPay <= 0 || !hasEnoughBalance}
              className="bg-violet-600 hover:bg-violet-500 text-white font-semibold"
            >
              {loading ? 'Processando...' : `Confirmar Pagamento (${formatCurrency(amountToPay)})`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

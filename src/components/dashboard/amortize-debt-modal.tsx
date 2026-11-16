'use client'

import React, { useState } from 'react'
import { X, HandCoins, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { InformalDebt } from '@/types/finance'
import { payInformalDebtAction } from '@/actions/finance'

interface AmortizeDebtModalProps {
  debt: InformalDebt | null
  onClose: () => void
  checkingBalance: number
}

export function AmortizeDebtModal({
  debt,
  onClose,
  checkingBalance,
}: AmortizeDebtModalProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!debt) return null

  const remainingDebt = Number(debt.total_amount) - Number(debt.paid_amount)
  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0

  const handleAmortize = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (parsedAmount <= 0) {
      setErrorMsg('Informe um valor maior que zero.')
      return
    }

    if (parsedAmount > remainingDebt) {
      setErrorMsg(`O valor não pode ser maior que o saldo devedor (${formatCurrency(remainingDebt)}).`)
      return
    }

    if (checkingBalance < parsedAmount) {
      setErrorMsg(`Saldo em conta insuficiente (${formatCurrency(checkingBalance)}).`)
      return
    }

    setLoading(true)
    try {
      await payInformalDebtAction({
        debtId: debt.id,
        amount: parsedAmount,
        creditorName: debt.creditor_name,
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
      <div className="w-full max-w-sm bg-[#0e1422] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Amortizar Dívida Informal</h2>
              <p className="text-xs text-slate-400">Credor: {debt.creditor_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleAmortize} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 space-y-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Total Contratado:</span>
              <span className="font-mono text-slate-200">{formatCurrency(Number(debt.total_amount))}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>Já Amortizado:</span>
              <span className="font-mono text-emerald-400">{formatCurrency(Number(debt.paid_amount))}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold pt-1 border-t border-cyan-500/20">
              <span className="text-cyan-200">Saldo Devedor Atual:</span>
              <span className="font-mono text-cyan-400">{formatCurrency(remainingDebt)}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Quanto deseja pagar agora? (R$)
            </label>
            <input
              type="text"
              placeholder="0,00"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500/60"
            />
          </div>

          <p className="text-[10px] text-slate-400">
            O valor será deduzido do seu <strong>Saldo Principal (Pix)</strong> e registrado como despesa de empréstimo.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.08]">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-semibold"
            >
              {loading ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import { X, Users, CheckCircle2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Receivable } from '@/types/finance'
import { markReceivablePaidAction } from '@/actions/finance'

interface SettleReceivableModalProps {
  receivable: Receivable | null
  onClose: () => void
}

export function SettleReceivableModal({
  receivable,
  onClose,
}: SettleReceivableModalProps) {
  const [creditToBalance, setCreditToBalance] = useState(true)
  const [loading, setLoading] = useState(false)

  if (!receivable) return null

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await markReceivablePaidAction({
        receivableId: receivable.id,
        amount: Number(receivable.amount),
        debtorName: receivable.debtor_name,
        creditToBalance,
      })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-[#0e1422] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Dar Baixa na Notinha</h2>
              <p className="text-xs text-slate-400">{receivable.debtor_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center space-y-1">
            <span className="text-xs text-slate-400 block">{receivable.description}</span>
            <div className="text-2xl font-extrabold text-amber-400 font-mono">
              {formatCurrency(Number(receivable.amount))}
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none p-3 rounded-xl bg-[#131b2e] border border-white/[0.06]">
            <input
              type="checkbox"
              checked={creditToBalance}
              onChange={(e) => setCreditToBalance(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50 h-4 w-4"
            />
            <span className="text-xs text-slate-200 font-medium">
              Creditar este valor no meu <strong>Saldo Principal (Pix)</strong> agora?
            </span>
          </label>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.08]">
            <Button variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
            >
              {loading ? 'Confirmando...' : 'Confirmar Recebimento'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

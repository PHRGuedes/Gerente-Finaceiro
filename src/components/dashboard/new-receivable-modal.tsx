'use client'

import React, { useState } from 'react'
import { X, Users, PlusCircle, CreditCard, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createReceivableAction } from '@/actions/finance'

interface NewReceivableModalProps {
  isOpen: boolean
  onClose: () => void
  currentCycleId: string
}

export function NewReceivableModal({
  isOpen,
  onClose,
  currentCycleId,
}: NewReceivableModalProps) {
  const [debtorName, setDebtorName] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [installmentCurrent, setInstallmentCurrent] = useState('1')
  const [installmentTotal, setInstallmentTotal] = useState('1')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  const frequentDebtors = ['Luiza', 'Nalyne', 'Yara', 'Marcos', 'Lucas']

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.')
      return
    }

    if (!debtorName.trim()) {
      setErrorMsg('Informe o nome da pessoa que deve a notinha.')
      return
    }

    if (!description.trim()) {
      setErrorMsg('Informe a descrição da compra.')
      return
    }

    setLoading(true)
    try {
      await createReceivableAction({
        debtor_name: debtorName.trim(),
        description: description.trim(),
        amount: parsedAmount,
        installment_current: parseInt(installmentCurrent, 10) || 1,
        installment_total: parseInt(installmentTotal, 10) || 1,
        billing_cycle: currentCycleId,
      })

      setDebtorName('')
      setDescription('')
      setAmount('')
      setInstallmentCurrent('1')
      setInstallmentTotal('1')
      onClose()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao cadastrar notinha')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0e1422] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Nova Notinha a Receber</h2>
              <p className="text-xs text-slate-400">Compras passadas no cartão para terceiros</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Sugestões de pessoas frequentes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Pessoa que deve (Devedor)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {frequentDebtors.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setDebtorName(name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    debtorName.toLowerCase() === name.toLowerCase()
                      ? 'bg-amber-500 text-black border-amber-500 font-bold'
                      : 'bg-white/[0.03] text-slate-300 border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
            <input
              type="text"
              required
              placeholder="Digite o nome da pessoa (ex: Luiza, Nalyne, Yara)..."
              value={debtorName}
              onChange={(e) => setDebtorName(e.target.value)}
              className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Descrição da Compra
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Biquíni Shein, Jantar Outback, Camisa..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Valor por Parcela */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Valor da Parcela (R$)
            </label>
            <input
              type="text"
              required
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Parcelamento: Atual e Total (ex: 2/10) */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Parcela Atual
              </label>
              <input
                type="number"
                min="1"
                value={installmentCurrent}
                onChange={(e) => setInstallmentCurrent(e.target.value)}
                className="w-full bg-[#111726] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Total de Parcelas
              </label>
              <input
                type="number"
                min="1"
                value={installmentTotal}
                onChange={(e) => setInstallmentTotal(e.target.value)}
                className="w-full bg-[#111726] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            💡 O <strong>Motor de Parcelamento</strong> projetará automaticamente as parcelas futuras ({installmentCurrent}/{installmentTotal} até {installmentTotal}/{installmentTotal}) nos ciclos seguintes!
          </p>

          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold"
            >
              {loading ? 'Criando parcelas...' : 'Cadastrar Notinha'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

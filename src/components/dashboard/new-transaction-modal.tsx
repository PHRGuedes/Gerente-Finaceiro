'use client'

import React, { useState } from 'react'
import {
  X,
  PlusCircle,
  QrCode,
  CreditCard,
  Banknote,
  Users,
  Calendar,
  DollarSign,
  Tag,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Category } from '@/types/finance'
import { PaymentMethod, TransactionType } from '@/types/database.types'
import { createTransactionAction } from '@/actions/finance'

interface NewTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
}

export function NewTransactionModal({
  isOpen,
  onClose,
  categories,
}: NewTransactionModalProps) {
  const [type, setType] = useState<TransactionType>('expense')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [category, setCategory] = useState('')
  const [isThirdParty, setIsThirdParty] = useState(false)
  const [debtorName, setDebtorName] = useState('')
  const [installmentTotal, setInstallmentTotal] = useState('1')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  if (!isOpen) return null

  // Filtra categorias apropriadas para o tipo
  const availableCategories = categories.filter(
    (c) => c.type === 'both' || c.type === type
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    const parsedAmount = parseFloat(amount.replace(',', '.'))
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Informe um valor válido maior que zero.')
      return
    }

    if (!description.trim()) {
      setErrorMsg('Informe a descrição do lançamento.')
      return
    }

    if (!category) {
      setErrorMsg('Selecione uma categoria.')
      return
    }

    if (isThirdParty && !debtorName.trim()) {
      setErrorMsg('Informe o nome de quem deve a notinha.')
      return
    }

    setLoading(true)
    try {
      await createTransactionAction({
        type,
        description,
        amount: parsedAmount,
        date,
        payment_method: paymentMethod,
        category,
        is_third_party: isThirdParty,
        debtor_name: isThirdParty ? debtorName : null,
        installment_current: 1,
        installment_total: parseInt(installmentTotal, 10) || 1,
      })

      // Reset form
      setDescription('')
      setAmount('')
      setIsThirdParty(false)
      setDebtorName('')
      onClose()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar transação')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-[#0e1422] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <PlusCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Novo Lançamento</h2>
              <p className="text-xs text-slate-400">Cadastre despesas, receitas ou notinhas</p>
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
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Tipo: Despesa ou Receita */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#151c2e] rounded-xl border border-white/[0.06]">
            <button
              type="button"
              onClick={() => {
                setType('expense')
                setCategory('')
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Despesa
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income')
                setCategory('')
                setIsThirdParty(false)
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Receita
            </button>
          </div>

          {/* Valor & Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Valor (R$)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-xs">
                  R$
                </span>
                <input
                  type="text"
                  placeholder="0,00"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Data do Lançamento
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500/60"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Descrição
            </label>
            <input
              type="text"
              placeholder="Ex: Supermercado, Almoço de domingo, etc."
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
            />
          </div>

          {/* Meio de Pagamento */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Meio de Pagamento
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('pix')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'pix'
                    ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300'
                    : 'border-white/[0.06] bg-[#151c2e] text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="h-3.5 w-3.5 text-emerald-400" />
                Pix (Conta)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('credit')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'credit'
                    ? 'border-violet-500/60 bg-violet-500/10 text-violet-300'
                    : 'border-white/[0.06] bg-[#151c2e] text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5 text-violet-400" />
                Crédito (Fatura)
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('cash')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  paymentMethod === 'cash'
                    ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                    : 'border-white/[0.06] bg-[#151c2e] text-slate-400 hover:text-white'
                }`}
              >
                <Banknote className="h-3.5 w-3.5 text-amber-400" />
                Dinheiro
              </button>
            </div>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Categoria
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
              className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/60"
            >
              <option value="">Selecione uma categoria...</option>
              {availableCategories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Opção de Compra de Terceiros / Notinha (apenas para despesas) */}
          {type === 'expense' && (
            <div className="pt-2 border-t border-white/[0.06] space-y-3">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isThirdParty}
                  onChange={(e) => setIsThirdParty(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50 h-4 w-4"
                />
                <span className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                  É compra de terceiro / Notinha para receber depois?
                </span>
              </label>

              {isThirdParty && (
                <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-medium text-amber-200 mb-1">
                      Nome de quem deve (Devedor)
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: Marcos (Amigo), Lucas, etc."
                      value={debtorName}
                      onChange={(e) => setDebtorName(e.target.value)}
                      required={isThirdParty}
                      className="w-full bg-[#111726] border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <p className="text-[10px] text-amber-400/80">
                    O sistema adicionará automaticamente esta quantia na aba de <strong>Recebíveis</strong> do ciclo atual!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botão de Envio */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? 'Salvando...' : 'Confirmar Lançamento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

'use client'

import React, { useState } from 'react'
import {
  X,
  PlusCircle,
  Edit2,
  QrCode,
  CreditCard,
  Banknote,
  Users,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Category, Transaction } from '@/types/finance'
import { PaymentMethod, TransactionType } from '@/types/database.types'
import { createTransactionAction, updateTransactionAction } from '@/actions/finance'
import { getCycleForDate, addMonthsToCycle } from '@/lib/billing'

interface NewTransactionModalProps {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  editingTransaction?: Transaction | null
  currentCycleId?: string
  currentCycleLabel?: string
}

export function NewTransactionModal({
  isOpen,
  onClose,
  categories,
  editingTransaction = null,
  currentCycleId,
  currentCycleLabel,
}: NewTransactionModalProps) {
  const initialTotalVal = editingTransaction ? Number(editingTransaction.amount) : 0
  const initialTpVal =
    editingTransaction && editingTransaction.third_party_amount
      ? Number(editingTransaction.third_party_amount)
      : initialTotalVal
  const initialIsPartial =
    Boolean(editingTransaction?.is_third_party) &&
    initialTpVal > 0 &&
    initialTpVal < initialTotalVal

  const [type, setType] = useState<TransactionType>(editingTransaction?.type || 'expense')
  const [description, setDescription] = useState(editingTransaction?.description || '')
  const [amount, setAmount] = useState(
    editingTransaction ? String(editingTransaction.amount).replace('.', ',') : ''
  )
  const [date, setDate] = useState(
    () => editingTransaction?.date || new Date().toISOString().split('T')[0]
  )
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    editingTransaction?.payment_method || 'pix'
  )
  const [category, setCategory] = useState(editingTransaction?.category || '')
  const [isThirdParty, setIsThirdParty] = useState(
    Boolean(editingTransaction?.is_third_party)
  )
  const [debtorName, setDebtorName] = useState(editingTransaction?.debtor_name || '')
  const [splitMode, setSplitMode] = useState<'full' | 'partial'>(
    initialIsPartial ? 'partial' : 'full'
  )
  const [thirdPartyAmount, setThirdPartyAmount] = useState(
    initialIsPartial ? String(initialTpVal).replace('.', ',') : ''
  )
  const [installmentCurrent, setInstallmentCurrent] = useState(
    String(editingTransaction?.installment_current || 1)
  )
  const [installmentTotal, setInstallmentTotal] = useState(
    String(editingTransaction?.installment_total || 1)
  )
  const defaultCycle =
    editingTransaction?.billing_cycle ||
    currentCycleId ||
    getCycleForDate(date)
  const [selectedCycleId, setSelectedCycleId] = useState(defaultCycle)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const cycleOptions = React.useMemo(() => {
    const base = currentCycleId || getCycleForDate(date)
    return [-2, -1, 0, 1, 2, 3].map((offset) => {
      const c = addMonthsToCycle(base, offset)
      let tag = ''
      if (offset === 0) tag = ' (Atual / Visualizada)'
      else if (offset === 1) tag = ' (Próxima Fatura)'
      else if (offset === -1) tag = ' (Fatura Anterior)'
      return {
        id: c.cycleId,
        label: `${c.label}${tag}`,
        cleanLabel: c.label,
      }
    })
  }, [currentCycleId, date])

  if (!isOpen) return null

  const isEditing = Boolean(editingTransaction)
  const frequentDebtors = ['Luiza', 'Nalyne', 'Yara', 'Marcos', 'Lucas']
  const parsedAmount = parseFloat(amount.replace(',', '.')) || 0

  const availableCategories = categories.filter(
    (c) => c.type === 'both' || c.type === type
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

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

    let finalThirdPartyAmount: number | null = null

    if (isThirdParty) {
      if (!debtorName.trim()) {
        setErrorMsg('Informe o nome de quem deve a notinha.')
        return
      }

      if (splitMode === 'partial') {
        const parsedTP = parseFloat(thirdPartyAmount.replace(',', '.'))
        if (isNaN(parsedTP) || parsedTP <= 0) {
          setErrorMsg('Informe um valor válido para a parte da notinha.')
          return
        }
        if (parsedTP >= parsedAmount) {
          setErrorMsg(
            'Na compra dividida, o valor da notinha deve ser menor que o total da compra. Se o valor for 100% de terceiros, selecione a opção "100% Notinha".'
          )
          return
        }
        finalThirdPartyAmount = parsedTP
      } else {
        finalThirdPartyAmount = parsedAmount
      }
    }

    const cur = parseInt(installmentCurrent, 10) || 1
    const tot = parseInt(installmentTotal, 10) || 1

    if (cur > tot) {
      setErrorMsg('A parcela atual não pode ser maior que o total de parcelas.')
      return
    }

    setLoading(true)
    try {
      if (editingTransaction) {
        await updateTransactionAction(editingTransaction.id, {
          type,
          description,
          amount: parsedAmount,
          date,
          payment_method: paymentMethod,
          category,
          is_third_party: isThirdParty,
          debtor_name: isThirdParty ? debtorName.trim() : null,
          third_party_amount: finalThirdPartyAmount,
        })
      } else {
        await createTransactionAction({
          type,
          description,
          amount: parsedAmount,
          date,
          payment_method: paymentMethod,
          category,
          is_third_party: isThirdParty,
          debtor_name: isThirdParty ? debtorName.trim() : null,
          third_party_amount: finalThirdPartyAmount,
          installment_current: cur,
          installment_total: tot,
          billing_cycle: paymentMethod === 'credit' ? selectedCycleId : undefined,
        })
      }

      // Reset
      setDescription('')
      setAmount('')
      setIsThirdParty(false)
      setDebtorName('')
      setSplitMode('full')
      setThirdPartyAmount('')
      setInstallmentCurrent('1')
      setInstallmentTotal('1')
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
              {isEditing ? <Edit2 className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}
              </h2>
              <p className="text-xs text-slate-400">
                {isEditing
                  ? 'Atualize descrição, valor, categoria ou divisão de notinha'
                  : 'Despesas, receitas, parcelas e notinhas'}
              </p>
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
                setInstallmentTotal('1')
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
                Valor por Parcela (R$)
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

          {/* Parcelamento no Crédito (Motor de Parcelamento) */}
          {paymentMethod === 'credit' && type === 'expense' && !isEditing && (
            <div className="p-3.5 rounded-xl bg-violet-500/5 border border-violet-500/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-violet-300 flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-violet-400" />
                  Motor de Parcelamento no Crédito
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-mono">
                  Crédito
                </span>
              </div>

              {/* Fatura de Destino da Parcela Atual */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Fatura de Destino (Onde entra a parcela atual)
                </label>
                <select
                  value={selectedCycleId}
                  onChange={(e) => setSelectedCycleId(e.target.value)}
                  className="w-full bg-[#111726] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-violet-500/60"
                >
                  {cycleOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Parcela Atual
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        const val = Math.max(1, (parseInt(installmentCurrent, 10) || 1) - 1)
                        setInstallmentCurrent(String(val))
                      }}
                      className="h-8 w-8 rounded-l-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer select-none"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={installmentTotal}
                      value={installmentCurrent}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setInstallmentCurrent(e.target.value)}
                      className="w-full text-center bg-[#111726] border-y border-white/[0.08] h-8 text-xs text-white font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const tot = parseInt(installmentTotal, 10) || 1
                        const val = Math.min(tot, (parseInt(installmentCurrent, 10) || 1) + 1)
                        setInstallmentCurrent(String(val))
                      }}
                      className="h-8 w-8 rounded-r-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer select-none"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Total de Parcelas
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        const val = Math.max(1, (parseInt(installmentTotal, 10) || 1) - 1)
                        setInstallmentTotal(String(val))
                        if ((parseInt(installmentCurrent, 10) || 1) > val) {
                          setInstallmentCurrent(String(val))
                        }
                      }}
                      className="h-8 w-8 rounded-l-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer select-none"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="48"
                      value={installmentTotal}
                      onWheel={(e) => e.currentTarget.blur()}
                      onChange={(e) => setInstallmentTotal(e.target.value)}
                      className="w-full text-center bg-[#111726] border-y border-white/[0.08] h-8 text-xs text-white font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = (parseInt(installmentTotal, 10) || 1) + 1
                        setInstallmentTotal(String(val))
                      }}
                      className="h-8 w-8 rounded-r-lg bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 flex items-center justify-center font-bold text-sm transition-colors cursor-pointer select-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-[11px] text-violet-300 space-y-1">
                <p>
                  📌 A parcela <strong className="text-white font-mono">{installmentCurrent}/{installmentTotal}</strong> entrará na{' '}
                  <span className="font-semibold text-emerald-300">
                    {cycleOptions.find((c) => c.id === selectedCycleId)?.cleanLabel || selectedCycleId}
                  </span>.
                </p>
                {parseInt(installmentTotal, 10) > parseInt(installmentCurrent, 10) && (
                  <p className="text-[10px] text-slate-400">
                    As parcelas subsequentes ({(parseInt(installmentCurrent, 10) || 1) + 1} a {installmentTotal}) serão projetadas mês a mês automaticamente nas próximas faturas.
                  </p>
                )}
              </div>
            </div>
          )}

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
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500/50 h-4 w-4"
                />
                <span className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                  É compra de terceiro / Notinha para receber depois?
                </span>
              </label>

              {isThirdParty && (
                <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-medium text-amber-200 mb-1">
                      Pessoa que deve (Devedor)
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {frequentDebtors.map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setDebtorName(name)}
                          className={`px-2.5 py-0.5 rounded-md text-xs font-medium border transition-all ${
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
                      placeholder="Digite o nome da pessoa (ex: Luiza, Nalyne, Yara)..."
                      value={debtorName}
                      onChange={(e) => setDebtorName(e.target.value)}
                      required={isThirdParty}
                      className="w-full bg-[#111726] border border-amber-500/30 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Como o valor é dividido: 100% ou Apenas uma parte */}
                  <div className="space-y-1.5 pt-2 border-t border-amber-500/20">
                    <label className="block text-[11px] font-medium text-amber-200">
                      Divisão do Valor
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#111726] rounded-xl border border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setSplitMode('full')}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                          splitMode === 'full'
                            ? 'bg-amber-500 text-black font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        100% Notinha
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSplitMode('partial')
                          if (!thirdPartyAmount && parsedAmount > 0) {
                            setThirdPartyAmount((parsedAmount / 2).toFixed(2).replace('.', ','))
                          }
                        }}
                        className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                          splitMode === 'partial'
                            ? 'bg-amber-500 text-black font-bold shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Dividido (Parte minha, parte notinha)
                      </button>
                    </div>
                  </div>

                  {/* Se for dividido, exibe o campo da parte da notinha + cálculo automático da minha parte */}
                  {splitMode === 'partial' && (
                    <div className="p-3 rounded-xl bg-[#0b101d] border border-amber-500/30 space-y-2.5 animate-in fade-in">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <label className="text-[11px] font-semibold text-amber-300">
                          Valor da Notinha ({debtorName || 'Terceiro'}):
                        </label>
                        {parsedAmount > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setThirdPartyAmount(
                                (parsedAmount / 2).toFixed(2).replace('.', ',')
                              )
                            }
                            className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 cursor-pointer transition-colors"
                          >
                            50% cada (R$ {(parsedAmount / 2).toFixed(2).replace('.', ',')})
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400">
                          R$
                        </span>
                        <input
                          type="text"
                          placeholder="0,00"
                          value={thirdPartyAmount}
                          onChange={(e) => setThirdPartyAmount(e.target.value)}
                          className="w-full bg-[#151c2e] border border-amber-500/40 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white font-mono font-semibold focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      {/* Card de Resumo Matemático em Tempo Real */}
                      <div className="p-2.5 rounded-lg bg-black/40 border border-white/[0.06] space-y-1.5 text-xs">
                        <div className="flex justify-between items-center text-slate-300">
                          <span>Total da Compra:</span>
                          <strong className="font-mono text-white">
                            {formatCurrency(parsedAmount || 0)}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center text-amber-400">
                          <span>• Notinha ({debtorName || 'Terceiro'}):</span>
                          <strong className="font-mono">
                            {formatCurrency(
                              parseFloat(thirdPartyAmount.replace(',', '.')) || 0
                            )}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center text-emerald-400 font-semibold border-t border-white/[0.08] pt-1.5">
                          <span>• Meu Gasto Próprio:</span>
                          <strong className="font-mono">
                            {formatCurrency(
                              Math.max(
                                0,
                                (parsedAmount || 0) -
                                  (parseFloat(thirdPartyAmount.replace(',', '.')) || 0)
                              )
                            )}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-amber-400/80">
                    A notinha será sincronizada automaticamente na aba <strong>Notinhas a Receber</strong> com todas as suas parcelas!
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
              {loading
                ? 'Salvando...'
                : isEditing
                ? 'Salvar Alterações'
                : 'Confirmar Lançamento'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

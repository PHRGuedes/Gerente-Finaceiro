'use client'

import React, { useState } from 'react'
import {
  HandCoins,
  PlusCircle,
  CheckCircle2,
  DollarSign,
  AlertCircle,
  FileText,
  Trash2,
  Edit2,
  QrCode,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { InformalDebt } from '@/types/finance'
import {
  payInformalDebtAction,
  createInformalDebtAction,
  updateInformalDebtAction,
  deleteInformalDebtAction,
} from '@/actions/finance'

interface DebtsManagerProps {
  debts: InformalDebt[]
  checkingBalance: number
}

export function DebtsManager({ debts, checkingBalance }: DebtsManagerProps) {
  // Modal de Abatimento
  const [selectedDebtToPay, setSelectedDebtToPay] = useState<InformalDebt | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [loadingPay, setLoadingPay] = useState(false)
  const [payError, setPayError] = useState('')

  // Modal de Nova Dívida
  const [isNewDebtOpen, setIsNewDebtOpen] = useState(false)
  const [creditorName, setCreditorName] = useState('')
  const [totalAmount, setTotalAmount] = useState('')
  const [initialPaid, setInitialPaid] = useState('')
  const [notes, setNotes] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [hasNoDueDate, setHasNoDueDate] = useState(true)
  const [loadingNew, setLoadingNew] = useState(false)
  const [newError, setNewError] = useState('')

  // Modal de Edição de Dívida
  const [editingDebt, setEditingDebt] = useState<InformalDebt | null>(null)
  const [editCreditorName, setEditCreditorName] = useState('')
  const [editTotalAmount, setEditTotalAmount] = useState('')
  const [editPaidAmount, setEditPaidAmount] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editHasNoDueDate, setEditHasNoDueDate] = useState(true)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  const [feedback, setFeedback] = useState<string | null>(null)

  // Sanitizador monetário: bloqueia letras e aceita apenas números e uma vírgula
  const handleAmountChange = (val: string, setter: (v: string) => void) => {
    const clean = val.replace(/[^0-9.,]/g, '')
    let normalized = clean.replace(/\./g, ',')
    const parts = normalized.split(',')
    if (parts.length > 2) {
      normalized = `${parts[0]},${parts.slice(1).join('')}`
    }
    setter(normalized)
  }

  // Cálculos consolidados
  const totalOriginalAll = debts.reduce((acc, d) => acc + Number(d.total_amount), 0)
  const totalPaidAll = debts.reduce((acc, d) => acc + Number(d.paid_amount), 0)
  const totalRemainingAll = totalOriginalAll - totalPaidAll
  const overallProgress = totalOriginalAll > 0 ? (totalPaidAll / totalOriginalAll) * 100 : 100

  // Executar Abatimento (Pix)
  const handleConfirmAbatimento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDebtToPay) return
    setPayError('')

    const parsed = parseFloat(payAmount.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) {
      setPayError('Informe um valor de abatimento válido maior que zero.')
      return
    }

    const remaining = Number(selectedDebtToPay.total_amount) - Number(selectedDebtToPay.paid_amount)
    if (parsed > remaining) {
      setPayError(`O valor não pode ser maior que o saldo devedor (${formatCurrency(remaining)}).`)
      return
    }

    if (checkingBalance < parsed) {
      setPayError(`Saldo em conta insuficiente (${formatCurrency(checkingBalance)}).`)
      return
    }

    setLoadingPay(true)
    try {
      await payInformalDebtAction({
        debtId: selectedDebtToPay.id,
        amount: parsed,
        creditorName: selectedDebtToPay.creditor_name,
      })

      setFeedback(
        `Abatimento de ${formatCurrency(parsed)} registrado para ${selectedDebtToPay.creditor_name} com sucesso! Valor descontado do Saldo Principal (Pix).`
      )
      setSelectedDebtToPay(null)
      setPayAmount('')
      setTimeout(() => setFeedback(null), 5000)
    } catch (err: unknown) {
      setPayError(err instanceof Error ? err.message : 'Erro ao processar abatimento.')
    } finally {
      setLoadingPay(false)
    }
  }

  // Criar Nova Dívida
  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    setNewError('')

    const parsedTotal = parseFloat(totalAmount.replace(',', '.'))
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      setNewError('Informe um valor total válido maior que zero.')
      return
    }

    const parsedPaid = initialPaid ? parseFloat(initialPaid.replace(',', '.')) || 0 : 0

    if (!creditorName.trim()) {
      setNewError('Informe o nome da pessoa / credor.')
      return
    }

    if (!hasNoDueDate && !dueDate) {
      setNewError('Informe a data de vencimento/pagamento ou marque a opção "Sem data definida".')
      return
    }

    setLoadingNew(true)
    try {
      await createInformalDebtAction({
        creditor_name: creditorName.trim(),
        total_amount: parsedTotal,
        paid_amount: parsedPaid,
        notes: notes.trim() || undefined,
        due_date: hasNoDueDate ? null : (dueDate || null),
      })

      setFeedback(`Dívida com ${creditorName} cadastrada com sucesso!`)
      setIsNewDebtOpen(false)
      setCreditorName('')
      setTotalAmount('')
      setInitialPaid('')
      setNotes('')
      setDueDate('')
      setHasNoDueDate(true)
      setTimeout(() => setFeedback(null), 5000)
    } catch (err: unknown) {
      setNewError(err instanceof Error ? err.message : 'Erro ao cadastrar dívida.')
    } finally {
      setLoadingNew(false)
    }
  }

  const handleOpenEditDebt = (debt: InformalDebt) => {
    setEditingDebt(debt)
    setEditCreditorName(debt.creditor_name)
    setEditTotalAmount(String(debt.total_amount).replace('.', ','))
    setEditPaidAmount(String(debt.paid_amount || 0).replace('.', ','))
    setEditNotes(debt.notes || '')
    if (debt.due_date) {
      setEditDueDate(debt.due_date)
      setEditHasNoDueDate(false)
    } else {
      setEditDueDate('')
      setEditHasNoDueDate(true)
    }
    setEditError('')
  }

  const handleUpdateDebt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingDebt) return
    setEditError('')

    const parsedTotal = parseFloat(editTotalAmount.replace(',', '.'))
    if (isNaN(parsedTotal) || parsedTotal <= 0) {
      setEditError('Informe um valor total válido maior que zero.')
      return
    }

    const parsedPaid = editPaidAmount ? parseFloat(editPaidAmount.replace(',', '.')) || 0 : 0
    if (parsedPaid > parsedTotal) {
      setEditError('O valor já pago não pode ser maior que o valor total da dívida.')
      return
    }

    if (!editCreditorName.trim()) {
      setEditError('Informe o nome da pessoa / credor.')
      return
    }

    if (!editHasNoDueDate && !editDueDate) {
      setEditError('Informe a data de vencimento/pagamento ou marque a opção "Sem data".')
      return
    }

    setLoadingEdit(true)
    try {
      await updateInformalDebtAction(editingDebt.id, {
        creditor_name: editCreditorName.trim(),
        total_amount: parsedTotal,
        paid_amount: parsedPaid,
        notes: editNotes.trim() || null,
        due_date: editHasNoDueDate ? null : (editDueDate || null),
      })

      setFeedback(`Dívida com ${editCreditorName} atualizada com sucesso!`)
      setEditingDebt(null)
      setTimeout(() => setFeedback(null), 5000)
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Erro ao atualizar dívida.')
    } finally {
      setLoadingEdit(false)
    }
  }

  const handleDeleteDebt = async (id: string, name: string) => {
    if (!confirm(`Deseja realmente excluir o registro de dívida com ${name}?`)) return
    await deleteInformalDebtAction(id)
  }

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Topo: KPIs de Dívidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Saldo Devedor Restante */}
        <Card className="border-cyan-500/30 bg-gradient-to-b from-[#0c1824] to-[#070e17]">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              Saldo Devedor Total
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <HandCoins className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl lg:text-3xl font-extrabold text-cyan-300 font-mono tracking-tight">
              {formatCurrency(totalRemainingAll)}
            </div>
            <p className="text-[11px] text-slate-400">Restante para quitação integral</p>
          </CardContent>
        </Card>

        {/* Total Já Abatido */}
        <Card className="border-emerald-500/20 bg-gradient-to-b from-[#0e1c14] to-[#070e0a]">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Total Já Abatido
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl lg:text-3xl font-extrabold text-emerald-400 font-mono tracking-tight">
              {formatCurrency(totalPaidAll)}
            </div>
            <p className="text-[11px] text-slate-400">
              {overallProgress.toFixed(1)}% do valor original quitado
            </p>
          </CardContent>
        </Card>

        {/* Valor Original Contratado */}
        <Card className="border-white/[0.08] bg-gradient-to-b from-[#141a29] to-[#0a0f1a]">
          <CardHeader className="p-4 pb-1 flex flex-row items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Valor Original Total
            </span>
            <div className="p-2 rounded-xl bg-white/[0.05] text-slate-300">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1">
            <div className="text-2xl lg:text-3xl font-extrabold text-white font-mono tracking-tight">
              {formatCurrency(totalOriginalAll)}
            </div>
            <p className="text-[11px] text-slate-400">{debts.length} credor(es) cadastrado(s)</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid de Cards Individuais de Dívidas (ex: Vô) */}
      <Card className="border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-xl">
        <CardHeader className="p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
                <HandCoins className="h-5 w-5 text-cyan-400" />
                Dívidas
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Acompanhe o saldo devedor e registre abatimentos diretamente via Pix
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={() => setIsNewDebtOpen(true)}
              className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold shadow-lg shadow-cyan-500/20 self-start sm:self-auto flex items-center gap-1.5"
            >
              <PlusCircle className="h-4 w-4 text-black" />
              <span>Nova Dívida</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 pt-2">
          {debts.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="h-12 w-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">Você não possui dívidas ativas!</p>
              <p className="text-xs text-slate-400">
                Se precisar registrar algum valor a pagar, use o botão &quot;+ Nova Dívida&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {debts.map((debt) => {
                const total = Number(debt.total_amount)
                const paid = Number(debt.paid_amount)
                const remaining = total - paid
                const isPaidOff = remaining <= 0
                const progress = total > 0 ? (paid / total) * 100 : 100

                return (
                  <div
                    key={debt.id}
                    className="p-5 rounded-2xl border border-white/[0.08] bg-[#0e1624] space-y-4 hover:border-cyan-500/30 transition-all group"
                  >
                    {/* Header do Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-base text-white">{debt.creditor_name}</h4>
                          {isPaidOff ? (
                            <Badge variant="success" className="text-[10px] shrink-0">
                              100% Quitado
                            </Badge>
                          ) : (
                            <Badge variant="info" className="text-[10px] shrink-0">
                              Em Aberto
                            </Badge>
                          )}

                          {/* Data de Vencimento / Prazo */}
                          {debt.due_date ? (
                            (() => {
                              const todayStr = new Date().toISOString().split('T')[0]
                              const isOverdue = !isPaidOff && debt.due_date < todayStr
                              const todayDate = new Date()
                              todayDate.setHours(0, 0, 0, 0)
                              const [y, m, d] = debt.due_date.split('-').map(Number)
                              const dueObj = new Date(y, m - 1, d)
                              const diffDays = Math.ceil(
                                (dueObj.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24)
                              )

                              if (isPaidOff) {
                                return (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.08] shrink-0 whitespace-nowrap">
                                    <Calendar className="h-3 w-3 text-slate-500" />
                                    Vencia em {formatDate(debt.due_date)}
                                  </span>
                                )
                              }

                              if (isOverdue) {
                                return (
                                  <Badge className="bg-rose-500/15 border-rose-500/30 text-rose-300 text-[10px] flex items-center gap-1 font-semibold shrink-0 whitespace-nowrap">
                                    <AlertTriangle className="h-3 w-3 text-rose-400" />
                                    Venceu em {formatDate(debt.due_date)}
                                  </Badge>
                                )
                              }

                              if (diffDays <= 7 && diffDays >= 0) {
                                return (
                                  <Badge className="bg-amber-500/15 border-amber-500/30 text-amber-300 text-[10px] flex items-center gap-1 font-semibold shrink-0 whitespace-nowrap">
                                    <Clock className="h-3 w-3 text-amber-400" />
                                    Vence em breve ({formatDate(debt.due_date)})
                                  </Badge>
                                )
                              }

                              return (
                                <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20 shrink-0 whitespace-nowrap">
                                  <Calendar className="h-3 w-3 text-cyan-400" />
                                  Vence em {formatDate(debt.due_date)}
                                </span>
                              )
                            })()
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-white/[0.03] px-2 py-0.5 rounded-md border border-white/[0.06] shrink-0 whitespace-nowrap">
                              <Clock className="h-3 w-3 text-slate-500" />
                              Sem prazo definido
                            </span>
                          )}
                        </div>

                        {debt.notes && (
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <FileText className="h-3 w-3 text-slate-500 shrink-0" />
                            <span>{debt.notes}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          onClick={() => handleOpenEditDebt(debt)}
                          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all cursor-pointer shrink-0"
                          title="Editar dívida"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteDebt(debt.id, debt.creditor_name)}
                          className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
                          title="Excluir dívida"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Os 3 Valores solicitados: Original, Abatido, Devedor Atual */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-black/30 border border-white/[0.06] text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-medium block">
                          Original
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-slate-300">
                          {formatCurrency(total)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-400 uppercase font-medium block">
                          Já Abatido
                        </span>
                        <span className="text-xs sm:text-sm font-bold font-mono text-emerald-400">
                          {formatCurrency(paid)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-cyan-400 uppercase font-bold block">
                          Saldo Devedor
                        </span>
                        <span className="text-xs sm:text-sm font-extrabold font-mono text-cyan-300">
                          {formatCurrency(remaining)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso de Quitação */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>Progresso de amortização:</span>
                        <span className="text-cyan-300 font-bold">{progress.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 w-full bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                        />
                      </div>
                    </div>

                    {/* Botão de Ação: Registrar Abatimento (Pix) */}
                    <div className="pt-1">
                      {!isPaidOff ? (
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedDebtToPay(debt)
                            setPayAmount('')
                            setPayError('')
                          }}
                          className="w-full bg-cyan-500 hover:bg-cyan-400 text-black font-bold h-9 text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-500/20 cursor-pointer"
                        >
                          <QrCode className="h-3.5 w-3.5 text-black" />
                          <span>Registrar Abatimento (Pix)</span>
                        </Button>
                      ) : (
                        <div className="w-full py-2 text-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 rounded-xl border border-emerald-500/20 flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          Dívida Totalmente Paga!
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal: Registrar Abatimento (Pix) */}
      {selectedDebtToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0e1422] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <HandCoins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registrar Abatimento (Pix)</h3>
                  <p className="text-xs text-slate-400">Credor: {selectedDebtToPay.creditor_name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDebtToPay(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmAbatimento} className="p-5 space-y-4">
              {payError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {payError}
                </div>
              )}

              {/* Detalhes de Saldo */}
              <div className="p-3 rounded-xl bg-black/30 border border-white/[0.06] space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Saldo Devedor Atual:</span>
                  <span className="font-mono text-cyan-400 font-bold">
                    {formatCurrency(
                      Number(selectedDebtToPay.total_amount) - Number(selectedDebtToPay.paid_amount)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Seu Saldo em Conta:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {formatCurrency(checkingBalance)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Valor do Abatimento (R$)
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: 400,00"
                  value={payAmount}
                  onChange={(e) => handleAmountChange(e.target.value, setPayAmount)}
                  className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                💡 <strong>Regra:</strong> O valor será descontado diretamente do seu{' '}
                <strong>Saldo Principal (Conta Corrente / Pix)</strong> e diminuirá o saldo com o{' '}
                {selectedDebtToPay.creditor_name}.
              </p>

              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDebtToPay(null)}
                  disabled={loadingPay}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loadingPay}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
                >
                  {loadingPay ? 'Processando Pix...' : 'Confirmar Abatimento'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Nova Dívida Informal */}
      {isNewDebtOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0e1422] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nova Dívida</h3>
                  <p className="text-xs text-slate-400">Cadastre uma dívida e credor</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewDebtOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDebt} className="p-5 space-y-4">
              {newError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                  {newError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pessoa / Credor
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do credor..."
                  value={creditorName}
                  onChange={(e) => setCreditorName(e.target.value)}
                  className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Valor Total (R$)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={totalAmount}
                    onChange={(e) => handleAmountChange(e.target.value, setTotalAmount)}
                    className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Já Abatido (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={initialPaid}
                    onChange={(e) => handleAmountChange(e.target.value, setInitialPaid)}
                    className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              {/* Data Prevista de Pagamento e Checkbox 'Sem data' */}
              <div className="space-y-2 p-3 rounded-xl bg-black/25 border border-white/[0.06]">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>Data de Pagamento</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400 hover:text-cyan-300 select-none">
                    <input
                      type="checkbox"
                      checked={hasNoDueDate}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setHasNoDueDate(checked)
                        if (!checked && !dueDate) {
                          setDueDate(new Date().toISOString().split('T')[0])
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Sem data</span>
                  </label>
                </div>

                {!hasNoDueDate ? (
                  <div className="space-y-1">
                    <input
                      type="date"
                      required={!hasNoDueDate}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-[#151c2e] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      Data combinada para quitação com o credor.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    ⏳ Prazo indeterminado / a combinar.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observações / Motivo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Empréstimo conserto do carro, reforma..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewDebtOpen(false)}
                  disabled={loadingNew}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loadingNew}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
                >
                  {loadingNew ? 'Salvando...' : 'Cadastrar Dívida'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Dívida */}
      {editingDebt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#0e1422] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Edit2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Editar Dívida</h3>
                  <p className="text-xs text-slate-400">Atualize os dados e prazos</p>
                </div>
              </div>
              <button
                onClick={() => setEditingDebt(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateDebt} className="p-5 space-y-4">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-medium">
                  {editError}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Pessoa / Credor
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do credor..."
                  value={editCreditorName}
                  onChange={(e) => setEditCreditorName(e.target.value)}
                  className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Valor Total (R$)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={editTotalAmount}
                    onChange={(e) => handleAmountChange(e.target.value, setEditTotalAmount)}
                    className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Já Abatido (R$)
                  </label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={editPaidAmount}
                    onChange={(e) => handleAmountChange(e.target.value, setEditPaidAmount)}
                    className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              {/* Data Prevista de Pagamento e Checkbox 'Sem data' */}
              <div className="space-y-2 p-3 rounded-xl bg-black/25 border border-white/[0.06]">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span>Data de Pagamento</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-400 hover:text-cyan-300 select-none">
                    <input
                      type="checkbox"
                      checked={editHasNoDueDate}
                      onChange={(e) => {
                        const checked = e.target.checked
                        setEditHasNoDueDate(checked)
                        if (!checked && !editDueDate) {
                          setEditDueDate(new Date().toISOString().split('T')[0])
                        }
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span>Sem data</span>
                  </label>
                </div>

                {!editHasNoDueDate ? (
                  <div className="space-y-1">
                    <input
                      type="date"
                      required={!editHasNoDueDate}
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                      className="w-full bg-[#151c2e] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400 font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      Data combinada para quitação com o credor.
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    ⏳ Prazo indeterminado / a combinar.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Observações / Motivo (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Empréstimo conserto do carro, reforma..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-[#151c2e] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="pt-2 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingDebt(null)}
                  disabled={loadingEdit}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={loadingEdit}
                  className="bg-cyan-500 hover:bg-cyan-400 text-black font-bold"
                >
                  {loadingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

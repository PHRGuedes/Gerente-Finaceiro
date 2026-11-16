'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  CornerDownLeft,
  FormInput,
  Spade,
  QrCode,
  CreditCard,
  Banknote,
  Users,
  Calendar,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
  Utensils,
  Gamepad2,
  Tv,
  Receipt,
  HeartPulse,
  Shirt,
  Crosshair,
  Car,
  HandCoins,
  Gift,
  MoreHorizontal,
  Briefcase,
  TrendingUp,
  Laptop,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Category } from '@/types/finance'
import { PaymentMethod, TransactionType } from '@/types/database.types'
import {
  parseQuickInput,
  QuickParseResult,
  ParsedSingleTransaction,
  ParsedPokerSession,
} from '@/lib/quick-parser'
import { createTransactionAction, createPokerSessionAction } from '@/actions/finance'

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Utensils,
  Gamepad2,
  Tv,
  Receipt,
  Spade,
  HeartPulse,
  Shirt,
  Crosshair,
  Sparkles,
  Car,
  HandCoins,
  Gift,
  Users,
  MoreHorizontal,
  Briefcase,
  TrendingUp,
  Laptop,
}

interface QuickEntryBarProps {
  categories: Category[]
}

export function QuickEntryBar({ categories }: QuickEntryBarProps) {
  const [mode, setMode] = useState<'parser' | 'form'>('parser')
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Estados do modo Formulário Direto
  const [formType, setFormType] = useState<TransactionType>('expense')
  const [formDesc, setFormDesc] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formMethod, setFormMethod] = useState<PaymentMethod>('pix')
  const [formIsThirdParty, setFormIsThirdParty] = useState(false)
  const [formDebtor, setFormDebtor] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)

  // Mapa de categorias por nome
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((cat) => map.set(cat.name, cat))
    return map
  }, [categories])

  // Parser em tempo real
  const parseResult: QuickParseResult | null = useMemo(() => {
    if (!inputText.trim()) return null
    return parseQuickInput(inputText)
  }, [inputText])

  // Limpa feedback após 4 segundos
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // Exemplos rápidos para preencher com 1 clique
  const quickExamples = [
    { label: 'Sessão Poker', text: 'cash poker -90 +151' },
    { label: 'Receita Freeroll', text: '+100 Croupier freeroll pix' },
    { label: 'Café / Spincoffee', text: '12,90 Barrinha Spincoffee alimentacao credito' },
    { label: 'Notinha Luiza 2/10', text: '85,00 Vestido Luiza 2/10 credito' },
    { label: 'Formato Bloco', text: 'Tipo: Despesa | Descrição: 2 Açaís | Valor: 25,82 | Data: 11/11 | Forma de pagamento: Crédito | Categoria: Lazer' },
  ]

  // Envio pelo Parser Inteligente
  const handleSaveParsed = async () => {
    if (!parseResult || !parseResult.success) return

    setLoading(true)
    setFeedback(null)

    try {
      if (parseResult.data.kind === 'poker_session') {
        const session = parseResult.data as ParsedPokerSession
        await createPokerSessionAction({
          buyIn: session.buyIn,
          cashOut: session.cashOut,
          date: session.date,
          paymentMethod: session.paymentMethod,
          descriptionBuyIn: session.descriptionBuyIn,
          descriptionCashOut: session.descriptionCashOut,
        })

        const lucroMsg =
          session.netProfit >= 0
            ? `Lucro de +${formatCurrency(session.netProfit)}`
            : `Prejuízo de ${formatCurrency(session.netProfit)}`

        setFeedback({
          type: 'success',
          message: `Sessão de Poker registrada com sucesso! (${lucroMsg})`,
        })
      } else {
        const tx = parseResult.data as ParsedSingleTransaction
        if (tx.amount <= 0) {
          throw new Error('Informe um valor monetário válido.')
        }

        const res = await createTransactionAction({
          type: tx.type,
          description: tx.description,
          amount: tx.amount,
          date: tx.date,
          payment_method: tx.paymentMethod,
          category: tx.category,
          is_third_party: tx.isThirdParty,
          debtor_name: tx.debtorName,
          installment_current: tx.installmentCurrent,
          installment_total: tx.installmentTotal,
        })

        const instMsg =
          tx.installmentTotal > 1
            ? ` (Motor projetou ${res.count} parcelas de ${tx.installmentCurrent}/${tx.installmentTotal} até ${tx.installmentTotal}/${tx.installmentTotal})`
            : ''

        setFeedback({
          type: 'success',
          message: `${tx.type === 'income' ? 'Receita' : 'Despesa'} de ${formatCurrency(tx.amount)} salva com sucesso!${instMsg}`,
        })
      }

      setInputText('')
      if (inputRef.current) inputRef.current.focus()
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao processar lançamento.',
      })
    } finally {
      setLoading(false)
    }
  }

  // Envio pelo Formulário Direto
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = parseFloat(formAmount.replace(',', '.'))
    if (isNaN(parsed) || parsed <= 0) {
      setFeedback({ type: 'error', message: 'Informe um valor válido maior que zero.' })
      return
    }
    if (!formDesc.trim()) {
      setFeedback({ type: 'error', message: 'Informe uma descrição.' })
      return
    }
    if (!formCategory) {
      setFeedback({ type: 'error', message: 'Selecione uma categoria.' })
      return
    }

    setLoading(true)
    try {
      await createTransactionAction({
        type: formType,
        description: formDesc.trim(),
        amount: parsed,
        date: new Date().toISOString().split('T')[0],
        payment_method: formMethod,
        category: formCategory,
        is_third_party: formIsThirdParty,
        debtor_name: formIsThirdParty ? formDebtor : null,
      })

      setFeedback({
        type: 'success',
        message: `${formType === 'income' ? 'Receita' : 'Despesa'} de ${formatCurrency(parsed)} salva com sucesso!`,
      })

      setFormDesc('')
      setFormAmount('')
      setFormIsThirdParty(false)
      setFormDebtor('')
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Falha ao salvar lançamento.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full space-y-3">
      {/* Container Principal */}
      <Card className="border border-emerald-500/30 bg-gradient-to-r from-[#0d1424] via-[#0f172a] to-[#0d1424] shadow-xl shadow-black/50 overflow-hidden">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Header com Toggle de Modo */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  Lançamento Rápido
                </h3>
                <p className="text-[11px] text-slate-400">
                  Lançamento inteligente por linguagem natural ou formulário expresso
                </p>
              </div>
            </div>

            {/* Alternador de Modo */}
            <div className="flex items-center gap-1 p-1 bg-[#090d16] rounded-xl border border-white/[0.08] self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMode('parser')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  mode === 'parser'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="h-3 w-3" />
                Texto Inteligente (Chat)
              </button>
              <button
                type="button"
                onClick={() => setMode('form')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  mode === 'form'
                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FormInput className="h-3 w-3" />
                Formulário Simples
              </button>
            </div>
          </div>

          {/* Feedback Toast */}
          {feedback && (
            <div
              className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 animate-in fade-in ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* MODO A: PARSER INTELIGENTE */}
          {mode === 'parser' && (
            <div className="space-y-3">
              {/* Input Inteligente com Estilo Command Bar */}
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/40 to-teal-500/40 rounded-2xl blur opacity-30 group-focus-within:opacity-100 transition duration-300"></div>
                <div className="relative flex items-center bg-[#090e18] border border-white/10 group-focus-within:border-emerald-500/60 rounded-xl overflow-hidden shadow-2xl">
                  <span className="pl-4 pr-2 text-slate-500">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && parseResult?.success && !loading) {
                        e.preventDefault()
                        handleSaveParsed()
                      }
                    }}
                    placeholder="Digite no seu estilo: '+100 poker pix', '12,90 Barrinha alimentacao credito' ou 'cash poker -90 +151'..."
                    className="w-full bg-transparent py-3.5 pr-28 text-sm text-white placeholder-slate-500 focus:outline-none font-sans"
                  />

                  {/* Botão de Envio / Atalho Enter */}
                  <div className="absolute right-2 flex items-center gap-1.5">
                    <Button
                      size="sm"
                      onClick={handleSaveParsed}
                      disabled={loading || !parseResult?.success}
                      className="h-8 px-3 text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold shadow-md shadow-emerald-500/20 disabled:opacity-40"
                    >
                      {loading ? (
                        'Salvando...'
                      ) : (
                        <span className="flex items-center gap-1">
                          Confirmar
                          <CornerDownLeft className="h-3 w-3 opacity-70" />
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Chips de Exemplos Rápidos */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] text-slate-400 mr-1 font-medium">Exemplos rápidos:</span>
                {quickExamples.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInputText(ex.text)
                      if (inputRef.current) inputRef.current.focus()
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.06] text-[11px] font-mono transition-all cursor-pointer"
                  >
                    {ex.label}
                  </button>
                ))}
              </div>

              {/* PRÉ-VISUALIZAÇÃO EM TEMPO REAL DO QUE O PARSER ENTENDEU */}
              {parseResult && parseResult.success && (
                <div className="p-4 rounded-xl bg-[#090e18]/90 border border-emerald-500/30 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Pré-visualização do Lançamento
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Pressione <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-semibold">Enter ↵</kbd> para confirmar
                    </span>
                  </div>

                  {/* CASO: SESSÃO DE POKER */}
                  {parseResult.data.kind === 'poker_session' ? (
                    (() => {
                      const session = parseResult.data as ParsedPokerSession
                      const isProfit = session.netProfit >= 0
                      return (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* Buy-in */}
                            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                              <span className="text-[10px] uppercase font-bold text-rose-300 block">
                                Entrada (Buy-in)
                              </span>
                              <div className="text-lg font-bold font-mono text-rose-400">
                                - {formatCurrency(session.buyIn)}
                              </div>
                              <span className="text-[10px] text-slate-400">Despesa Pix • Categoria Poker</span>
                            </div>

                            {/* Cash-out */}
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <span className="text-[10px] uppercase font-bold text-emerald-300 block">
                                Saída (Cash-out)
                              </span>
                              <div className="text-lg font-bold font-mono text-emerald-400">
                                + {formatCurrency(session.cashOut)}
                              </div>
                              <span className="text-[10px] text-slate-400">Receita Pix • Categoria Poker</span>
                            </div>

                            {/* Lucro Líquido */}
                            <div
                              className={`p-3 rounded-xl border ${
                                isProfit
                                  ? 'bg-emerald-500/20 border-emerald-500/40'
                                  : 'bg-rose-500/20 border-rose-500/40'
                              }`}
                            >
                              <span className="text-[10px] uppercase font-bold text-slate-300 block flex items-center gap-1">
                                <Spade className="h-3 w-3 text-emerald-400" />
                                {isProfit ? 'Lucro Líquido' : 'Prejuízo Líquido'}
                              </span>
                              <div
                                className={`text-lg font-extrabold font-mono ${
                                  isProfit ? 'text-emerald-300' : 'text-rose-300'
                                }`}
                              >
                                {isProfit ? '+ ' : ''}
                                {formatCurrency(session.netProfit)}
                              </div>
                              <span className="text-[10px] text-slate-300">
                                Atualiza saldo em {formatCurrency(session.netProfit)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })()
                  ) : (
                    /* CASO: LANÇAMENTO ÚNICO */
                    (() => {
                      const tx = parseResult.data as ParsedSingleTransaction
                      const catInfo = categoryMap.get(tx.category)
                      const IconComp = catInfo?.icon && iconMap[catInfo.icon] ? iconMap[catInfo.icon] : Tag
                      const catColor = catInfo?.color || '#10b981'
                      const isIncome = tx.type === 'income'

                      return (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: `${catColor}20`,
                                color: catColor,
                                border: `1px solid ${catColor}40`,
                              }}
                            >
                              <IconComp className="h-5 w-5" />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-white">
                                  {tx.description}
                                </span>
                                <Badge
                                  variant={isIncome ? 'success' : 'danger'}
                                  className="text-[10px] py-0"
                                >
                                  {isIncome ? 'Receita' : 'Despesa'}
                                </Badge>
                                {tx.isThirdParty && (
                                  <Badge variant="warning" className="text-[10px] py-0 flex items-center gap-1">
                                    <Users className="h-2.5 w-2.5" />
                                    Notinha: {tx.debtorName}
                                  </Badge>
                                )}
                                {tx.installmentTotal > 1 && (
                                  <Badge variant="info" className="text-[10px] py-0 font-mono">
                                    Parcela {tx.installmentCurrent}/{tx.installmentTotal} (Projeção Ativa)
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="font-medium text-slate-300">{tx.category}</span>
                                <span>•</span>
                                <span className="capitalize flex items-center gap-1 font-mono text-[11px] text-slate-300">
                                  {tx.paymentMethod === 'pix' && <QrCode className="h-3 w-3 text-emerald-400" />}
                                  {tx.paymentMethod === 'credit' && <CreditCard className="h-3 w-3 text-violet-400" />}
                                  {tx.paymentMethod === 'cash' && <Banknote className="h-3 w-3 text-amber-400" />}
                                  {tx.paymentMethod.toUpperCase()}
                                </span>
                                <span>•</span>
                                <span>{formatDate(tx.date)}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/[0.06]">
                            <div className="text-right">
                              <span
                                className={`text-xl font-bold font-mono ${
                                  isIncome ? 'text-emerald-400' : 'text-slate-100'
                                }`}
                              >
                                {isIncome ? '+ ' : '- '}
                                {formatCurrency(tx.amount)}
                              </span>
                              <span className="text-[10px] text-slate-500 block">
                                {tx.paymentMethod === 'credit' ? 'Acumula na Fatura' : 'Altera Saldo Principal'}
                              </span>
                            </div>

                            <Button
                              size="sm"
                              onClick={handleSaveParsed}
                              disabled={loading || tx.amount <= 0}
                              className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-9 px-4"
                            >
                              Salvar
                            </Button>
                          </div>
                        </div>
                      )
                    })()
                  )}
                </div>
              )}
            </div>
          )}

          {/* MODO B: FORMULÁRIO SIMPLES */}
          {mode === 'form' && (
            <form onSubmit={handleSaveForm} className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {/* Tipo */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Tipo</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as TransactionType)}
                    className="w-full bg-[#111726] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                  </select>
                </div>

                {/* Descrição */}
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Descrição</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Almoço restaurante, Farmácia..."
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="w-full bg-[#111726] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Valor */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Valor (R$)</label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full bg-[#111726] border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Meio de Pagamento */}
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Pagamento</label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as PaymentMethod)}
                    className="w-full bg-[#111726] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="pix">Pix (Conta)</option>
                    <option value="credit">Crédito (Fatura)</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
              </div>

              {/* Linha 2: Categoria, Notinha e Botão Salvar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <div className="flex flex-wrap items-center gap-4">
                  {/* Categoria */}
                  <div className="min-w-[180px]">
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      required
                      className="w-full bg-[#111726] border border-white/[0.08] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">Selecione a categoria...</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notinha Checkbox */}
                  {formType === 'expense' && (
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={formIsThirdParty}
                        onChange={(e) => setFormIsThirdParty(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-900 text-emerald-500"
                      />
                      <span>Compra de terceiro (Notinha)</span>
                    </label>
                  )}

                  {formIsThirdParty && (
                    <input
                      type="text"
                      placeholder="Nome do amigo (ex: Marcos)"
                      value={formDebtor}
                      onChange={(e) => setFormDebtor(e.target.value)}
                      className="bg-[#111726] border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    />
                  )}
                </div>

                <Button
                  type="submit"
                  size="sm"
                  disabled={loading}
                  className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold h-9 px-6 shrink-0"
                >
                  {loading ? 'Salvando...' : 'Salvar Lançamento'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

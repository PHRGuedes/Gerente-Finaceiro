'use client'

import React, { useState, useRef } from 'react'
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Users,
  Tag,
  ArrowRight,
  Info,
  Sparkles,
  Check,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Transaction, Category } from '@/types/finance'
import {
  parseAndConciliateNubankCSV,
  ConciliationResult,
  ConciliatedItem,
} from '@/lib/nubank-conciliator'
import { batchCreateTransactionsAction } from '@/actions/finance'

interface CSVConciliatorModalProps {
  isOpen: boolean
  onClose: () => void
  existingTransactions: Transaction[]
  categories: Category[]
  currentCycleId: string
  currentCycleLabel: string
}

const SAMPLE_NUBANK_CSV = `date,title,amount
2026-11-05,Ifood *Lanches Br,38.50
2026-11-06,Uber *Trip Sao Paulo,22.90
2026-11-07,Pagamento recebido,-650.00
2026-11-09,Drogasil Farmacia,45.80
2026-11-10,Steam Games Digital,74.90
2026-11-12,Zara Brasil Moda,180.00
2026-11-14,Shein *Vestuario,125.00`

export function CSVConciliatorModal({
  isOpen,
  onClose,
  existingTransactions,
  categories,
  currentCycleId,
  currentCycleLabel,
}: CSVConciliatorModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [csvContent, setCsvContent] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [result, setResult] = useState<ConciliationResult | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'conciliated'>('pending')
  
  // Lista de itens pendentes editáveis
  const [pendingItems, setPendingItems] = useState<
    Array<{
      id: string
      selected: boolean
      date: string
      rawTitle: string
      cleanTitle: string
      category: string
      amount: number
      isThirdParty: boolean
      debtorName: string
    }>
  >([])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isOpen) return null

  // Processar texto CSV
  const handleProcessCSV = (content: string, name = 'arquivo.csv') => {
    setFileName(name)
    setCsvContent(content)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const conciliation = parseAndConciliateNubankCSV(content, existingTransactions)
      setResult(conciliation)

      // Inicializa os itens pendentes com campos editáveis
      const pendings = conciliation.items
        .filter((item) => item.status === 'pending_identification')
        .map((item, idx) => ({
          id: `item-${idx}-${item.raw.id}`,
          selected: true,
          date: item.raw.date,
          rawTitle: item.raw.title,
          cleanTitle: item.suggestedName,
          category: item.suggestedCategory,
          amount: item.raw.amount,
          isThirdParty: false,
          debtorName: '',
        }))

      setPendingItems(pendings)
      setActiveTab(pendings.length > 0 ? 'pending' : 'conciliated')
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao processar arquivo CSV do Nubank.'
      )
    }
  }

  // Upload por arquivo
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      handleProcessCSV(text, file.name)
    }
    reader.readAsText(file)
  }

  // Carregar dados de exemplo do Nubank
  const handleLoadSample = () => {
    handleProcessCSV(SAMPLE_NUBANK_CSV, 'nubank-exemplo.csv')
  }

  // Atualizar campo em item pendente
  const updatePendingItem = (
    id: string,
    field: string,
    value: string | boolean | number
  ) => {
    setPendingItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    )
  }

  // Alternar todos selecionados
  const toggleSelectAll = (select: boolean) => {
    setPendingItems((prev) => prev.map((item) => ({ ...item, selected: select })))
  }

  // Importar itens selecionados
  const handleImport = async () => {
    const selectedItems = pendingItems.filter((i) => i.selected)
    if (selectedItems.length === 0) {
      setErrorMessage('Nenhum lançamento selecionado para importação.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const payload = selectedItems.map((item) => ({
        type: 'expense' as const,
        description: item.cleanTitle.trim() || item.rawTitle,
        amount: item.amount,
        date: item.date,
        payment_method: 'credit' as const,
        category: item.category || 'Outros',
        is_third_party: item.isThirdParty,
        debtor_name: item.isThirdParty && item.debtorName ? item.debtorName.trim() : null,
        billing_cycle: currentCycleId,
      }))

      await batchCreateTransactionsAction(payload)
      setSuccessMessage(
        `${payload.length} lançamentos importados com sucesso na fatura atual!`
      )
      
      // Remover os importados da lista pendente
      setPendingItems([])
      setTimeout(() => {
        onClose()
      }, 1400)
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Falha ao importar transações em lote.'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCount = pendingItems.filter((i) => i.selected).length
  const selectedTotal = pendingItems
    .filter((i) => i.selected)
    .reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0c101a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-6 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111726]/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Conciliação de Fatura (Nubank CSV)
                <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-300 border-violet-500/30">
                  {currentCycleLabel}
                </Badge>
              </h2>
              <p className="text-xs text-slate-400">
                Cruze a fatura do Nubank com lançamentos existentes e importe novos gastos em lote
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Mensagens de Sucesso ou Erro */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Área de Seleção / Dropzone se não processou nada */}
          {!result ? (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/15 hover:border-violet-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all bg-[#0e1320]/50 hover:bg-[#12192a]"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="h-12 w-12 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center mx-auto mb-3">
                  <Upload className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-white text-sm">
                  Clique para selecionar o arquivo CSV do Nubank
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Ou arraste e solte o arquivo exportado do app ou internet banking (colunas: date, title, amount)
                </p>
              </div>

              {/* Botão de Exemplo Rápido */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#121827] border border-white/[0.06]">
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <span>Não tem um arquivo CSV agora? Teste o conciliador com um exemplo:</span>
                </div>
                <Button
                  size="sm"
                  onClick={handleLoadSample}
                  variant="outline"
                  className="text-xs font-semibold border-violet-500/30 text-violet-300 hover:bg-violet-500/20"
                >
                  Carregar Exemplo Nubank
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Resumo do Processamento */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[#121827] border border-white/[0.06]">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
                    Total no CSV
                  </span>
                  <span className="text-xl font-bold text-white mt-1 block">
                    {result.totalItems}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate block">
                    {fileName}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400 block">
                    Já Conciliados (✅)
                  </span>
                  <span className="text-xl font-bold text-emerald-400 mt-1 block">
                    {result.conciliatedCount}
                  </span>
                  <span className="text-[11px] text-emerald-500/80 block">
                    Já lançados no sistema
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-amber-400 block">
                    Pendentes (⚠️)
                  </span>
                  <span className="text-xl font-bold text-amber-400 mt-1 block">
                    {result.pendingCount}
                  </span>
                  <span className="text-[11px] text-amber-500/80 block">
                    {formatCurrency(result.totalPendingAmount)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/20">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-violet-400 block">
                    Pagamento Recebido
                  </span>
                  <span className="text-xl font-bold text-violet-300 mt-1 block">
                    {result.paymentCount}
                  </span>
                  <span className="text-[11px] text-violet-400/80 block">
                    {formatCurrency(result.totalPaymentsAmount)}
                  </span>
                </div>
              </div>

              {/* Alerta de Linha de Pagamento de Fatura Detectada */}
              {result.paymentCount > 0 && (
                <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-start gap-2.5 text-xs text-violet-200">
                  <Info className="h-4 w-4 text-violet-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Pagamento de fatura detectado ({formatCurrency(result.totalPaymentsAmount)}):</strong> O sistema identificou baixas de fatura no CSV. Pagamentos de fatura são movimentações no Saldo Principal e não entram como novas despesas de crédito para evitar cobrança duplicada.
                  </div>
                </div>
              )}

              {/* Abas: Pendentes de Identificação vs Já Conciliados */}
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeTab === 'pending'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                    Pendentes de Identificação ({pendingItems.length})
                  </button>

                  <button
                    onClick={() => setActiveTab('conciliated')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                      activeTab === 'conciliated'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Já Conciliados ({result.conciliatedCount})
                  </button>
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setResult(null)
                    setPendingItems([])
                  }}
                  className="text-xs text-slate-400 hover:text-white h-7"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Novo Arquivo
                </Button>
              </div>

              {/* CONTEÚDO: TAB PENDENTES DE IDENTIFICAÇÃO */}
              {activeTab === 'pending' && (
                <div className="space-y-3">
                  {pendingItems.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Nenhum item pendente de identificação. Todos os lançamentos foram conciliados ou importados!
                    </div>
                  ) : (
                    <>
                      {/* Barra de Ações Rápidas em Lote */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-[#121827] text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleSelectAll(true)}
                            className="text-emerald-400 hover:underline font-semibold"
                          >
                            Selecionar Todos
                          </button>
                          <span className="text-slate-600">•</span>
                          <button
                            onClick={() => toggleSelectAll(false)}
                            className="text-slate-400 hover:underline"
                          >
                            Desmarcar Todos
                          </button>
                        </div>

                        <div className="text-slate-300 font-medium">
                          {selectedCount} selecionados • Total: <strong className="text-amber-400">{formatCurrency(selectedTotal)}</strong>
                        </div>
                      </div>

                      {/* Lista de Itens Pendentes Editáveis */}
                      <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                        {pendingItems.map((item) => (
                          <div
                            key={item.id}
                            className={`p-3 rounded-xl border transition-all text-xs ${
                              item.selected
                                ? 'bg-[#121726] border-white/[0.12]'
                                : 'bg-[#0e121d]/60 border-white/[0.04] opacity-60'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {/* Checkbox de Seleção */}
                              <input
                                type="checkbox"
                                checked={item.selected}
                                onChange={(e) =>
                                  updatePendingItem(item.id, 'selected', e.target.checked)
                                }
                                className="mt-1 h-4 w-4 rounded border-slate-700 bg-slate-900 text-violet-600 focus:ring-violet-500 cursor-pointer"
                              />

                              <div className="flex-1 space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-slate-400 text-[11px]">
                                      {formatDate(item.date)}
                                    </span>
                                    <span className="text-[11px] text-slate-500 truncate max-w-[200px]" title={item.rawTitle}>
                                      Original: {item.rawTitle}
                                    </span>
                                  </div>
                                  <span className="font-bold text-sm text-white font-mono">
                                    {formatCurrency(item.amount)}
                                  </span>
                                </div>

                                {/* Formulário de Edição Inline */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                                  {/* Nome Amigável */}
                                  <div className="sm:col-span-5">
                                    <label className="text-[10px] text-slate-400 font-medium block mb-1">
                                      Nome Amigável
                                    </label>
                                    <input
                                      type="text"
                                      value={item.cleanTitle}
                                      onChange={(e) =>
                                        updatePendingItem(item.id, 'cleanTitle', e.target.value)
                                      }
                                      placeholder="Ex: Ifood Almoço"
                                      className="w-full h-8 px-2.5 rounded-lg bg-[#182032] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
                                    />
                                  </div>

                                  {/* Categoria */}
                                  <div className="sm:col-span-4">
                                    <label className="text-[10px] text-slate-400 font-medium block mb-1">
                                      Categoria
                                    </label>
                                    <select
                                      value={item.category}
                                      onChange={(e) =>
                                        updatePendingItem(item.id, 'category', e.target.value)
                                      }
                                      className="w-full h-8 px-2 rounded-lg bg-[#182032] border border-white/10 text-white text-xs focus:outline-none focus:border-violet-500"
                                    >
                                      {categories.map((cat) => (
                                        <option key={cat.id} value={cat.name}>
                                          {cat.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Notinha & Responsável */}
                                  <div className="sm:col-span-3">
                                    <label className="text-[10px] text-amber-400 font-medium block mb-1">
                                      É Notinha?
                                    </label>
                                    <div className="flex items-center gap-1.5">
                                      <input
                                        type="checkbox"
                                        checked={item.isThirdParty}
                                        onChange={(e) =>
                                          updatePendingItem(item.id, 'isThirdParty', e.target.checked)
                                        }
                                        className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                      />
                                      {item.isThirdParty && (
                                        <input
                                          type="text"
                                          value={item.debtorName}
                                          onChange={(e) =>
                                            updatePendingItem(item.id, 'debtorName', e.target.value)
                                          }
                                          placeholder="Pessoa (ex: Luiza)"
                                          className="flex-1 h-8 px-2 rounded-lg bg-[#182032] border border-amber-500/30 text-white text-xs focus:outline-none focus:border-amber-500"
                                        />
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* CONTEÚDO: TAB JÁ CONCILIADOS */}
              {activeTab === 'conciliated' && (
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {result.items.filter((i) => i.status === 'conciliated').length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs">
                      Nenhum item do CSV coincidiu com os lançamentos prévios do sistema.
                    </div>
                  ) : (
                    result.items
                      .filter((i) => i.status === 'conciliated')
                      .map((item, idx) => (
                        <div
                          key={`conciliated-${idx}`}
                          className="p-3 rounded-xl bg-[#0e1624] border border-emerald-500/20 text-xs flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                              <Check className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">
                                  {item.matchedTransaction?.description || item.raw.title}
                                </span>
                                <Badge className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30 text-[10px]">
                                  Conciliado por Valor de Referência
                                </Badge>
                              </div>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                Estabelecimento no CSV: <strong className="text-slate-300">{item.raw.title}</strong> ({formatDate(item.raw.date)}) • Categoria: {item.suggestedCategory}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-bold text-white font-mono text-sm block">
                              {formatCurrency(item.raw.amount)}
                            </span>
                            <span className="text-[10px] text-emerald-400">
                              Sem duplicação ✅
                            </span>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer com Botões de Ação */}
        <div className="p-4 sm:p-5 border-t border-white/[0.08] bg-[#111726]/80 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-400 text-center sm:text-left">
            {result && (
              <span>
                Fatura de destino: <strong className="text-white">{currentCycleLabel}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none border-white/10 hover:bg-white/[0.05] text-slate-300"
            >
              Fechar
            </Button>

            {result && pendingItems.length > 0 && (
              <Button
                size="sm"
                onClick={handleImport}
                disabled={isSubmitting || selectedCount === 0}
                className="flex-1 sm:flex-none bg-violet-600 hover:bg-violet-500 text-white font-semibold shadow-lg shadow-violet-600/30"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Importando...
                  </span>
                ) : (
                  <span>Importar ({selectedCount}) para a Fatura</span>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

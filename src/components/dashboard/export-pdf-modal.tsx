'use client'

import React, { useState } from 'react'
import {
  X,
  FileDown,
  Calendar,
  PieChart,
  CheckCircle2,
  Receipt,
  Users,
  CreditCard,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import { BillingCycleInfo } from '@/lib/billing'
import { Transaction } from '@/types/finance'
import { generateInvoicePdf, PdfSortMode } from '@/lib/pdf-generator'

interface ExportPdfModalProps {
  isOpen: boolean
  onClose: () => void
  cycle: BillingCycleInfo
  creditTransactions: Transaction[]
  totals: {
    general: number
    ownExpense: number
    thirdParty: number
  }
}

export function ExportPdfModal({
  isOpen,
  onClose,
  cycle,
  creditTransactions,
  totals,
}: ExportPdfModalProps) {
  const [sortMode, setSortMode] = useState<PdfSortMode>('by_category')
  const [isGenerating, setIsGenerating] = useState(false)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleDownload = () => {
    setIsGenerating(true)
    try {
      generateInvoicePdf({
        cycle,
        transactions: creditTransactions,
        totals,
        sortMode,
      })
      setSuccess(true)
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1500)
    } catch (err) {
      console.error('Erro ao gerar PDF da fatura:', err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-[#0c101a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#111726]/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20">
              <FileDown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Exportar Fatura em PDF
                <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-300 border-violet-500/30">
                  {cycle.label}
                </Badge>
              </h2>
              <p className="text-xs text-slate-400">
                Relatório consolidado limpo com resumo de totais e análise
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

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Resumo da Fatura */}
          <div className="p-4 rounded-xl bg-[#121827] border border-white/[0.06] space-y-3">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Ciclo de Faturamento:</span>
              <span className="font-mono text-white font-semibold">{cycle.cycleId} (Fecha dia 04)</span>
            </div>
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>Lançamentos no Cartão:</span>
              <span className="font-mono text-white font-semibold">{creditTransactions.length} compras</span>
            </div>

            <div className="pt-2 border-t border-white/[0.06] grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white/[0.02]">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Geral</span>
                <span className="text-sm font-extrabold text-white font-mono mt-0.5 block">
                  {formatCurrency(totals.general)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-violet-500/5 border border-violet-500/10">
                <span className="text-[10px] text-violet-300 uppercase tracking-wider block">Gasto Próprio</span>
                <span className="text-sm font-extrabold text-violet-300 font-mono mt-0.5 block">
                  {formatCurrency(totals.ownExpense)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <span className="text-[10px] text-amber-300 uppercase tracking-wider block">Notinhas</span>
                <span className="text-sm font-extrabold text-amber-300 font-mono mt-0.5 block">
                  {formatCurrency(totals.thirdParty)}
                </span>
              </div>
            </div>
          </div>

          {/* Opção de Formato / Ordenação */}
          <div className="space-y-2.5">
            <label className="text-xs font-semibold text-slate-300 block">
              Selecione o layout do relatório:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Opção 1: Agrupado por Categoria */}
              <div
                onClick={() => setSortMode('by_category')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  sortMode === 'by_category'
                    ? 'bg-violet-600/15 border-violet-500 text-white shadow-md shadow-violet-500/10'
                    : 'bg-[#121827]/70 border-white/[0.08] text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <PieChart className={`h-4 w-4 ${sortMode === 'by_category' ? 'text-violet-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-white">Agrupado por Categoria</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Tabela analítica com total e percentual (%) por categoria, seguido pelo detalhamento.
                </p>
              </div>

              {/* Opção 2: Ordenado por Data */}
              <div
                onClick={() => setSortMode('by_date')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  sortMode === 'by_date'
                    ? 'bg-violet-600/15 border-violet-500 text-white shadow-md shadow-violet-500/10'
                    : 'bg-[#121827]/70 border-white/[0.08] text-slate-400 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Calendar className={`h-4 w-4 ${sortMode === 'by_date' ? 'text-violet-400' : 'text-slate-400'}`} />
                  <span className="text-xs font-bold text-white">Ordenado por Data</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Lista cronológica simples de cada compra com data, descrição, responsável e valor.
                </p>
              </div>
            </div>
          </div>

          {/* Feedback de Sucesso */}
          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>PDF gerado e transferido para seu dispositivo!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/[0.08] bg-[#111726]/80 flex items-center justify-end gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="border-white/10 hover:bg-white/[0.05] text-slate-300"
          >
            Cancelar
          </Button>

          <Button
            size="sm"
            onClick={handleDownload}
            disabled={isGenerating || creditTransactions.length === 0}
            className="bg-violet-600 hover:bg-violet-500 text-white font-bold shadow-lg shadow-violet-600/20 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Gerando PDF...' : 'Baixar PDF da Fatura'}
          </Button>
        </div>
      </div>
    </div>
  )
}

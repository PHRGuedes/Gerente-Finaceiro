'use client'

import React, { useMemo, useState } from 'react'
import {
  PieChart,
  TrendingDown,
  Tag,
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import { Transaction, Category } from '@/types/finance'

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
}

interface CategoryChartProps {
  transactions: Transaction[]
  categories: Category[]
}

export function CategoryChart({ transactions, categories }: CategoryChartProps) {
  const [viewMode, setViewMode] = useState<'own' | 'all'>('own')
  const [isExpanded, setIsExpanded] = useState(false)
  const PREVIEW_LIMIT = 4

  // Mapa de categorias por nome
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((cat) => map.set(cat.name, cat))
    return map
  }, [categories])

  // Agrupamento de despesas por categoria (respeitando Gasto Próprio vs Geral)
  const { categoryStats, totalExpenses } = useMemo(() => {
    const expenses = transactions.filter((tx) => tx.type === 'expense')
    const map = new Map<string, number>()
    let total = 0

    expenses.forEach((tx) => {
      const txTotal = Number(tx.amount)
      let effectiveAmount = txTotal

      if (viewMode === 'own' && tx.is_third_party) {
        const tpPart =
          tx.third_party_amount !== null && tx.third_party_amount !== undefined
            ? Number(tx.third_party_amount)
            : txTotal
        effectiveAmount = Math.max(0, txTotal - tpPart)
      }

      if (effectiveAmount > 0) {
        total += effectiveAmount
        const current = map.get(tx.category) || 0
        map.set(tx.category, current + effectiveAmount)
      }
    })

    const stats = Array.from(map.entries())
      .map(([name, amount]) => {
        const catInfo = categoryMap.get(name)
        const percentage = total > 0 ? (amount / total) * 100 : 0
        return {
          name,
          amount,
          percentage,
          color: catInfo?.color || '#10b981',
          icon: catInfo?.icon || 'Tag',
        }
      })
      .sort((a, b) => b.amount - a.amount)

    return { categoryStats: stats, totalExpenses: total }
  }, [transactions, categoryMap, viewMode])

  const displayedCategories = useMemo(() => {
    if (isExpanded) return categoryStats
    return categoryStats.slice(0, PREVIEW_LIMIT)
  }, [categoryStats, isExpanded])

  const hasMore = categoryStats.length > PREVIEW_LIMIT

  return (
    <Card className="border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-xl h-full flex flex-col justify-between">
      <CardHeader className="p-4 sm:p-5 pb-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-white">
                <PieChart className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>Gastos por Categoria</span>
                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-6 w-6 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-1"
                    title={isExpanded ? 'Recolher categorias' : 'Expandir todas as categorias'}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                {viewMode === 'own'
                  ? 'Apenas seu gasto próprio (sem notinhas)'
                  : 'Total geral incluindo compras de terceiros'}
              </CardDescription>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-400 block">
              {viewMode === 'own' ? 'Meu Gasto' : 'Total Geral'}
            </span>
            <span className="text-sm font-bold text-emerald-400 font-mono">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>

        {/* Seletor Meu Gasto Próprio vs Total Geral */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-[#111726] rounded-xl border border-white/[0.08] text-xs">
          <button
            type="button"
            onClick={() => setViewMode('own')}
            className={`py-1.5 px-2.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'own'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Meu Gasto Próprio
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`py-1.5 px-2.5 rounded-lg font-medium transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'all'
                ? 'bg-white/10 text-white border border-white/15 font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Geral (c/ Notinhas)
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 pt-2 flex-1">
        {categoryStats.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500 text-xs">
            <TrendingDown className="h-8 w-8 mb-2 opacity-40 text-slate-400" />
            Nenhuma despesa registrada neste ciclo.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Stacked Bar */}
            <div className="h-3 w-full rounded-full bg-white/[0.04] overflow-hidden flex shadow-inner">
              {categoryStats.map((cat, idx) => (
                <div
                  key={idx}
                  title={`${cat.name}: ${cat.percentage.toFixed(1)}%`}
                  style={{
                    width: `${cat.percentage}%`,
                    backgroundColor: cat.color,
                  }}
                  className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full hover:brightness-125"
                />
              ))}
            </div>

            {/* Category Rows with Progress Bars */}
            <div className="space-y-3 pt-2">
              {displayedCategories.map((cat, idx) => {
                const IconComp = iconMap[cat.icon] || Tag
                return (
                  <div key={idx} className="space-y-1.5 group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="h-6 w-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: `${cat.color}20`,
                            color: cat.color,
                          }}
                        >
                          <IconComp className="h-3.5 w-3.5" />
                        </div>
                        <span className="font-medium text-slate-200 truncate max-w-[140px] group-hover:text-white transition-colors">
                          {cat.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-slate-300 font-semibold">
                          {formatCurrency(cat.amount)}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 w-12 text-right">
                          {cat.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Individual progress bar */}
                    <div className="h-1.5 w-full bg-white/[0.05] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Botão de Expandir / Recolher */}
            {hasMore && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 transition-all mt-2 cursor-pointer"
              >
                <span>
                  {isExpanded
                    ? 'Recolher categorias'
                    : `Ver todas as ${categoryStats.length} categorias (+${categoryStats.length - PREVIEW_LIMIT})`}
                </span>
                {isExpanded ? (
                  <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-emerald-400" />
                )}
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

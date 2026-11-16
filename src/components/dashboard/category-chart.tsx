'use client'

import React, { useMemo } from 'react'
import { PieChart, TrendingDown, Tag, Utensils, Gamepad2, Tv, Receipt, Spade, HeartPulse, Shirt, Crosshair, Sparkles, Car, HandCoins, Gift, Users, MoreHorizontal } from 'lucide-react'
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
  // Mapa de categorias por nome
  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>()
    categories.forEach((cat) => map.set(cat.name, cat))
    return map
  }, [categories])

  // Agrupamento de despesas por categoria
  const { categoryStats, totalExpenses } = useMemo(() => {
    const expenses = transactions.filter((tx) => tx.type === 'expense')
    const total = expenses.reduce((acc, curr) => acc + Number(curr.amount), 0)

    const map = new Map<string, number>()
    expenses.forEach((tx) => {
      const current = map.get(tx.category) || 0
      map.set(tx.category, current + Number(tx.amount))
    })

    const stats = Array.from(map.entries())
      .map(([name, amount]) => {
        const catInfo = categoryMap.get(name)
        const percentage = total > 0 ? (amount / total) * 100 : 0
        return {
          name,
          amount,
          percentage,
          color: catInfo?.color || '#6366f1',
          icon: catInfo?.icon || 'Tag',
        }
      })
      .sort((a, b) => b.amount - a.amount)

    return { categoryStats: stats, totalExpenses: total }
  }, [transactions, categoryMap])

  return (
    <Card className="border-white/[0.08] bg-[#0c101a]/70 backdrop-blur-xl h-full flex flex-col justify-between">
      <CardHeader className="p-5 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <PieChart className="h-4 w-4 text-emerald-400" />
              Gastos por Categoria
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Distribuição proporcional das despesas no ciclo
            </CardDescription>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Total de Gastos</span>
            <span className="text-sm font-bold text-white font-mono">
              {formatCurrency(totalExpenses)}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-2 flex-1">
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
              {categoryStats.map((cat, idx) => {
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
          </div>
        )}
      </CardContent>
    </Card>
  )
}

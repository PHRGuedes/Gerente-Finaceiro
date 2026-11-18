import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Transaction } from '@/types/finance'
import { formatCurrency, formatDate } from '@/lib/utils'
import { BillingCycleInfo } from '@/lib/billing'

export type PdfSortMode = 'by_date' | 'by_category'

export interface InvoicePdfData {
  cycle: BillingCycleInfo
  transactions: Transaction[]
  totals: {
    general: number
    ownExpense: number
    thirdParty: number
  }
  sortMode: PdfSortMode
}

export function generateInvoicePdf(data: InvoicePdfData) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const { cycle, transactions, totals, sortMode } = data

  // 1. Cabeçalho Principal (Fintech Header)
  doc.setFillColor(15, 23, 42) // Dark Navy
  doc.rect(0, 0, 210, 36, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('CONTROLE FINANCEIRO', 14, 15)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(148, 163, 184)
  doc.text(`EXTRATO CONSOLIDADO DE FATURA • ${cycle.label.toUpperCase()}`, 14, 22)

  doc.setFontSize(8)
  doc.setTextColor(203, 213, 225)
  const todayStr = new Date().toLocaleDateString('pt-BR')
  doc.text(`Gerado em: ${todayStr} • Fechamento: Dia 04 • Ciclo: ${cycle.cycleId}`, 14, 29)

  // 2. Resumo de Totais da Fatura
  doc.setFillColor(248, 250, 252)
  doc.roundedRect(14, 42, 182, 26, 3, 3, 'F')
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(14, 42, 182, 26, 3, 3, 'S')

  // Total Geral
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(71, 85, 105)
  doc.text('TOTAL DA FATURA', 20, 50)
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(formatCurrency(totals.general), 20, 60)

  // Gasto Próprio
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('MEU GASTO PRÓPRIO', 85, 50)
  doc.setFontSize(12)
  doc.setTextColor(79, 70, 229)
  doc.text(formatCurrency(totals.ownExpense), 85, 60)

  // Notinhas / Terceiros
  doc.setFontSize(9)
  doc.setTextColor(100, 116, 139)
  doc.text('NOTINHAS (TERCEIROS)', 145, 50)
  doc.setFontSize(12)
  doc.setTextColor(217, 119, 6)
  doc.text(formatCurrency(totals.thirdParty), 145, 60)

  let startY = 74

  // 3. Tabela de Lançamentos
  if (sortMode === 'by_date') {
    // Modo Ordenado por Data
    const sortedTxs = [...transactions].sort((a, b) => (a.date < b.date ? -1 : 1))

    const tableRows = sortedTxs.map((tx) => [
      formatDate(tx.date),
      tx.description,
      tx.category,
      tx.is_third_party
        ? tx.third_party_amount && Number(tx.third_party_amount) < Number(tx.amount)
          ? `Dividido (${tx.debtor_name || 'Terceiro'}: ${formatCurrency(Number(tx.third_party_amount))})`
          : `Notinha: ${tx.debtor_name || 'Terceiro'}`
        : 'Gasto Próprio',
      formatCurrency(Number(tx.amount)),
    ])

    autoTable(doc, {
      startY,
      head: [['Data', 'Descrição / Estabelecimento', 'Categoria', 'Tipo / Responsável', 'Valor']],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5,
      },
      columnStyles: {
        0: { cellWidth: 24 },
        1: { cellWidth: 64 },
        2: { cellWidth: 32 },
        3: { cellWidth: 36 },
        4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      },
    })
  } else {
    // Modo Agrupado por Categoria
    // Agrupar
    const categoriesMap = new Map<string, Transaction[]>()
    transactions.forEach((tx) => {
      const list = categoriesMap.get(tx.category) || []
      list.push(tx)
      categoriesMap.set(tx.category, list)
    })

    const categoriesList = Array.from(categoriesMap.entries()).map(([cat, items]) => {
      const sum = items.reduce((acc, curr) => acc + Number(curr.amount), 0)
      const percent = totals.general > 0 ? (sum / totals.general) * 100 : 0
      return { category: cat, items, total: sum, percentage: percent }
    }).sort((a, b) => b.total - a.total)

    // Tabela Resumo de Categorias
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text('RESUMO POR CATEGORIA (VALOR E %)', 14, startY)
    startY += 4

    const categorySummaryRows = categoriesList.map((c) => [
      c.category,
      `${c.percentage.toFixed(1)}%`,
      formatCurrency(c.total),
    ])

    autoTable(doc, {
      startY,
      head: [['Categoria', 'Participação (%)', 'Total Gasto']],
      body: categorySummaryRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 90 },
        1: { cellWidth: 40, halign: 'center' },
        2: { cellWidth: 52, halign: 'right', fontStyle: 'bold' },
      },
    })

    // Tabela detalhada de todos os lançamentos
    // @ts-expect-error autoTable adds lastAutoTable to doc
    const nextY = (doc.lastAutoTable?.finalY || startY) + 8

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(15, 23, 42)
    doc.text('DETALHAMENTO DE LANÇAMENTOS POR CATEGORIA', 14, nextY)

    const detailedRows: string[][] = []
    categoriesList.forEach((c) => {
      c.items.forEach((tx) => {
        detailedRows.push([
          c.category,
          formatDate(tx.date),
          tx.description,
          tx.is_third_party
            ? tx.third_party_amount && Number(tx.third_party_amount) < Number(tx.amount)
              ? `Dividido (${tx.debtor_name || 'Terceiro'}: ${formatCurrency(Number(tx.third_party_amount))})`
              : `Notinha: ${tx.debtor_name || 'Terceiro'}`
            : 'Gasto Próprio',
          formatCurrency(Number(tx.amount)),
        ])
      })
    })

    autoTable(doc, {
      startY: nextY + 4,
      head: [['Categoria', 'Data', 'Descrição', 'Responsável', 'Valor']],
      body: detailedRows,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.2,
      },
      columnStyles: {
        0: { cellWidth: 32, fontStyle: 'bold' },
        1: { cellWidth: 22 },
        2: { cellWidth: 62 },
        3: { cellWidth: 36 },
        4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
    })
  }

  // Rodapé
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(7)
    doc.setTextColor(148, 163, 184)
    doc.text(
      `Controle Financeiro • Página ${i} de ${pageCount} • Documento Financeiro Pessoal`,
      14,
      290
    )
  }

  // Baixar arquivo PDF
  doc.save(`fatura-${cycle.cycleId}.pdf`)
}

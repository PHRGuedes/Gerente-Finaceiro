import { Transaction } from '@/types/finance'
import { getCycleForDate } from '@/lib/billing'

export interface NubankRawItem {
  id: string
  date: string // YYYY-MM-DD
  title: string
  amount: number
  isPayment: boolean
}

export interface ConciliatedItem {
  raw: NubankRawItem
  status: 'conciliated' | 'pending_identification' | 'payment_received'
  matchedTransaction?: Transaction
  // Campos editáveis para os pendentes de identificação
  suggestedName: string
  suggestedCategory: string
  isThirdParty: boolean
  debtorName?: string
  billingCycle: string
}

export interface ConciliationResult {
  totalItems: number
  conciliatedCount: number
  pendingCount: number
  paymentCount: number
  totalPaymentsAmount: number
  totalPendingAmount: number
  items: ConciliatedItem[]
}

const MERCHANT_CATEGORY_RULES: Record<string, string[]> = {
  'Alimentação': [
    'ifood', 'mercado', 'supermercado', 'padaria', 'pao de acucar', 'carrefour', 'extra',
    'restaurante', 'lanche', 'barrinha', 'spincoffee', 'cafe', 'mcdonalds', 'burger', 'subway', 'acai'
  ],
  'Transporte': ['uber', '99', 'posto', 'gasolina', 'ipiranga', 'shell', 'estacionamento', 'combustivel', 'pedagio'],
  'Saúde': ['farmacia', 'drogaria', 'pague menos', 'raia', 'drogasil', 'remedio', 'consulta', 'laboratorio'],
  'Roupas': ['shein', 'zara', 'renner', 'c&a', 'riachuelo', 'tenis', 'roupa', 'vestuario'],
  'Lazer': ['cinema', 'steam', 'playstation', 'game', 'bar', 'show', 'ingresso', 'sympla'],
  'Assinatura': ['netflix', 'spotify', 'prime', 'amazon', 'youtube', 'apple', 'chatgpt'],
  'Airsoft': ['airsoft', 'bbs', 'gbb', 'militaria'],
  'Contas': ['enel', 'sabesp', 'claro', 'vivo', 'tim', 'energia', 'agua', 'luz'],
}

/**
 * Limpa títulos poluídos de estabelecimentos do Nubank (ex: 'Ifood *Ifood Com' -> 'Ifood')
 */
function cleanMerchantTitle(title: string): string {
  let cleaned = title
    .replace(/^pag\*\s*/i, '')
    .replace(/^dl\*\s*/i, '')
    .replace(/\*.*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!cleaned) cleaned = title
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

/**
 * Detecta a categoria provável pelo nome do estabelecimento
 */
function guessCategory(title: string): string {
  const lower = title.toLowerCase()
  for (const [cat, keywords] of Object.entries(MERCHANT_CATEGORY_RULES)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return cat
      }
    }
  }
  return 'Outros'
}

/**
 * Converte data DD/MM/YYYY ou YYYY-MM-DD para YYYY-MM-DD
 */
function normalizeDate(rawDate: string): string {
  const trimmed = rawDate.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  if (trimmed.includes('/')) {
    const parts = trimmed.split('/')
    if (parts.length === 3) {
      const d = parts[0].padStart(2, '0')
      const m = parts[1].padStart(2, '0')
      const y = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
      return `${y}-${m}-${d}`
    }
  }

  return new Date().toISOString().split('T')[0]
}

/**
 * Analisa e concilia o arquivo CSV exportado do Nubank com as transações do sistema
 */
export function parseAndConciliateNubankCSV(
  csvContent: string,
  existingTransactions: Transaction[]
): ConciliationResult {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) {
    return {
      totalItems: 0,
      conciliatedCount: 0,
      pendingCount: 0,
      paymentCount: 0,
      totalPaymentsAmount: 0,
      totalPendingAmount: 0,
      items: [],
    }
  }

  // Detectar delimitador (vírgula ou ponto-e-vírgula)
  const header = lines[0].toLowerCase()
  const delimiter = header.includes(';') ? ';' : ','

  const rawItems: NubankRawItem[] = []

  // Começa da linha 1 se a linha 0 for cabeçalho
  const startIndex = header.includes('date') || header.includes('data') || header.includes('title') ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.replace(/^["']|["']$/g, '').trim())
    if (cols.length < 3) continue

    const rawDate = cols[0]
    const rawTitle = cols[1]
    const rawAmountStr = cols[2].replace('R$', '').replace(/\s/g, '').replace(',', '.')

    const amountNum = parseFloat(rawAmountStr)
    if (isNaN(amountNum)) continue

    const isPayment =
      amountNum < 0 ||
      rawTitle.toLowerCase().includes('pagamento recebido') ||
      rawTitle.toLowerCase().includes('pagamento de fatura')

    rawItems.push({
      id: `csv-${i}-${Date.now()}`,
      date: normalizeDate(rawDate),
      title: rawTitle,
      amount: Math.abs(amountNum),
      isPayment,
    })
  }

  // Filtrar apenas compras de crédito cadastradas no banco para cruzamento
  const creditTxs = existingTransactions.filter((tx) => tx.payment_method === 'credit')
  const matchedTxIds = new Set<string>()

  const conciliatedItems: ConciliatedItem[] = []
  let totalPayments = 0
  let totalPendingAmount = 0

  for (const item of rawItems) {
    // 1. Linhas de Pagamento Recebido (Baixa de fatura)
    if (item.isPayment) {
      totalPayments += item.amount
      conciliatedItems.push({
        raw: item,
        status: 'payment_received',
        suggestedName: 'Pagamento de Fatura Nubank',
        suggestedCategory: 'Contas',
        isThirdParty: false,
        billingCycle: getCycleForDate(item.date),
      })
      continue
    }

    // 2. Cruzamento de Compras (Matching com tolerância de até 4 dias de diferença de data e mesmo valor)
    const match = creditTxs.find((tx) => {
      if (matchedTxIds.has(tx.id)) return false

      const amountMatches = Math.abs(Number(tx.amount) - item.amount) < 0.05
      if (!amountMatches) return false

      const csvDate = new Date(item.date).getTime()
      const txDate = new Date(tx.date).getTime()
      const diffDays = Math.abs(csvDate - txDate) / (1000 * 60 * 60 * 24)

      return diffDays <= 4
    })

    if (match) {
      matchedTxIds.add(match.id)
      conciliatedItems.push({
        raw: item,
        status: 'conciliated',
        matchedTransaction: match,
        suggestedName: match.description,
        suggestedCategory: match.category,
        isThirdParty: match.is_third_party,
        debtorName: match.debtor_name || undefined,
        billingCycle: match.billing_cycle || getCycleForDate(item.date),
      })
    } else {
      // 3. Pendentes de Identificação
      const cleanName = cleanMerchantTitle(item.title)
      const guessedCat = guessCategory(item.title)
      totalPendingAmount += item.amount

      conciliatedItems.push({
        raw: item,
        status: 'pending_identification',
        suggestedName: cleanName,
        suggestedCategory: guessedCat,
        isThirdParty: false,
        billingCycle: getCycleForDate(item.date),
      })
    }
  }

  const conciliatedCount = conciliatedItems.filter((i) => i.status === 'conciliated').length
  const pendingCount = conciliatedItems.filter((i) => i.status === 'pending_identification').length
  const paymentCount = conciliatedItems.filter((i) => i.status === 'payment_received').length

  return {
    totalItems: rawItems.length,
    conciliatedCount,
    pendingCount,
    paymentCount,
    totalPaymentsAmount: totalPayments,
    totalPendingAmount,
    items: conciliatedItems,
  }
}

import { Transaction } from '@/types/finance'
import { getCycleForDate } from '@/lib/billing'

export interface NubankRawItem {
  id: string
  date: string // YYYY-MM-DD
  title: string
  amount: number
  isPayment: boolean
  installmentCurrent?: number
  installmentTotal?: number
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
  installmentCurrent?: number
  installmentTotal?: number
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
    'restaurante', 'lanche', 'barrinha', 'spincoffee', 'cafe', 'mcdonalds', 'burger', 'subway',
    'acai', 'docinhos', 'verduras', 'hortifruti', 'aliment', 'panificadora'
  ],
  'Transporte': ['uber', '99', 'posto', 'gasolina', 'ipiranga', 'shell', 'estacionamento', 'combustivel', 'pedagio'],
  'Saúde': ['farmacia', 'drogaria', 'pague menos', 'raia', 'drogasil', 'remedio', 'consulta', 'laboratorio', 'drogao'],
  'Roupas': ['shein', 'zara', 'renner', 'c&a', 'riachuelo', 'tenis', 'roupa', 'vestuario', 'guthpants', 'yourprice'],
  'Lazer': ['cinema', 'steam', 'playstation', 'game', 'bar', 'show', 'ingresso', 'sympla', 'baralho'],
  'Assinatura': ['netflix', 'spotify', 'prime', 'amazon', 'youtube', 'apple', 'chatgpt', 'onedrive', 'google one', 'clube'],
  'Airsoft': ['airsoft', 'bbs', 'gbb', 'militaria', 'actionsport'],
  'Contas': ['enel', 'sabesp', 'claro', 'vivo', 'tim', 'energia', 'agua', 'luz', 'allrede', 'internet'],
}

/**
 * Faz o split de uma linha CSV respeitando aspas ("...")
 * Evita que vírgulas decimais dentro de aspas (ex: "15,20") sejam quebradas como colunas separadas
 */
export function parseCSVLine(line: string, delimiter: string = ','): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      result.push(cur.replace(/^["']|["']$/g, '').trim())
      cur = ''
    } else {
      cur += char
    }
  }
  result.push(cur.replace(/^["']|["']$/g, '').trim())
  return result
}

/**
 * Converte valor em string (formatos brasileiro "15,20", "- 3.401,57", ou internacional "15.20") para número float
 */
export function parseNubankAmount(rawAmountStr: string): number {
  if (!rawAmountStr) return NaN
  let clean = rawAmountStr
    .replace(/R\$/g, '')
    .replace(/\s+/g, '') // remove espaços inclusive entre sinal negativo e número

  if (clean.includes(',') && clean.includes('.')) {
    // Ex: "3.401,57" -> remove pontos de milhar e troca vírgula decimal por ponto
    clean = clean.replace(/\./g, '').replace(',', '.')
  } else if (clean.includes(',')) {
    // Ex: "15,20" -> troca vírgula decimal por ponto
    clean = clean.replace(',', '.')
  }

  return parseFloat(clean)
}

/**
 * Limpa títulos poluídos de estabelecimentos do Nubank (ex: 'Pg *Nuvem Yourprice - Parcela 1/3' -> 'Nuvem Yourprice')
 */
export function cleanMerchantTitle(title: string): string {
  let cleaned = title
    .replace(/^pag\*\s*/i, '')
    .replace(/^pg\s*\*\s*/i, '')
    .replace(/^dl\*\s*/i, '')
    .replace(/^bmb\s*\*\s*/i, '')
    .replace(/^ifd\s*\*\s*/i, '')
    .replace(/^mp\s*\*\s*/i, '')
    .replace(/^nuv\s*\*\s*/i, '')
    .replace(/^jim\.com\*\s*/i, '')
    .replace(/[\s\-]+Parcela\s+\d+\/\d+/i, '') // remove " - Parcela 1/3"
    .replace(/\s*\(\d+\/\d+\)/, '') // remove "(1/3)"
    .replace(/\*.*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim()

  if (!cleaned) cleaned = title
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

/**
 * Extrai informações de parcelamento da descrição do Nubank
 */
export function extractInstallmentsFromTitle(title: string): {
  current?: number
  total?: number
} {
  const match =
    title.match(/[\s\-]+Parcela\s+(\d+)\/(\d+)/i) ||
    title.match(/\((\d+)\/(\d+)\)/) ||
    title.match(/\b(\d+)\/(\d+)\b/)

  if (match) {
    const current = parseInt(match[1], 10)
    const total = parseInt(match[2], 10)
    if (!isNaN(current) && !isNaN(total) && total >= current) {
      return { current, total }
    }
  }
  return {}
}

/**
 * Detecta a categoria provável pelo nome do estabelecimento
 */
export function guessCategory(title: string): string {
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
export function normalizeDate(rawDate: string): string {
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
  const startIndex =
    header.includes('date') || header.includes('data') || header.includes('title') ? 1 : 0

  for (let i = startIndex; i < lines.length; i++) {
    // Usar parser de linha CSV que respeita aspas
    const cols = parseCSVLine(lines[i], delimiter)
    if (cols.length < 3) continue

    const rawDate = cols[0]
    const rawTitle = cols[1]
    const amountNum = parseNubankAmount(cols[2])

    if (isNaN(amountNum)) continue

    const isPayment =
      amountNum < 0 ||
      rawTitle.toLowerCase().includes('pagamento recebido') ||
      rawTitle.toLowerCase().includes('pagamento de fatura')

    const installments = extractInstallmentsFromTitle(rawTitle)

    rawItems.push({
      id: `csv-${i}-${Date.now()}`,
      date: normalizeDate(rawDate),
      title: rawTitle,
      amount: Math.abs(amountNum),
      isPayment,
      installmentCurrent: installments.current,
      installmentTotal: installments.total,
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

    // 2. Cruzamento de Compras por VALOR DE REFERÊNCIA
    // Geralmente a descrição do CSV (ex: 'PAG*Restaurante') não bate com o lançamento manual (ex: 'Almoço de domingo').
    // Por isso, a correspondência prioritária é feita pelo VALOR EXATO no mesmo ciclo de fatura ou data aproximada.
    const itemCycle = getCycleForDate(item.date)

    let bestMatch: Transaction | null = null
    let bestScore = -1

    for (const tx of creditTxs) {
      if (matchedTxIds.has(tx.id)) continue

      const txAmount = Number(tx.amount)
      // Comparação pelo VALOR DE REFERÊNCIA (tolerância de até 3 centavos para eventuais arredondamentos)
      const amountMatches = Math.abs(txAmount - item.amount) < 0.03
      if (!amountMatches) continue

      // Calcular proximidade de data em dias
      const csvTime = new Date(item.date).getTime()
      const txTime = new Date(tx.date).getTime()
      const diffDays = Math.abs(csvTime - txTime) / (1000 * 60 * 60 * 24)

      // Pontuação:
      // - Prioridade 1: Mesmo ciclo de fatura (+1000 pts)
      // - Prioridade 2: Proximidade de data (+ até 100 pts)
      let score = 0
      if (tx.billing_cycle && tx.billing_cycle === itemCycle) {
        score += 1000
      }
      score += Math.max(0, 100 - diffDays)

      // Se ambos tiverem informação de parcela igual (ex: 3/10)
      if (
        item.installmentCurrent &&
        tx.installment_current &&
        item.installmentCurrent === tx.installment_current &&
        item.installmentTotal === tx.installment_total
      ) {
        score += 300
      }

      // Bônus se palavras-chave coincidirem (ex: "ifood", "uber", "action", etc.)
      const itemWords = item.title
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)
      const txWords = tx.description
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2)

      for (const w of itemWords) {
        if (txWords.includes(w)) {
          score += 50
        }
      }

      // Permite matching se estiver no mesmo ciclo de fatura ou em até 40 dias de diferença
      if (score > bestScore && (tx.billing_cycle === itemCycle || diffDays <= 45)) {
        bestScore = score
        bestMatch = tx
      }
    }

    if (bestMatch) {
      matchedTxIds.add(bestMatch.id)
      conciliatedItems.push({
        raw: item,
        status: 'conciliated',
        matchedTransaction: bestMatch,
        suggestedName: bestMatch.description,
        suggestedCategory: bestMatch.category,
        isThirdParty: bestMatch.is_third_party,
        debtorName: bestMatch.debtor_name || undefined,
        billingCycle: bestMatch.billing_cycle || itemCycle,
        installmentCurrent: bestMatch.installment_current,
        installmentTotal: bestMatch.installment_total,
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
        installmentCurrent: item.installmentCurrent,
        installmentTotal: item.installmentTotal,
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

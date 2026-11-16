import { PaymentMethod, TransactionType } from '@/types/database.types'

export interface ParsedSingleTransaction {
  kind: 'single'
  type: TransactionType
  description: string
  amount: number
  date: string // YYYY-MM-DD
  paymentMethod: PaymentMethod
  category: string
  isThirdParty: boolean
  debtorName?: string | null
  installmentCurrent: number
  installmentTotal: number
}

export interface ParsedPokerSession {
  kind: 'poker_session'
  buyIn: number // Valor de entrada / despesa (ex: 90)
  cashOut: number // Valor de saída / receita (ex: 151)
  netProfit: number // Lucro líquido (cashOut - buyIn, ex: +61)
  date: string // YYYY-MM-DD
  paymentMethod: PaymentMethod
  category: string
  descriptionBuyIn: string
  descriptionCashOut: string
}

export type QuickParseResult =
  | { success: true; data: ParsedSingleTransaction | ParsedPokerSession; rawText: string }
  | { success: false; error: string; rawText: string }

// Dicionário de sinônimos e palavras-chave de categorias
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Poker': ['poker', 'freeroll', 'croupier', 'buyin', 'rebuy', 'cashout', 'cash game', 'mesa de poker', 'torneio poker'],
  'Alimentação': [
    'alimentacao', 'alimentação', 'almoco', 'almoço', 'jantar', 'lanche', 'acai', 'açaí', 'acais', 'açaís',
    'cafe', 'café', 'coffee', 'spincoffee', 'barrinha', 'pizza', 'hamburguer', 'burger', 'ifood', 'mercado',
    'supermercado', 'padaria', 'restaurante', 'churrasco', 'sorvete', 'comida', 'subway', 'mcdonalds'
  ],
  'Lazer': ['lazer', 'cinema', 'show', 'jogo', 'game', 'games', 'steam', 'playstation', 'xbox', 'praia', 'bar', 'balada', 'festa'],
  'Assinatura': ['assinatura', 'netflix', 'spotify', 'prime', 'amazon prime', 'youtube', 'disney', 'hbo', 'icloud', 'chatgpt'],
  'Contas': ['contas', 'conta', 'luz', 'energia', 'agua', 'água', 'internet', 'fibra', 'celular', 'aluguel', 'condominio', 'condomínio', 'gas', 'gás', 'iptu', 'ipva', 'mae', 'mãe'],
  'Saúde': ['saude', 'saúde', 'farmacia', 'farmácia', 'drogaria', 'remedio', 'remédio', 'medico', 'médico', 'consulta', 'dentista', 'exame', 'academia', 'suplemento', 'whey'],
  'Roupas': ['roupas', 'roupa', 'camisa', 'camiseta', 'calca', 'calça', 'tenis', 'tênis', 'sapato', 'meia', 'casaco', 'jaqueta', 'bermuda', 'vestuario', 'shein', 'zara', 'biquini', 'biquíni'],
  'Airsoft': ['airsoft', 'bbs', 'bala', 'gbb', 'aeg', 'mag', 'colete', 'speedsoft', 'campo airsoft', 'red dot'],
  'Cuidado Pessoal': ['cuidado pessoal', 'barbearia', 'barbeiro', 'corte', 'cabelo', 'perfume', 'desodorante', 'shampoo', 'estetica', 'skincare'],
  'Transporte': ['transporte', 'uber', '99', 'taxi', 'táxi', 'gasolina', 'combustivel', 'combustível', 'posto', 'etanol', 'estacionamento', 'pedagio', 'pedágio', 'onibus', 'ônibus', 'metro', 'metrô'],
  'Empréstimo': ['emprestimo', 'empréstimo', 'divida', 'dívida', 'emprestado', 'vo', 'vô', 'amortizacao'],
  'Presente': ['presente', 'aniversario', 'aniversário', 'lembrancinha', 'natal'],
  'Notinha / Terceiros': ['notinha', 'terceiro', 'terceiros', 'amigo', 'fulano', 'devedor', 'dividir'],
  'Salário': ['salario', 'salário', 'ordenado', 'contra cheque', 'holerite', 'pro labore', 'pro-labore'],
  'Freelance / Extra': ['freela', 'freelance', 'extra', 'bico', 'trampo', 'servico'],
  'Rendimentos / Investimentos': ['rendimento', 'dividendo', 'cdi', 'selic', 'juros', 'investimento'],
  'Outros': ['outros', 'outro', 'diverso', 'diversos']
}

// Nomes de terceiros comuns para autodetecção rápida
const COMMON_DEBTORS = ['luiza', 'nalyne', 'yara', 'marcos', 'lucas', 'gabriel', 'pedro', 'carol', 'mariana', 'felipe']

function parseAmount(val: string): number | null {
  if (!val) return null
  const cleaned = val.replace(/r\$/gi, '').trim().replace(/\./g, '').replace(',', '.')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseDate(val: string): string {
  const now = new Date()
  const currentYear = now.getFullYear()
  const todayIso = now.toISOString().split('T')[0]

  if (!val || val.toLowerCase() === 'hoje') return todayIso

  if (val.toLowerCase() === 'ontem') {
    const yesterday = new Date()
    yesterday.setDate(now.getDate() - 1)
    return yesterday.toISOString().split('T')[0]
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val

  const parts = val.split('/')
  if (parts.length >= 2) {
    const day = parts[0].padStart(2, '0')
    const month = parts[1].padStart(2, '0')
    let year = currentYear
    if (parts.length === 3) {
      const parsedYear = parseInt(parts[2], 10)
      year = parsedYear < 100 ? 2000 + parsedYear : parsedYear
    }
    return `${year}-${month}-${day}`
  }

  return todayIso
}

function detectPaymentMethod(text: string): PaymentMethod {
  const lower = text.toLowerCase()
  if (/\b(credito|crédito|cartao|cartão|card)\b/.test(lower)) return 'credit'
  if (/\b(dinheiro|especie|espécie)\b/.test(lower)) return 'cash'
  return 'pix'
}

function detectCategory(text: string, defaultType: TransactionType): string {
  const lower = text.toLowerCase()

  for (const [categoryName, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      const regex = new RegExp(`\\b${kw}\\b`, 'i')
      if (regex.test(lower)) {
        return categoryName
      }
    }
  }

  return defaultType === 'income' ? 'Salário' : 'Outros'
}

/**
 * PARSER PRINCIPAL (com suporte completo a Motor de Parcelas e Notinhas)
 */
export function parseQuickInput(input: string): QuickParseResult {
  const trimmed = input.trim()
  if (!trimmed) {
    return { success: false, error: 'Digite uma frase ou comando financeiro.', rawText: input }
  }

  // ============================================================================
  // CASO 1: Sessão de Poker com entrada e saída juntas (ex: 'cash poker -90 +151')
  // ============================================================================
  const pokerSessionRegex = /\b(poker|cash\s*poker|sessao\s*poker|sessão\s*poker)\b.*[-–]\s*(\d+[.,]?\d*).*?\+\s*(\d+[.,]?\d*)/i
  const pokerSessionInverse = /\b(poker|cash\s*poker|sessao\s*poker|sessão\s*poker)\b.*?\+\s*(\d+[.,]?\d*).*?[-–]\s*(\d+[.,]?\d*)/i

  let pokerMatch = trimmed.match(pokerSessionRegex)
  let buyInVal = 0
  let cashOutVal = 0

  if (pokerMatch) {
    buyInVal = parseAmount(pokerMatch[2]) || 0
    cashOutVal = parseAmount(pokerMatch[3]) || 0
  } else {
    const invMatch = trimmed.match(pokerSessionInverse)
    if (invMatch) {
      cashOutVal = parseAmount(invMatch[2]) || 0
      buyInVal = parseAmount(invMatch[3]) || 0
      pokerMatch = invMatch
    }
  }

  if (pokerMatch && buyInVal > 0 && cashOutVal > 0) {
    const today = new Date().toISOString().split('T')[0]
    return {
      success: true,
      rawText: trimmed,
      data: {
        kind: 'poker_session',
        buyIn: buyInVal,
        cashOut: cashOutVal,
        netProfit: cashOutVal - buyInVal,
        date: today,
        paymentMethod: 'pix',
        category: 'Poker',
        descriptionBuyIn: 'Sessão Poker (Buy-in / Entrada)',
        descriptionCashOut: 'Sessão Poker (Cashout / Saída)',
      },
    }
  }

  // ============================================================================
  // CASO 2: Formato Estruturado em Bloco (com '|' ou linhas)
  // ============================================================================
  if (
    /tipo\s*:/i.test(trimmed) ||
    /descri[çc][aã]o\s*:/i.test(trimmed) ||
    /valor\s*:/i.test(trimmed)
  ) {
    const lines = trimmed.includes('|') ? trimmed.split('|') : trimmed.split('\n')
    const fields: Record<string, string> = {}

    for (const part of lines) {
      const idx = part.indexOf(':')
      if (idx !== -1) {
        const key = part.slice(0, idx).trim().toLowerCase()
        const val = part.slice(idx + 1).trim()
        fields[key] = val
      }
    }

    const typeStr = (fields['tipo'] || fields['type'] || 'despesa').toLowerCase()
    const type: TransactionType = typeStr.includes('receita') || typeStr.includes('income') ? 'income' : 'expense'

    const amountStr = fields['valor'] || fields['amount'] || fields['preco'] || '0'
    const amount = parseAmount(amountStr) || 0

    const description =
      fields['descrição'] ||
      fields['descricao'] ||
      fields['desc'] ||
      fields['item'] ||
      'Lançamento Rápido'

    const rawDate = fields['data'] || fields['date'] || ''
    const date = parseDate(rawDate)

    const rawPayment = fields['forma de pagamento'] || fields['pagamento'] || fields['forma'] || fields['meio'] || ''
    const paymentMethod = detectPaymentMethod(rawPayment || 'pix')

    const rawCategory = fields['categoria'] || fields['cat'] || ''
    const category = rawCategory || detectCategory(description, type)

    const debtorName = fields['terceiro'] || fields['terceiros'] || fields['devedor'] || fields['notinha'] || fields['pessoa'] || null
    const isThirdParty = Boolean(debtorName)

    // Parcelas no bloco estruturado (ex: Parcela: 2/10 ou 1/3)
    let installmentCurrent = 1
    let installmentTotal = 1
    const rawInstallment = fields['parcela'] || fields['parcelas'] || fields['installment'] || ''
    if (rawInstallment) {
      const m = rawInstallment.match(/(\d{1,2})\s*[\/|de]\s*(\d{1,2})/)
      if (m) {
        installmentCurrent = parseInt(m[1], 10)
        installmentTotal = parseInt(m[2], 10)
      } else {
        const singleTotal = parseInt(rawInstallment.replace(/\D/g, ''), 10)
        if (singleTotal > 1) {
          installmentTotal = singleTotal
        }
      }
    }

    return {
      success: true,
      rawText: trimmed,
      data: {
        kind: 'single',
        type,
        description,
        amount,
        date,
        paymentMethod,
        category,
        isThirdParty,
        debtorName,
        installmentCurrent,
        installmentTotal,
      },
    }
  }

  // ============================================================================
  // CASO 3: Frases Curtas Naturais (com detecção de parcelas e notinhas)
  // ============================================================================
  let workingText = trimmed
  let type: TransactionType = 'expense'

  // 1. Detectar sinal de Receita (+) ou palavra indicadora
  if (workingText.startsWith('+')) {
    type = 'income'
    workingText = workingText.slice(1).trim()
  } else if (/^(recebi|ganho|receita|salario|salário|freela)\b/i.test(workingText)) {
    type = 'income'
    workingText = workingText.replace(/^(recebi|ganho|receita|salario|salário|freela)\b/i, '').trim()
  }

  // 2. Detectar Parcelas (ex: 'parcela 2/10', '2/10', '1/3', '3x', '10x')
  let installmentCurrent = 1
  let installmentTotal = 1

  // Padrão: parcela 2/10 ou 2/10
  const instSlashMatch = workingText.match(/\b(?:parcela\s*)?(\d{1,2})\s*[\/|de]\s*(\d{1,2})\b/i)
  if (instSlashMatch) {
    installmentCurrent = parseInt(instSlashMatch[1], 10)
    installmentTotal = parseInt(instSlashMatch[2], 10)
    workingText = workingText.replace(instSlashMatch[0], ' ').trim()
  } else {
    // Padrão: 3x ou 10x
    const instXMatch = workingText.match(/\b(\d{1,2})x\b/i)
    if (instXMatch) {
      installmentCurrent = 1
      installmentTotal = parseInt(instXMatch[1], 10)
      workingText = workingText.replace(instXMatch[0], ' ').trim()
    }
  }

  // 3. Extrair o Valor monetário (12,90 ou 100 ou R$ 50)
  const amountMatch = workingText.match(/(?:r\$\s*)?(\d{1,6}(?:[.,]\d{1,2})?)/i)
  let amount = 0

  if (amountMatch) {
    amount = parseAmount(amountMatch[1]) || 0
    workingText = workingText.replace(amountMatch[0], ' ').trim()
  }

  // 4. Detectar Meio de Pagamento
  // Se tem parcelamento > 1 e meio não foi explicitado, padrão é crédito
  let paymentMethod = detectPaymentMethod(workingText)
  if (installmentTotal > 1 && !/\b(pix|dinheiro)\b/i.test(trimmed)) {
    paymentMethod = 'credit'
  }

  workingText = workingText
    .replace(/\b(pix|credito|crédito|cartao|cartão|dinheiro|especie|espécie)\b/gi, ' ')
    .trim()

  // 5. Detectar Categoria
  const category = detectCategory(trimmed, type)
  const catKeywords = CATEGORY_KEYWORDS[category] || []
  for (const kw of catKeywords) {
    if (kw.length >= 4 && kw !== 'spincoffee' && kw !== 'barrinha' && kw !== 'freeroll' && kw !== 'croupier') {
      const reg = new RegExp(`\\b${kw}\\b`, 'gi')
      workingText = workingText.replace(reg, ' ')
    }
  }

  // 6. Detectar Notinha e Nome da Pessoa (ex: 'notinha Luiza', 'para Nalyne', 'Yara', etc.)
  let isThirdParty = false
  let debtorName: string | null = null

  // A: Palavra 'notinha' seguida de nome
  const notinhaMatch = workingText.match(/\b(?:notinha|terceiro|terceiros|devedor|para|da|do)\s+([a-zA-ZÀ-ÿ]+)/i)
  if (notinhaMatch) {
    isThirdParty = true
    debtorName = notinhaMatch[1]
    workingText = workingText.replace(notinhaMatch[0], ' ').trim()
  } else {
    // B: Verificar se contém nomes comuns conhecidos (Luiza, Nalyne, Yara, Marcos, etc.)
    for (const d of COMMON_DEBTORS) {
      const dReg = new RegExp(`\\b${d}\\b`, 'i')
      if (dReg.test(workingText)) {
        isThirdParty = true
        debtorName = d.charAt(0).toUpperCase() + d.slice(1)
        workingText = workingText.replace(dReg, ' ').trim()
        break
      }
    }
  }

  // Se 'notinha' isolada apareceu no texto
  workingText = workingText.replace(/\bnotinha\b/gi, ' ').trim()

  // 7. Descrição final
  let description = workingText.replace(/\s+/g, ' ').trim()
  if (!description) {
    if (isThirdParty && debtorName) {
      description = `Notinha ${debtorName}`
    } else {
      description = category !== 'Outros' ? category : 'Lançamento rápido'
    }
  } else {
    description = description.charAt(0).toUpperCase() + description.slice(1)
  }

  const today = new Date().toISOString().split('T')[0]

  return {
    success: true,
    rawText: trimmed,
    data: {
      kind: 'single',
      type,
      description,
      amount,
      date: today,
      paymentMethod,
      category,
      isThirdParty,
      debtorName,
      installmentCurrent,
      installmentTotal,
    },
  }
}

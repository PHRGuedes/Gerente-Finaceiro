'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCycleForDate, projectInstallmentCycles } from '@/lib/billing'
import { PaymentMethod, TransactionType } from '@/types/database.types'

/**
 * Cria transação(ões) respeitando o Motor de Parcelamentos:
 * Se installment_total > 1, registra a parcela atual no ciclo vigente e
 * projeta e cria automaticamente todas as parcelas futuras nos próximos ciclos de fatura.
 * Se for Notinha/Terceiro, cria também os respectivos registros em `receivables` com as parcelas!
 */
export async function createTransactionAction(formData: {
  type: TransactionType
  description: string
  amount: number
  date: string
  payment_method: PaymentMethod
  category: string
  is_third_party?: boolean
  debtor_name?: string | null
  installment_current?: number
  installment_total?: number
}) {
  const supabase = await createClient()

  const is_third_party = Boolean(formData.is_third_party)
  const debtor_name = is_third_party && formData.debtor_name ? formData.debtor_name.trim() : null
  const installment_current = formData.installment_current && formData.installment_current >= 1 ? formData.installment_current : 1
  const installment_total = formData.installment_total && formData.installment_total >= 1 ? formData.installment_total : 1
  const base_cycle = getCycleForDate(formData.date)

  // 1. Projeção das parcelas (da parcela atual até a última)
  const projections = projectInstallmentCycles(
    formData.date,
    base_cycle,
    installment_current,
    installment_total
  )

  let firstTxId: string | null = null

  // 2. Inserir cada parcela no ciclo correspondente
  for (const proj of projections) {
    const isFirst = proj.installmentCurrent === installment_current

    // Descrição com identificador de parcela se houver mais de 1
    const descWithInstallment =
      installment_total > 1
        ? `${formData.description.trim()} (${proj.installmentCurrent}/${proj.installmentTotal})`
        : formData.description.trim()

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert({
        type: formData.type,
        description: descWithInstallment,
        amount: formData.amount,
        date: proj.projectedDate,
        payment_method: formData.payment_method,
        category: formData.category,
        is_third_party,
        debtor_name,
        installment_current: proj.installmentCurrent,
        installment_total: proj.installmentTotal,
        billing_cycle: proj.cycleId,
      })
      .select('id')
      .single()

    if (txError) {
      console.error('Erro ao inserir transação da parcela:', txError)
      throw new Error(`Falha ao registrar parcela ${proj.installmentCurrent}/${proj.installmentTotal}: ${txError.message}`)
    }

    if (isFirst) {
      firstTxId = tx.id
    }

    // Se for Notinha, cria também nos Recebíveis para cada ciclo projetado
    if (is_third_party && debtor_name) {
      await supabase.from('receivables').insert({
        debtor_name,
        description: descWithInstallment,
        amount: formData.amount,
        installment_current: proj.installmentCurrent,
        installment_total: proj.installmentTotal,
        status: 'pending',
        billing_cycle: proj.cycleId,
        transaction_id: tx.id,
      })
    }
  }

  // 3. Regra: Se for Pix ou Dinheiro, afeta o Saldo Principal apenas na parcela vigente!
  if (formData.payment_method === 'pix' || formData.payment_method === 'cash') {
    const accountType = formData.payment_method === 'pix' ? 'checking' : 'cash'

    const { data: balanceData } = await supabase
      .from('account_balances')
      .select('id, current_balance')
      .eq('account_type', accountType)
      .limit(1)
      .maybeSingle()

    if (balanceData) {
      const delta = formData.type === 'income' ? formData.amount : -formData.amount
      const newBalance = Number(balanceData.current_balance) + delta

      await supabase
        .from('account_balances')
        .update({ current_balance: newBalance })
        .eq('id', balanceData.id)
    }
  }

  revalidatePath('/')
  return { success: true, count: projections.length, firstTxId }
}

/**
 * Cria uma Notinha Avulsa diretamente (com suporte a parcelamento ex: 2/4 ou 2/10)
 */
export async function createReceivableAction(formData: {
  debtor_name: string
  description: string
  amount: number
  installment_current?: number
  installment_total?: number
  billing_cycle?: string
}) {
  const supabase = await createClient()

  const current = formData.installment_current && formData.installment_current >= 1 ? formData.installment_current : 1
  const total = formData.installment_total && formData.installment_total >= 1 ? formData.installment_total : 1
  const today = new Date().toISOString().split('T')[0]
  const base_cycle = formData.billing_cycle || getCycleForDate(today)

  const projections = projectInstallmentCycles(today, base_cycle, current, total)

  for (const proj of projections) {
    const desc =
      total > 1
        ? `${formData.description.trim()} (${proj.installmentCurrent}/${proj.installmentTotal})`
        : formData.description.trim()

    await supabase.from('receivables').insert({
      debtor_name: formData.debtor_name.trim(),
      description: desc,
      amount: formData.amount,
      installment_current: proj.installmentCurrent,
      installment_total: proj.installmentTotal,
      status: 'pending',
      billing_cycle: proj.cycleId,
    })
  }

  revalidatePath('/')
  return { success: true, count: projections.length }
}

/**
 * Botão "Marcar como Recebido (Pix)":
 * 1. Atualiza a notinha daquele mês/parcela para status = 'paid'.
 * 2. Soma o valor recebido DIRETAMENTE ao Saldo Principal (Conta Corrente / Pix).
 * 3. Registra a transação de receita em Pix para conciliação bancária.
 */
export async function markReceivablePaidAction(params: {
  receivableId: string
  creditToBalance?: boolean
  amount: number
  debtorName: string
  installmentInfo?: string // ex: "2/10"
}) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const creditToBalance = params.creditToBalance !== false // padrão é true

  // 1. Atualizar status para 'paid'
  const { error: recError } = await supabase
    .from('receivables')
    .update({ status: 'paid' })
    .eq('id', params.receivableId)

  if (recError) {
    throw new Error(`Erro ao atualizar notinha: ${recError.message}`)
  }

  // 2. Se for para creditar no saldo (padrão solicitado na regra 2)
  if (creditToBalance) {
    const desc = params.installmentInfo
      ? `Recebimento Notinha Pix - ${params.debtorName} (${params.installmentInfo})`
      : `Recebimento Notinha Pix - ${params.debtorName}`

    // Lançamento de Receita Pix
    await supabase.from('transactions').insert({
      type: 'income',
      description: desc,
      amount: params.amount,
      date: today,
      payment_method: 'pix',
      category: 'Notinha / Terceiros',
      is_third_party: false,
    })

    // Somar diretamente ao Saldo Principal (Conta Corrente)
    const { data: balanceData } = await supabase
      .from('account_balances')
      .select('id, current_balance')
      .eq('account_type', 'checking')
      .limit(1)
      .maybeSingle()

    if (balanceData) {
      const newBalance = Number(balanceData.current_balance) + params.amount
      await supabase
        .from('account_balances')
        .update({ current_balance: newBalance })
        .eq('id', balanceData.id)
    }
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Paga a fatura de cartão de crédito
 */
export async function payInvoiceAction(params: {
  cycleId: string
  amount: number
  description?: string
}) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { error: txError } = await supabase.from('transactions').insert({
    type: 'expense',
    description: params.description || `Pagamento Fatura Crédito (${params.cycleId})`,
    amount: params.amount,
    date: today,
    payment_method: 'pix',
    category: 'Contas',
    is_third_party: false,
    billing_cycle: params.cycleId,
  })

  if (txError) {
    throw new Error(`Erro ao registrar pagamento da fatura: ${txError.message}`)
  }

  const { data: balanceData } = await supabase
    .from('account_balances')
    .select('id, current_balance')
    .eq('account_type', 'checking')
    .limit(1)
    .maybeSingle()

  if (balanceData) {
    const newBalance = Number(balanceData.current_balance) - params.amount
    await supabase
      .from('account_balances')
      .update({ current_balance: newBalance })
      .eq('id', balanceData.id)
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Amortização de dívida informal
 */
export async function payInformalDebtAction(params: {
  debtId: string
  amount: number
  creditorName: string
}) {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: debt } = await supabase
    .from('informal_debts')
    .select('paid_amount, total_amount')
    .eq('id', params.debtId)
    .single()

  if (!debt) throw new Error('Dívida não encontrada')

  const newPaidAmount = Number(debt.paid_amount) + params.amount

  await supabase
    .from('informal_debts')
    .update({ paid_amount: newPaidAmount })
    .eq('id', params.debtId)

  await supabase.from('transactions').insert({
    type: 'expense',
    description: `Pagamento Empréstimo - ${params.creditorName}`,
    amount: params.amount,
    date: today,
    payment_method: 'pix',
    category: 'Empréstimo',
    is_third_party: false,
  })

  const { data: balanceData } = await supabase
    .from('account_balances')
    .select('id, current_balance')
    .eq('account_type', 'checking')
    .limit(1)
    .maybeSingle()

  if (balanceData) {
    const newBalance = Number(balanceData.current_balance) - params.amount
    await supabase
      .from('account_balances')
      .update({ current_balance: newBalance })
      .eq('id', balanceData.id)
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Remove uma transação financeira e estorna o saldo se for Pix
 */
export async function deleteTransactionAction(txId: string) {
  const supabase = await createClient()

  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', txId)
    .single()

  if (!tx) return { success: false }

  if (tx.payment_method === 'pix' || tx.payment_method === 'cash') {
    const accountType = tx.payment_method === 'pix' ? 'checking' : 'cash'
    const { data: balanceData } = await supabase
      .from('account_balances')
      .select('id, current_balance')
      .eq('account_type', accountType)
      .limit(1)
      .maybeSingle()

    if (balanceData) {
      const revertDelta = tx.type === 'expense' ? Number(tx.amount) : -Number(tx.amount)
      const newBalance = Number(balanceData.current_balance) + revertDelta

      await supabase
        .from('account_balances')
        .update({ current_balance: newBalance })
        .eq('id', balanceData.id)
    }
  }

  // Deletar recebível vinculado se houver
  await supabase.from('receivables').delete().eq('transaction_id', txId)

  // Deletar transação
  await supabase.from('transactions').delete().eq('id', txId)

  revalidatePath('/')
  return { success: true }
}

/**
 * Remove uma notinha avulsa
 */
export async function deleteReceivableAction(receivableId: string) {
  const supabase = await createClient()
  await supabase.from('receivables').delete().eq('id', receivableId)
  revalidatePath('/')
  return { success: true }
}

/**
 * Sessão de Poker
 */
export async function createPokerSessionAction(params: {
  buyIn: number
  cashOut: number
  date: string
  paymentMethod: PaymentMethod
  descriptionBuyIn?: string
  descriptionCashOut?: string
}) {
  const supabase = await createClient()
  const billing_cycle = getCycleForDate(params.date)

  const { data: buyInTx, error: err1 } = await supabase
    .from('transactions')
    .insert({
      type: 'expense',
      description: params.descriptionBuyIn || 'Sessão Poker (Buy-in / Entrada)',
      amount: params.buyIn,
      date: params.date,
      payment_method: params.paymentMethod,
      category: 'Poker',
      is_third_party: false,
      billing_cycle,
    })
    .select()
    .single()

  if (err1) throw new Error(`Erro ao registrar buy-in: ${err1.message}`)

  const { data: cashOutTx, error: err2 } = await supabase
    .from('transactions')
    .insert({
      type: 'income',
      description: params.descriptionCashOut || 'Sessão Poker (Cashout / Saída)',
      amount: params.cashOut,
      date: params.date,
      payment_method: params.paymentMethod,
      category: 'Poker',
      is_third_party: false,
      billing_cycle,
    })
    .select()
    .single()

  if (err2) throw new Error(`Erro ao registrar cash-out: ${err2.message}`)

  if (params.paymentMethod === 'pix' || params.paymentMethod === 'cash') {
    const accountType = params.paymentMethod === 'pix' ? 'checking' : 'cash'
    const { data: balanceData } = await supabase
      .from('account_balances')
      .select('id, current_balance')
      .eq('account_type', accountType)
      .limit(1)
      .maybeSingle()

    if (balanceData) {
      const netProfit = params.cashOut - params.buyIn
      const newBalance = Number(balanceData.current_balance) + netProfit

      await supabase
        .from('account_balances')
        .update({ current_balance: newBalance })
        .eq('id', balanceData.id)
    }
  }

  revalidatePath('/')
  return { success: true, netProfit: params.cashOut - params.buyIn }
}

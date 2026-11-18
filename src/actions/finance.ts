'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCycleForDate, projectInstallmentCycles } from '@/lib/billing'
import { PaymentMethod, TransactionType } from '@/types/database.types'

/**
 * Obtém o usuário atualmente autenticado ou lança um erro amigável
 */
async function getAuthenticatedUser(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    throw new Error('Acesso não autorizado. Por favor, realize o login.')
  }

  return user
}

/**
 * Ajusta o saldo da conta corrente ou dinheiro do usuário de forma segura e atômica.
 * Se o registro de saldo ainda não existir para o novo usuário, ele é provisionado automaticamente.
 */
async function adjustAccountBalance(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  accountType: 'checking' | 'cash',
  delta: number
) {
  const { data: balanceData } = await supabase
    .from('account_balances')
    .select('id, current_balance')
    .eq('user_id', userId)
    .eq('account_type', accountType)
    .limit(1)
    .maybeSingle()

  if (balanceData) {
    const newBalance = Number(balanceData.current_balance) + delta
    await supabase
      .from('account_balances')
      .update({ current_balance: newBalance })
      .eq('id', balanceData.id)
      .eq('user_id', userId)
  } else {
    await supabase.from('account_balances').insert({
      user_id: userId,
      account_name: accountType === 'checking' ? 'Conta Corrente / Pix' : 'Dinheiro em Espécie',
      account_type: accountType,
      initial_balance: 0.0,
      current_balance: delta,
    })
  }
}

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
  third_party_amount?: number | null
  installment_current?: number
  installment_total?: number
  billing_cycle?: string | null
  is_recurring?: boolean
}) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const is_third_party = Boolean(formData.is_third_party)
  const is_recurring = Boolean(formData.is_recurring)
  const debtor_name = is_third_party && formData.debtor_name ? formData.debtor_name.trim() : null
  const third_party_amount =
    is_third_party && formData.third_party_amount && formData.third_party_amount > 0
      ? Number(formData.third_party_amount)
      : is_third_party
      ? formData.amount
      : null

  const installment_current =
    formData.installment_current && formData.installment_current >= 1
      ? formData.installment_current
      : 1
  const installment_total =
    formData.installment_total && formData.installment_total >= 1
      ? formData.installment_total
      : 1
  const base_cycle = formData.billing_cycle || getCycleForDate(formData.date)

  // 1. Projeção das parcelas (da parcela atual até a última)
  const projections = projectInstallmentCycles(
    formData.date,
    base_cycle,
    installment_current,
    installment_total
  )

  let firstTxId: string | null = null

  // 2. Inserir cada parcela no ciclo correspondente vinculando ao user.id
  for (const proj of projections) {
    const isFirst = proj.installmentCurrent === installment_current

    // Descrição com identificador de parcela se houver mais de 1
    const descWithInstallment =
      installment_total > 1
        ? `${formData.description.trim()} (${proj.installmentCurrent}/${proj.installmentTotal})`
        : formData.description.trim()

    const insertPayload: Record<string, unknown> = {
      user_id: user.id,
      type: formData.type,
      description: descWithInstallment,
      amount: formData.amount,
      date: proj.projectedDate,
      payment_method: formData.payment_method,
      category: formData.category,
      is_third_party,
      debtor_name,
      third_party_amount,
      installment_current: proj.installmentCurrent,
      installment_total: proj.installmentTotal,
      billing_cycle: proj.cycleId,
      is_recurring,
    }

    let { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert(insertPayload as never)
      .select('id')
      .single()

    // Fallback defensivo: se a coluna is_recurring ainda não existir no banco
    if (txError && txError.message?.includes('is_recurring')) {
      delete insertPayload.is_recurring
      const retry = await supabase
        .from('transactions')
        .insert(insertPayload as never)
        .select('id')
        .single()
      tx = retry.data
      txError = retry.error
    }

    if (txError || !tx) {
      console.error('Erro ao inserir transação da parcela:', txError)
      throw new Error(
        `Falha ao registrar parcela ${proj.installmentCurrent}/${proj.installmentTotal}: ${txError?.message || 'Erro desconhecido'}`
      )
    }

    if (isFirst) {
      firstTxId = tx.id
    }

    // Se for Notinha, cria também nos Recebíveis para cada ciclo projetado
    if (is_third_party && debtor_name) {
      await supabase.from('receivables').insert({
        user_id: user.id,
        debtor_name,
        description: descWithInstallment,
        amount: third_party_amount || formData.amount,
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
    const delta = formData.type === 'income' ? formData.amount : -formData.amount
    await adjustAccountBalance(supabase, user.id, accountType, delta)
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
  const user = await getAuthenticatedUser(supabase)

  const current =
    formData.installment_current && formData.installment_current >= 1
      ? formData.installment_current
      : 1
  const total =
    formData.installment_total && formData.installment_total >= 1
      ? formData.installment_total
      : 1
  const today = new Date().toISOString().split('T')[0]
  const base_cycle = formData.billing_cycle || getCycleForDate(today)

  const projections = projectInstallmentCycles(today, base_cycle, current, total)

  for (const proj of projections) {
    const desc =
      total > 1
        ? `${formData.description.trim()} (${proj.installmentCurrent}/${proj.installmentTotal})`
        : formData.description.trim()

    await supabase.from('receivables').insert({
      user_id: user.id,
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
  const user = await getAuthenticatedUser(supabase)
  const today = new Date().toISOString().split('T')[0]
  const creditToBalance = params.creditToBalance !== false // padrão é true

  // 1. Atualizar status para 'paid'
  const { error: recError } = await supabase
    .from('receivables')
    .update({ status: 'paid' })
    .eq('id', params.receivableId)
    .eq('user_id', user.id)

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
      user_id: user.id,
      type: 'income',
      description: desc,
      amount: params.amount,
      date: today,
      payment_method: 'pix',
      category: 'Notinha / Terceiros',
      is_third_party: false,
    })

    // Somar diretamente ao Saldo Principal (Conta Corrente)
    await adjustAccountBalance(supabase, user.id, 'checking', params.amount)
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
  const user = await getAuthenticatedUser(supabase)
  const today = new Date().toISOString().split('T')[0]

  const { error: txError } = await supabase.from('transactions').insert({
    user_id: user.id,
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

  // Debitar do Saldo Principal (Conta Corrente)
  await adjustAccountBalance(supabase, user.id, 'checking', -params.amount)

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
  const user = await getAuthenticatedUser(supabase)
  const today = new Date().toISOString().split('T')[0]

  const { data: debt } = await supabase
    .from('informal_debts')
    .select('paid_amount, total_amount')
    .eq('id', params.debtId)
    .eq('user_id', user.id)
    .single()

  if (!debt) throw new Error('Dívida não encontrada')

  const newPaidAmount = Number(debt.paid_amount) + params.amount

  await supabase
    .from('informal_debts')
    .update({ paid_amount: newPaidAmount })
    .eq('id', params.debtId)
    .eq('user_id', user.id)

  await supabase.from('transactions').insert({
    user_id: user.id,
    type: 'expense',
    description: `Pagamento Empréstimo - ${params.creditorName}`,
    amount: params.amount,
    date: today,
    payment_method: 'pix',
    category: 'Empréstimo',
    is_third_party: false,
  })

  // Debitar do Saldo Principal (Conta Corrente)
  await adjustAccountBalance(supabase, user.id, 'checking', -params.amount)

  revalidatePath('/')
  return { success: true }
}

/**
 * Remove uma transação financeira e estorna o saldo se for Pix
 */
export async function deleteTransactionAction(txId: string) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', txId)
    .eq('user_id', user.id)
    .single()

  if (!tx) return { success: false }

  if (tx.payment_method === 'pix' || tx.payment_method === 'cash') {
    const accountType = tx.payment_method === 'pix' ? 'checking' : 'cash'
    const revertDelta = tx.type === 'expense' ? Number(tx.amount) : -Number(tx.amount)
    await adjustAccountBalance(supabase, user.id, accountType, revertDelta)
  }

  // Deletar recebível vinculado se houver
  await supabase
    .from('receivables')
    .delete()
    .eq('transaction_id', txId)
    .eq('user_id', user.id)

  // Deletar transação
  await supabase
    .from('transactions')
    .delete()
    .eq('id', txId)
    .eq('user_id', user.id)

  revalidatePath('/')
  return { success: true }
}

/**
 * Remove uma notinha avulsa
 */
export async function deleteReceivableAction(receivableId: string) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  await supabase
    .from('receivables')
    .delete()
    .eq('id', receivableId)
    .eq('user_id', user.id)

  revalidatePath('/')
  return { success: true }
}

/**
 * Sessão de Poker Clássica (para histórico e movimentação de conta geral)
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
  const user = await getAuthenticatedUser(supabase)
  const billing_cycle = getCycleForDate(params.date)

  const { error: err1 } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'expense',
      description: params.descriptionBuyIn || 'Sessão Poker (Buy-in / Entrada)',
      amount: params.buyIn,
      date: params.date,
      payment_method: params.paymentMethod,
      category: 'Poker',
      is_third_party: false,
      billing_cycle,
    })

  if (err1) throw new Error(`Erro ao registrar buy-in: ${err1.message}`)

  const { error: err2 } = await supabase
    .from('transactions')
    .insert({
      user_id: user.id,
      type: 'income',
      description: params.descriptionCashOut || 'Sessão Poker (Cashout / Saída)',
      amount: params.cashOut,
      date: params.date,
      payment_method: params.paymentMethod,
      category: 'Poker',
      is_third_party: false,
      billing_cycle,
    })

  if (err2) throw new Error(`Erro ao registrar cash-out: ${err2.message}`)

  if (params.paymentMethod === 'pix' || params.paymentMethod === 'cash') {
    const accountType = params.paymentMethod === 'pix' ? 'checking' : 'cash'
    const netProfit = params.cashOut - params.buyIn
    await adjustAccountBalance(supabase, user.id, accountType, netProfit)
  }

  revalidatePath('/')
  return { success: true, netProfit: params.cashOut - params.buyIn }
}

/**
 * Cria ou atualiza um item de previsão orçamentária (Receita Prevista ou Despesa Fixa).
 */
export async function createForecastItemAction(params: {
  type: 'income' | 'fixed_expense'
  description: string
  amount: number
  is_variable?: boolean
  category?: string
}) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const { data, error } = await supabase
    .from('forecast_items')
    .insert({
      user_id: user.id,
      type: params.type,
      description: params.description.trim(),
      amount: params.amount,
      is_variable: Boolean(params.is_variable),
      active: true,
      category: params.category || (params.type === 'income' ? 'Salário' : 'Contas'),
    })
    .select()
    .single()

  if (error) throw new Error(`Erro ao salvar item de previsão: ${error.message}`)

  revalidatePath('/')
  return { success: true, item: data }
}

/**
 * Atualiza um item de previsão orçamentária.
 */
export async function updateForecastItemAction(
  id: string,
  params: {
    description?: string
    amount?: number
    is_variable?: boolean
    active?: boolean
    category?: string
  }
) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const { error } = await supabase
    .from('forecast_items')
    .update(params)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`Erro ao atualizar item de previsão: ${error.message}`)

  revalidatePath('/')
  return { success: true }
}

/**
 * Remove um item de previsão orçamentária.
 */
export async function deleteForecastItemAction(id: string) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const { error } = await supabase
    .from('forecast_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`Erro ao remover item de previsão: ${error.message}`)

  revalidatePath('/')
  return { success: true }
}

/**
 * Cria uma nova dívida informal.
 */
export async function createInformalDebtAction(params: {
  creditor_name: string
  total_amount: number
  paid_amount?: number
  notes?: string
  due_date?: string | null
}) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const insertPayload: Record<string, unknown> = {
    user_id: user.id,
    creditor_name: params.creditor_name.trim(),
    total_amount: params.total_amount,
    paid_amount: params.paid_amount || 0,
    notes: params.notes ? params.notes.trim() : null,
    due_date: params.due_date || null,
  }

  let { data, error } = await supabase
    .from('informal_debts')
    .insert(insertPayload as never)
    .select()
    .single()

  // Fallback defensivo: se a coluna due_date ainda não existir no banco
  if (error && error.message?.includes('due_date')) {
    delete insertPayload.due_date
    const retry = await supabase
      .from('informal_debts')
      .insert(insertPayload as never)
      .select()
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) throw new Error(`Erro ao cadastrar dívida informal: ${error.message}`)

  revalidatePath('/')
  return { success: true, debt: data }
}

/**
 * Atualiza os dados de uma dívida informal (valor, notas ou data de pagamento).
 */
export async function updateInformalDebtAction(
  id: string,
  params: {
    creditor_name?: string
    total_amount?: number
    paid_amount?: number
    notes?: string | null
    due_date?: string | null
  }
) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const updatePayload: Record<string, unknown> = {}
  if (params.creditor_name !== undefined) updatePayload.creditor_name = params.creditor_name.trim()
  if (params.total_amount !== undefined) updatePayload.total_amount = params.total_amount
  if (params.paid_amount !== undefined) updatePayload.paid_amount = params.paid_amount
  if (params.notes !== undefined) updatePayload.notes = params.notes ? params.notes.trim() : null
  if (params.due_date !== undefined) updatePayload.due_date = params.due_date || null

  let { error } = await supabase
    .from('informal_debts')
    .update(updatePayload as never)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error && error.message?.includes('due_date')) {
    delete updatePayload.due_date
    const retry = await supabase
      .from('informal_debts')
      .update(updatePayload as never)
      .eq('id', id)
      .eq('user_id', user.id)
    error = retry.error
  }

  if (error) throw new Error(`Erro ao atualizar dívida: ${error.message}`)

  revalidatePath('/')
  return { success: true }
}

/**
 * Remove uma dívida informal.
 */
export async function deleteInformalDebtAction(id: string) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const { error } = await supabase
    .from('informal_debts')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) throw new Error(`Erro ao remover dívida: ${error.message}`)

  revalidatePath('/')
  return { success: true }
}

/**
 * Importação em lote de transações (usado pelo Conciliador de CSV do Nubank).
 */
export async function batchCreateTransactionsAction(
  items: {
    type: TransactionType
    description: string
    amount: number
    date: string
    payment_method: PaymentMethod
    category: string
    is_third_party: boolean
    debtor_name?: string | null
    third_party_amount?: number | null
    billing_cycle?: string
    installment_current?: number
    installment_total?: number
  }[]
) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  for (const item of items) {
    const cycle = item.billing_cycle || getCycleForDate(item.date)
    const thirdPartyAmount =
      item.is_third_party && item.third_party_amount && item.third_party_amount > 0
        ? Number(item.third_party_amount)
        : item.is_third_party
        ? item.amount
        : null

    const instCurrent = item.installment_current && item.installment_current >= 1 ? item.installment_current : 1
    const instTotal = item.installment_total && item.installment_total >= 1 ? item.installment_total : 1

    const { data: tx, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: item.type,
        description: item.description.trim(),
        amount: item.amount,
        date: item.date,
        payment_method: item.payment_method,
        category: item.category,
        is_third_party: item.is_third_party,
        debtor_name: item.is_third_party && item.debtor_name ? item.debtor_name.trim() : null,
        third_party_amount: thirdPartyAmount,
        billing_cycle: cycle,
        installment_current: instCurrent,
        installment_total: instTotal,
      })
      .select()
      .single()

    if (error) {
      console.error('Erro na importação em lote:', error)
      throw new Error(`Erro ao importar "${item.description}": ${error.message}`)
    }

    if (item.is_third_party && item.debtor_name) {
      await supabase.from('receivables').insert({
        user_id: user.id,
        debtor_name: item.debtor_name.trim(),
        description: item.description.trim(),
        amount: thirdPartyAmount || item.amount,
        installment_current: instCurrent,
        installment_total: instTotal,
        status: 'pending',
        billing_cycle: cycle,
        transaction_id: tx?.id || null,
      })
    }
  }

  revalidatePath('/')
  return { success: true, count: items.length }
}

/**
 * ==============================================================================
 * AÇÕES DO POKER TRACKER (BANKROLL INDEPENDENTE)
 * Totalmente isolado do saldo de conta e das transações gerais do sistema.
 * ==============================================================================
 */

/**
 * Cadastra uma entrada avulsa de poker (Buy-in / Despesa ou Cashout / Receita).
 */
export async function createPokerEntryAction(params: {
  date: string
  description: string
  game_type: 'tournament' | 'cash'
  entry_type: 'buy_in' | 'cash_out'
  amount: number
  location?: string
  notes?: string
}) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const { data, error } = await supabase
    .from('poker_entries')
    .insert({
      user_id: user.id,
      date: params.date,
      description: params.description.trim(),
      game_type: params.game_type,
      entry_type: params.entry_type,
      amount: params.amount,
      location: params.location ? params.location.trim() : null,
      notes: params.notes ? params.notes.trim() : null,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao cadastrar entrada de poker:', error)
    throw new Error(`Falha ao registrar poker: ${error.message}`)
  }

  revalidatePath('/')
  return { success: true, entry: data }
}

/**
 * Cadastra uma sessão completa de poker no Tracker (Buy-in inicial e Cash-out / Premiação final).
 */
export async function createPokerTrackerSessionAction(params: {
  date: string
  description: string
  game_type: 'tournament' | 'cash'
  buy_in_amount: number
  cash_out_amount: number
  location?: string
  notes?: string
}) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  const inserts = []

  if (params.buy_in_amount > 0) {
    inserts.push({
      user_id: user.id,
      date: params.date,
      description: `${params.description.trim()} (Buy-in)`,
      game_type: params.game_type,
      entry_type: 'buy_in' as const,
      amount: params.buy_in_amount,
      location: params.location ? params.location.trim() : null,
      notes: params.notes ? params.notes.trim() : null,
    })
  }

  if (params.cash_out_amount > 0) {
    inserts.push({
      user_id: user.id,
      date: params.date,
      description: `${params.description.trim()} (Cashout/Prêmio)`,
      game_type: params.game_type,
      entry_type: 'cash_out' as const,
      amount: params.cash_out_amount,
      location: params.location ? params.location.trim() : null,
      notes: params.notes ? params.notes.trim() : null,
    })
  }

  if (inserts.length === 0) {
    throw new Error('Informe ao menos um valor de Buy-in ou Cashout.')
  }

  const { error } = await supabase.from('poker_entries').insert(inserts)

  if (error) {
    console.error('Erro ao cadastrar sessão de poker:', error)
    throw new Error(`Falha ao registrar sessão: ${error.message}`)
  }

  revalidatePath('/')
  return { success: true, count: inserts.length }
}

/**
 * Exclui um lançamento do tracker de poker.
 */
export async function deletePokerEntryAction(id: string) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const { error } = await supabase
    .from('poker_entries')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Erro ao excluir lançamento de poker:', error)
    throw new Error(`Erro ao excluir: ${error.message}`)
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Atualiza um lançamento existente do tracker de poker.
 */
export async function updatePokerEntryAction(
  id: string,
  params: {
    date: string
    description: string
    game_type: 'tournament' | 'cash'
    entry_type: 'buy_in' | 'cash_out'
    amount: number
    location?: string | null
    notes?: string | null
  }
) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const { error } = await supabase
    .from('poker_entries')
    .update({
      date: params.date,
      description: params.description.trim(),
      game_type: params.game_type,
      entry_type: params.entry_type,
      amount: params.amount,
      location: params.location ? params.location.trim() : null,
      notes: params.notes ? params.notes.trim() : null,
    })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Erro ao atualizar lançamento de poker:', error)
    throw new Error(`Erro ao atualizar: ${error.message}`)
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Define / ajusta diretamente o Saldo Principal da Conta Corrente (Pix) do usuário.
 */
export async function setCheckingBalanceAction(newBalance: number) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const { data: balanceData } = await supabase
    .from('account_balances')
    .select('id')
    .eq('user_id', user.id)
    .eq('account_type', 'checking')
    .limit(1)
    .maybeSingle()

  if (balanceData) {
    const { error } = await supabase
      .from('account_balances')
      .update({ current_balance: newBalance })
      .eq('id', balanceData.id)
      .eq('user_id', user.id)

    if (error) throw new Error(`Erro ao ajustar saldo: ${error.message}`)
  } else {
    const { error } = await supabase.from('account_balances').insert({
      user_id: user.id,
      account_name: 'Conta Corrente / Pix',
      account_type: 'checking',
      initial_balance: newBalance,
      current_balance: newBalance,
    })

    if (error) throw new Error(`Erro ao criar saldo: ${error.message}`)
  }

  revalidatePath('/')
  return { success: true, newBalance }
}

/**
 * Atualiza uma transação existente, ajustando o saldo (se Pix/Dinheiro) e sincronizando a notinha vinculada.
 */
export async function updateTransactionAction(
  txId: string,
  formData: {
    type: TransactionType
    description: string
    amount: number
    date: string
    payment_method: PaymentMethod
    category: string
    is_third_party?: boolean
    debtor_name?: string | null
    third_party_amount?: number | null
    is_recurring?: boolean
  }
) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  const { data: oldTx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', txId)
    .eq('user_id', user.id)
    .single()

  if (!oldTx) {
    throw new Error('Transação não encontrada.')
  }

  // 1. Estornar efeito anterior no saldo se era Pix ou Dinheiro
  if (oldTx.payment_method === 'pix' || oldTx.payment_method === 'cash') {
    const oldAccType = oldTx.payment_method === 'pix' ? 'checking' : 'cash'
    const revertDelta = oldTx.type === 'expense' ? Number(oldTx.amount) : -Number(oldTx.amount)
    await adjustAccountBalance(supabase, user.id, oldAccType, revertDelta)
  }

  const is_third_party = Boolean(formData.is_third_party)
  const is_recurring = formData.is_recurring !== undefined ? Boolean(formData.is_recurring) : undefined
  const debtor_name = is_third_party && formData.debtor_name ? formData.debtor_name.trim() : null
  const third_party_amount =
    is_third_party && formData.third_party_amount && formData.third_party_amount > 0
      ? Number(formData.third_party_amount)
      : is_third_party
      ? formData.amount
      : null

  // Se for parcela única (1/1), atualiza o ciclo conforme a nova data; se for parcelado, preserva o deslocamento ou recalcula se data mudou
  const newCycle =
    oldTx.installment_total === 1
      ? getCycleForDate(formData.date)
      : oldTx.billing_cycle || getCycleForDate(formData.date)

  const updatePayload: Record<string, unknown> = {
    type: formData.type,
    description: formData.description.trim(),
    amount: formData.amount,
    date: formData.date,
    payment_method: formData.payment_method,
    category: formData.category,
    is_third_party,
    debtor_name,
    third_party_amount,
    billing_cycle: newCycle,
  }
  if (is_recurring !== undefined) {
    updatePayload.is_recurring = is_recurring
  }

  let { error: updateErr } = await supabase
    .from('transactions')
    .update(updatePayload as never)
    .eq('id', txId)
    .eq('user_id', user.id)

  if (updateErr && updateErr.message?.includes('is_recurring')) {
    delete updatePayload.is_recurring
    const retry = await supabase
      .from('transactions')
      .update(updatePayload as never)
      .eq('id', txId)
      .eq('user_id', user.id)
    updateErr = retry.error
  }

  if (updateErr) {
    throw new Error(`Erro ao atualizar lançamento: ${updateErr.message}`)
  }

  // 2. Aplicar novo efeito no saldo se o método atual for Pix ou Dinheiro
  if (formData.payment_method === 'pix' || formData.payment_method === 'cash') {
    const newAccType = formData.payment_method === 'pix' ? 'checking' : 'cash'
    const newDelta = formData.type === 'income' ? formData.amount : -formData.amount
    await adjustAccountBalance(supabase, user.id, newAccType, newDelta)
  }

  // 3. Sincronizar Notinha (receivables) vinculada
  const { data: existingRec } = await supabase
    .from('receivables')
    .select('id, status')
    .eq('transaction_id', txId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (is_third_party && debtor_name) {
    if (existingRec) {
      await supabase
        .from('receivables')
        .update({
          debtor_name,
          description: formData.description.trim(),
          amount: third_party_amount || formData.amount,
          billing_cycle: newCycle,
        })
        .eq('id', existingRec.id)
        .eq('user_id', user.id)
    } else {
      await supabase.from('receivables').insert({
        user_id: user.id,
        debtor_name,
        description: formData.description.trim(),
        amount: third_party_amount || formData.amount,
        installment_current: oldTx.installment_current,
        installment_total: oldTx.installment_total,
        status: 'pending',
        billing_cycle: newCycle,
        transaction_id: txId,
      })
    }
  } else if (existingRec && existingRec.status === 'pending') {
    await supabase
      .from('receivables')
      .delete()
      .eq('id', existingRec.id)
      .eq('user_id', user.id)
  }

  revalidatePath('/')
  return { success: true }
}

/**
 * Baixa em Lote: Marca várias notinhas pendentes de uma pessoa como Recebidas (Pix) de uma só vez.
 */
export async function markPersonReceivablesPaidAction(params: {
  debtorName: string
  receivableIds: string[]
  creditToBalance?: boolean
}) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)
  const today = new Date().toISOString().split('T')[0]

  if (!params.receivableIds || params.receivableIds.length === 0) {
    throw new Error('Nenhuma notinha selecionada para baixa.')
  }

  const { data: pendingRecs, error: fetchErr } = await supabase
    .from('receivables')
    .select('*')
    .in('id', params.receivableIds)
    .eq('user_id', user.id)
    .eq('status', 'pending')

  if (fetchErr) {
    throw new Error(`Erro ao buscar notinhas: ${fetchErr.message}`)
  }

  if (!pendingRecs || pendingRecs.length === 0) {
    return { success: true, totalReceived: 0, count: 0 }
  }

  const totalReceived = pendingRecs.reduce((acc, curr) => acc + Number(curr.amount), 0)
  const idsToUpdate = pendingRecs.map((r) => r.id)

  const { error: updateErr } = await supabase
    .from('receivables')
    .update({ status: 'paid' })
    .in('id', idsToUpdate)
    .eq('user_id', user.id)

  if (updateErr) {
    throw new Error(`Erro ao baixar notinhas em lote: ${updateErr.message}`)
  }

  if (params.creditToBalance !== false && totalReceived > 0) {
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'income',
      description: `Recebimento Notinhas Pix - ${params.debtorName} (${pendingRecs.length} ${
        pendingRecs.length === 1 ? 'item' : 'itens'
      })`,
      amount: totalReceived,
      date: today,
      payment_method: 'pix',
      category: 'Notinha / Terceiros',
      is_third_party: false,
    })

    await adjustAccountBalance(supabase, user.id, 'checking', totalReceived)
  }

  revalidatePath('/')
  return { success: true, totalReceived, count: pendingRecs.length }
}

/**
 * Replica as assinaturas/recorrências ativas (installment_total = 1) para um ciclo de faturamento destino.
 * Ignora transações já lançadas no ciclo destino com a mesma descrição.
 */
export async function replicateRecurringSubscriptionsAction(targetCycleId: string) {
  const supabase = await createClient()
  const user = await getAuthenticatedUser(supabase)

  // 1. Buscar todas as assinaturas do usuário (is_recurring = true e installment_total = 1)
  const { data: recurringTxs, error: fetchErr } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_recurring', true)
    .eq('installment_total', 1)

  if (fetchErr) throw new Error(`Erro ao buscar assinaturas: ${fetchErr.message}`)
  if (!recurringTxs || recurringTxs.length === 0) {
    return { success: true, count: 0, message: 'Nenhuma assinatura cadastrada para replicar.' }
  }

  // 2. Buscar transações já existentes no ciclo destino
  const { data: existingInCycle, error: existErr } = await supabase
    .from('transactions')
    .select('description')
    .eq('user_id', user.id)
    .eq('billing_cycle', targetCycleId)

  if (existErr) throw new Error(`Erro ao verificar transações do ciclo: ${existErr.message}`)
  const existingSet = new Set(
    (existingInCycle || []).map((t) => t.description.trim().toLowerCase())
  )

  // 3. Pegar apenas as assinaturas únicas por descrição que ainda NÃO estão no ciclo destino
  const toInsertMap = new Map<string, (typeof recurringTxs)[0]>()
  for (const tx of recurringTxs) {
    const key = tx.description.trim().toLowerCase()
    if (!existingSet.has(key) && !toInsertMap.has(key)) {
      toInsertMap.set(key, tx)
    }
  }

  if (toInsertMap.size === 0) {
    return {
      success: true,
      count: 0,
      message: 'Todas as assinaturas cadastradas já estão lançadas neste ciclo.',
    }
  }

  // 4. Calcular data aproximada no novo ciclo (mantendo o dia original da compra ou dia 10)
  const [targetYear, targetMonth] = targetCycleId.split('-').map(Number)

  const insertPayloads = Array.from(toInsertMap.values()).map((orig) => {
    const origDay = orig.date ? Number(orig.date.split('-')[2]) || 10 : 10
    const maxDayInMonth = new Date(targetYear, targetMonth, 0).getDate()
    const safeDay = Math.min(origDay, maxDayInMonth)
    const newDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`

    return {
      user_id: user.id,
      type: orig.type,
      description: orig.description,
      amount: orig.amount,
      date: newDate,
      payment_method: orig.payment_method,
      category: orig.category,
      is_third_party: orig.is_third_party,
      debtor_name: orig.debtor_name,
      third_party_amount: orig.third_party_amount,
      installment_current: 1,
      installment_total: 1,
      billing_cycle: targetCycleId,
      is_recurring: true,
    }
  })

  const { error: insertErr } = await supabase.from('transactions').insert(insertPayloads as never)
  if (insertErr) throw new Error(`Erro ao lançar assinaturas: ${insertErr.message}`)

  revalidatePath('/')
  return {
    success: true,
    count: insertPayloads.length,
    message: `${insertPayloads.length} assinatura(s) lançada(s) com sucesso para o ciclo!`,
  }
}

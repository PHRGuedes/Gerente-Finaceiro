import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentBillingCycle } from '@/lib/billing'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import {
  Transaction,
  Category,
  Receivable,
  InformalDebt,
  ForecastItem,
  AccountBalance,
  PokerEntry,
} from '@/types/finance'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 0. Verificar Usuário Autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const closingDay = Number(user.user_metadata?.closing_day) || 4
  const billingCycle = getCurrentBillingCycle(new Date(), closingDay)

  // 1. Buscar Saldo Principal da Conta Corrente do Usuário
  const { data: balanceRows } = await supabase
    .from('account_balances')
    .select('*')
    .eq('user_id', user.id)
    .eq('account_type', 'checking')
    .limit(1)

  let checkingBalance = 0
  if (balanceRows && balanceRows.length > 0) {
    checkingBalance = Number(balanceRows[0].current_balance)
  } else {
    // Auto-provisionamento de segurança para novos usuários
    await supabase.from('account_balances').insert({
      user_id: user.id,
      account_name: 'Conta Corrente / Pix',
      account_type: 'checking',
      initial_balance: 0.0,
      current_balance: 0.0,
    })
  }

  // 2. Buscar Movimentações do Ciclo Atual do Usuário
  const { data: txRows } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const allTransactions = (txRows || []) as Transaction[]

  // Transações do ciclo atual
  const cycleTransactions = allTransactions.filter(
    (tx) => !tx.billing_cycle || tx.billing_cycle === billingCycle.cycleId
  )

  // Fatura em Formação (Crédito)
  const creditExpenses = cycleTransactions.filter(
    (tx) => tx.type === 'expense' && tx.payment_method === 'credit'
  )

  let ownExpense = 0
  let thirdPartyExpense = 0

  for (const tx of creditExpenses) {
    const totalAmount = Number(tx.amount)
    if (tx.is_third_party) {
      const tpAmount =
        tx.third_party_amount !== null && tx.third_party_amount !== undefined
          ? Number(tx.third_party_amount)
          : totalAmount
      thirdPartyExpense += tpAmount
      ownExpense += Math.max(0, totalAmount - tpAmount)
    } else {
      ownExpense += totalAmount
    }
  }

  const creditInvoiceTotal = ownExpense + thirdPartyExpense

  // 3. Buscar Itens de Previsão Orçamentária do Usuário
  const { data: forecastRows } = await supabase
    .from('forecast_items')
    .select('*')
    .eq('user_id', user.id)
    .order('amount', { ascending: false })

  const allForecastItems = (forecastRows || []) as ForecastItem[]

  // Apenas as despesas fixas ativas
  const fixedItems = allForecastItems.filter(
    (item) => item.type === 'fixed_expense' && item.active
  )
  const fixedTotal = fixedItems.reduce((acc, curr) => acc + Number(curr.amount), 0)

  // 4. Buscar Dívidas do Usuário
  const { data: debtRows } = await supabase
    .from('informal_debts')
    .select('*')
    .eq('user_id', user.id)
    .order('total_amount', { ascending: false })

  const debts = (debtRows || []) as InformalDebt[]
  const totalRemainingDebts = debts.reduce(
    (acc, curr) => acc + (Number(curr.total_amount) - Number(curr.paid_amount)),
    0
  )

  // 5. Buscar Notinhas / Recebíveis do Usuário
  const { data: recRows } = await supabase
    .from('receivables')
    .select('*')
    .eq('user_id', user.id)
    .order('billing_cycle', { ascending: true })

  const allReceivables = (recRows || []) as Receivable[]

  // Notinhas pendentes do ciclo atual
  const pendingInCurrentCycle = allReceivables.filter(
    (r) => r.status === 'pending' && (!r.billing_cycle || r.billing_cycle === billingCycle.cycleId)
  )

  const totalPendingInCurrentCycle = pendingInCurrentCycle.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0
  )

  // 6. Buscar Categorias (Globais do sistema ou do próprio usuário)
  const { data: categoryRows } = await supabase
    .from('categories')
    .select('*')
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .order('name', { ascending: true })

  const categories = (categoryRows || []) as Category[]

  // 7. Buscar Lançamentos de Poker do Usuário (Tracker Independente)
  const { data: pokerRows } = await supabase
    .from('poker_entries')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  const pokerEntries = (pokerRows || []) as PokerEntry[]

  const currentUser = {
    id: user.id,
    email: user.email || '',
    fullName:
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      user.email?.split('@')[0] ||
      'Usuário',
    avatarUrl: (user.user_metadata?.avatar_url as string) || null,
    closingDay,
  }

  return (
    <DashboardShell
      initialData={{
        checkingBalance,
        billingCycle,
        creditInvoice: {
          total: creditInvoiceTotal,
          ownExpense,
          thirdPartyExpense,
        },
        fixedObligations: {
          total: fixedTotal,
          items: fixedItems,
        },
        informalDebts: {
          totalRemaining: totalRemainingDebts,
          items: debts,
        },
        receivables: {
          totalPending: totalPendingInCurrentCycle,
          items: pendingInCurrentCycle,
        },
        allReceivables,
        allForecastItems,
        transactions: allTransactions,
        categories,
        pokerEntries,
        currentUser,
      }}
    />
  )
}

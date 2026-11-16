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
  const billingCycle = getCurrentBillingCycle()

  // 1. Buscar Saldo Principal da Conta Corrente (Pix/Conta)
  const { data: balanceRows } = await supabase
    .from('account_balances')
    .select('*')
    .eq('account_type', 'checking')
    .limit(1)

  const checkingBalance =
    balanceRows && balanceRows.length > 0
      ? Number(balanceRows[0].current_balance)
      : 0

  // 2. Buscar Movimentações do Ciclo Atual
  const { data: txRows } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false })

  const allTransactions = (txRows || []) as Transaction[]

  // Transações do ciclo atual
  const cycleTransactions = allTransactions.filter(
    (tx) => !tx.billing_cycle || tx.billing_cycle === billingCycle.cycleId
  )

  // Fatura em Formação (Crédito)
  const creditExpenses = cycleTransactions.filter(
    (tx) => tx.type === 'expense' && tx.payment_method === 'credit'
  )

  const ownExpense = creditExpenses
    .filter((tx) => !tx.is_third_party)
    .reduce((acc, curr) => acc + Number(curr.amount), 0)

  const thirdPartyExpense = creditExpenses
    .filter((tx) => tx.is_third_party)
    .reduce((acc, curr) => acc + Number(curr.amount), 0)

  const creditInvoiceTotal = ownExpense + thirdPartyExpense

  // 3. Buscar Todos os Itens de Previsão Orçamentária (Fixas e Receitas)
  const { data: forecastRows } = await supabase
    .from('forecast_items')
    .select('*')
    .order('amount', { ascending: false })

  const allForecastItems = (forecastRows || []) as ForecastItem[]

  // Apenas as despesas fixas ativas
  const fixedItems = allForecastItems.filter(
    (item) => item.type === 'fixed_expense' && item.active
  )
  const fixedTotal = fixedItems.reduce((acc, curr) => acc + Number(curr.amount), 0)

  // 4. Buscar Dívidas Informais (ex: Saldo devedor com o Vô)
  const { data: debtRows } = await supabase
    .from('informal_debts')
    .select('*')
    .order('total_amount', { ascending: false })

  const debts = (debtRows || []) as InformalDebt[]
  const totalRemainingDebts = debts.reduce(
    (acc, curr) => acc + (Number(curr.total_amount) - Number(curr.paid_amount)),
    0
  )

  // 5. Buscar Todas as Notinhas / Recebíveis (Atuais e Projetadas Futuras)
  const { data: recRows } = await supabase
    .from('receivables')
    .select('*')
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

  // 6. Buscar Categorias
  const { data: categoryRows } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  const categories = (categoryRows || []) as Category[]

  // 7. Buscar Lançamentos de Poker (Tracker e Bankroll Independente)
  const { data: pokerRows } = await supabase
    .from('poker_entries')
    .select('*')
    .order('date', { ascending: false })

  const pokerEntries = (pokerRows || []) as PokerEntry[]

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
      }}
    />
  )
}

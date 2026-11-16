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

  // Filtrar ou calcular valores do ciclo atual
  // Compras de crédito no ciclo atual (fechamento todo dia 04)
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

  // 3. Buscar Obrigações Fixas (ex: Conta Mãe)
  const { data: forecastRows } = await supabase
    .from('forecast_items')
    .select('*')
    .eq('type', 'fixed_expense')
    .eq('active', true)

  const fixedItems = (forecastRows || []) as ForecastItem[]
  const fixedTotal = fixedItems.reduce((acc, curr) => acc + Number(curr.amount), 0)

  // 4. Buscar Dívidas Informais (ex: Saldo devedor com o Vô)
  const { data: debtRows } = await supabase
    .from('informal_debts')
    .select('*')

  const debts = (debtRows || []) as InformalDebt[]
  const totalRemainingDebts = debts.reduce(
    (acc, curr) => acc + (Number(curr.total_amount) - Number(curr.paid_amount)),
    0
  )

  // 5. Buscar Total de Notinhas a Receber no ciclo
  const { data: recRows } = await supabase
    .from('receivables')
    .select('*')
    .eq('status', 'pending')

  const pendingReceivables = (recRows || []) as Receivable[]
  const totalPendingReceivables = pendingReceivables.reduce(
    (acc, curr) => acc + Number(curr.amount),
    0
  )

  // 6. Buscar Categorias para mapear ícones e cores
  const { data: categoryRows } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  const categories = (categoryRows || []) as Category[]

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
          totalPending: totalPendingReceivables,
          items: pendingReceivables,
        },
        transactions: allTransactions,
        categories,
      }}
    />
  )
}

import { Database } from './database.types'

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Enums<T extends keyof Database['public']['Enums']> = Database['public']['Enums'][T]

export type Transaction = Tables<'transactions'>
export type Receivable = Tables<'receivables'>
export type InformalDebt = Tables<'informal_debts'>
export type ForecastItem = Tables<'forecast_items'>
export type Category = Tables<'categories'>
export type AccountBalance = Tables<'account_balances'>

export type PaymentMethod = Database['public']['Enums']['payment_method']
export type TransactionType = Database['public']['Enums']['transaction_type']
export type ReceivableStatus = Database['public']['Enums']['receivable_status']
export type ForecastType = Database['public']['Enums']['forecast_type']
export type CategoryType = Database['public']['Enums']['category_type']
export type AccountType = Database['public']['Enums']['account_type']

// Form and Mutation Payloads
export type CreateTransactionInput = Database['public']['Tables']['transactions']['Insert']
export type UpdateTransactionInput = Database['public']['Tables']['transactions']['Update']

export type CreateReceivableInput = Database['public']['Tables']['receivables']['Insert']
export type UpdateReceivableInput = Database['public']['Tables']['receivables']['Update']

export type CreateInformalDebtInput = Database['public']['Tables']['informal_debts']['Insert']
export type UpdateInformalDebtInput = Database['public']['Tables']['informal_debts']['Update']

export type CreateForecastItemInput = Database['public']['Tables']['forecast_items']['Insert']
export type UpdateForecastItemInput = Database['public']['Tables']['forecast_items']['Update']

export type CreateAccountBalanceInput = Database['public']['Tables']['account_balances']['Insert']
export type UpdateAccountBalanceInput = Database['public']['Tables']['account_balances']['Update']

// Financial Summary Interfaces
export interface FinancialSummary {
  totalIncome: number
  totalExpense: number
  netBalance: number
  pendingReceivables: number
  totalInformalDebts: number
  paidInformalDebts: number
  remainingInformalDebts: number
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PaymentMethod = 'pix' | 'credit' | 'cash'
export type TransactionType = 'income' | 'expense'
export type ReceivableStatus = 'pending' | 'paid'
export type ForecastType = 'income' | 'fixed_expense'
export type CategoryType = 'income' | 'expense' | 'both'
export type AccountType = 'checking' | 'cash' | 'savings' | 'investment' | 'credit'
export type PokerGameType = 'tournament' | 'cash'
export type PokerEntryType = 'buy_in' | 'cash_out'

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string
          user_id: string | null
          name: string
          type: CategoryType
          icon: string | null
          color: string | null
          is_default: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          name: string
          type?: CategoryType
          icon?: string | null
          color?: string | null
          is_default?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          name?: string
          type?: CategoryType
          icon?: string | null
          color?: string | null
          is_default?: boolean
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          type: TransactionType
          description: string
          amount: number
          date: string
          payment_method: PaymentMethod
          category: string
          is_third_party: boolean
          debtor_name: string | null
          third_party_amount: number | null
          installment_current: number
          installment_total: number
          billing_cycle: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          type: TransactionType
          description: string
          amount: number
          date?: string
          payment_method: PaymentMethod
          category: string
          is_third_party?: boolean
          debtor_name?: string | null
          third_party_amount?: number | null
          installment_current?: number
          installment_total?: number
          billing_cycle?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: TransactionType
          description?: string
          amount?: number
          date?: string
          payment_method?: PaymentMethod
          category?: string
          is_third_party?: boolean
          debtor_name?: string | null
          third_party_amount?: number | null
          installment_current?: number
          installment_total?: number
          billing_cycle?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      receivables: {
        Row: {
          id: string
          user_id: string
          debtor_name: string
          description: string
          amount: number
          installment_current: number
          installment_total: number
          status: ReceivableStatus
          billing_cycle: string | null
          transaction_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          debtor_name: string
          description: string
          amount: number
          installment_current?: number
          installment_total?: number
          status?: ReceivableStatus
          billing_cycle?: string | null
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          debtor_name?: string
          description?: string
          amount?: number
          installment_current?: number
          installment_total?: number
          status?: ReceivableStatus
          billing_cycle?: string | null
          transaction_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      informal_debts: {
        Row: {
          id: string
          user_id: string
          creditor_name: string
          total_amount: number
          paid_amount: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          creditor_name: string
          total_amount: number
          paid_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          creditor_name?: string
          total_amount?: number
          paid_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      forecast_items: {
        Row: {
          id: string
          user_id: string
          type: ForecastType
          description: string
          amount: number
          is_variable: boolean
          active: boolean
          category: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          type: ForecastType
          description: string
          amount: number
          is_variable?: boolean
          active?: boolean
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: ForecastType
          description?: string
          amount?: number
          is_variable?: boolean
          active?: boolean
          category?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      account_balances: {
        Row: {
          id: string
          user_id: string
          account_name: string
          account_type: AccountType
          initial_balance: number
          current_balance: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string
          account_name: string
          account_type?: AccountType
          initial_balance?: number
          current_balance?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_name?: string
          account_type?: AccountType
          initial_balance?: number
          current_balance?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      poker_entries: {
        Row: {
          id: string
          user_id: string | null
          date: string
          description: string
          game_type: PokerGameType
          entry_type: PokerEntryType
          amount: number
          location: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          date?: string
          description: string
          game_type: PokerGameType
          entry_type: PokerEntryType
          amount: number
          location?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          date?: string
          description?: string
          game_type?: PokerGameType
          entry_type?: PokerEntryType
          amount?: number
          location?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      payment_method: PaymentMethod
      transaction_type: TransactionType
      receivable_status: ReceivableStatus
      forecast_type: ForecastType
      category_type: CategoryType
      account_type: AccountType
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

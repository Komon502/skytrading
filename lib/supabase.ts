import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      wallets: {
        Row: {
          id: string
          user_id: string
          demo_balance: number
          real_balance: number
          created_at: string
          updated_at: string
        }
      }
      trades: {
        Row: {
          id: string
          user_id: string
          mode: 'demo' | 'real'
          symbol: string
          type: 'buy' | 'sell'
          quantity: number
          price: number
          total: number
          status: 'open' | 'closed'
          created_at: string
          closed_at: string | null
          close_price: number | null
          pnl: number | null
        }
      }
      deposits: {
        Row: {
          id: string
          user_id: string
          amount: number
          slip_url: string
          slipok_ref: string | null
          status: 'pending' | 'verified' | 'rejected'
          created_at: string
        }
      }
    }
  }
}

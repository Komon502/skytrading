import { createClient } from '@supabase/supabase-js'

// Prefer explicit environment variables, but fall back to the project's
// example values so server-side rendering doesn't crash if envs are missing.
// NOTE: If you are deploying, set the real values in Vercel/hosting env vars.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL ||
  'https://mbquqkstbjtusmamascm.supabase.co'

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1icXVxa3N0Ymp0dXNtYW1hc2NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxNDc1NzAsImV4cCI6MjA5NTcyMzU3MH0.t_8o3V-uPBvps28q4hcNfS-koSdu6b5ZUtO7e6phxyw'

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

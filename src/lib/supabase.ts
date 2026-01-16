import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface Inspection {
  id: string
  created_at: string
  updated_at: string
  customer_name: string
  address: string
  technician_name: string
  inspection_date: string
  notes: string
}

export interface InspectionItem {
  id: string
  inspection_id: string
  category: string
  item_name: string
  completed: boolean
  notes: string
  severity: number
  created_at: string
}

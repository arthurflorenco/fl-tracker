'use client'
import { createBrowserClient } from '@supabase/ssr'
import { supabaseAnonKey, supabaseUrl } from './config'

/** Cliente Supabase no browser (upload de fotografias, futura sincronização offline). Ainda não usado. */
export function criarClienteBrowser() {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase não configurado (.env.local).')
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

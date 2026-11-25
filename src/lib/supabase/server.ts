import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { supabaseAnonKey, supabaseUrl } from './config'

/**
 * Cliente Supabase para server components e server actions, com a sessão do
 * utilizador (cookies) — as políticas RLS aplicam-se a esta pessoa.
 * Ainda não usado: ver docs/arquitetura.md, "Ligar o Supabase".
 */
export async function criarClienteServidor() {
  if (!supabaseUrl || !supabaseAnonKey) throw new Error('Supabase não configurado (.env.local).')
  const store = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (lista) => {
        try {
          lista.forEach(({ name, value, options }) => store.set(name, value, options))
        } catch {
          // Chamado a partir de um server component: o proxy trata da renovação da sessão.
        }
      },
    },
  })
}

'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { MODO_DEMO } from '@/lib/demo'
import { reporDb } from '@/lib/mock/store'
import { COOKIE_SESSAO } from '@/lib/session'

/** DEMONSTRAÇÃO: apaga o que os visitantes gravaram, volta aos dados fictícios e termina a sessão. */
export async function reporDemo() {
  if (!MODO_DEMO) return
  await reporDb()
  ;(await cookies()).delete(COOKIE_SESSAO)
  redirect('/entrar')
}

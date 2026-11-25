/**
 * Sessão de DEMONSTRAÇÃO: um cookie ASSINADO (HMAC) com o id do perfil escolhido em /entrar.
 * Um cookie alterado à mão não passa na verificação (src/lib/assinatura.ts).
 * Substituir por Supabase Auth (login individual por email) ao ligar o backend —
 * a assinatura de `getSessao`/`exigirSessao` mantém-se.
 */
import 'server-only'
import { cookies } from 'next/headers'
import { notFound, redirect } from 'next/navigation'
import { db, sincronizarDb } from '@/lib/mock/store'
import { assinar, segredoSessao, verificar } from '@/lib/assinatura'
import { podeVerArea, type Area } from '@/lib/permissions'
import type { Perfil } from '@/modules/utilizadores/schema'

export const COOKIE_SESSAO = 'fl-sessao'

export async function getSessao(): Promise<Perfil | null> {
  // Ponto de entrada de todas as páginas e ações: traz os dados mais recentes (demonstração no Netlify).
  await sincronizarDb()
  const id = verificar((await cookies()).get(COOKIE_SESSAO)?.value, segredoSessao())
  if (!id) return null
  return db().perfis.find((p) => p.id === id && p.ativo) ?? null
}

/** Grava o cookie de sessão assinado (httpOnly: o JavaScript da página não o consegue ler). */
export async function iniciarSessao(perfilId: string) {
  ;(await cookies()).set(COOKIE_SESSAO, assinar(perfilId, segredoSessao()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

export async function exigirSessao(): Promise<Perfil> {
  const s = await getSessao()
  if (!s || !podeVerArea(s.papel, 'painel')) redirect('/entrar')
  return s
}

export async function exigirArea(area: Area): Promise<Perfil> {
  const s = await exigirSessao()
  if (!podeVerArea(s.papel, area)) notFound()
  return s
}

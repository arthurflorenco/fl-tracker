'use server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/mock/store'
import { COOKIE_SESSAO, iniciarSessao } from '@/lib/session'
import { destinoSeguro } from '@/lib/assinatura'
import { podeVerArea } from '@/lib/permissions'

/** DEMONSTRAÇÃO: entra como o perfil escolhido. Substituir por Supabase Auth (email + palavra-passe / link mágico). */
export async function entrar(formData: FormData) {
  const id = String(formData.get('perfilId') ?? '')
  const perfil = db().perfis.find((p) => p.id === id && p.ativo)
  if (!perfil || !podeVerArea(perfil.papel, 'painel')) redirect('/entrar')
  await iniciarSessao(perfil.id)
  redirect(destinoSeguro(formData.get('destino')))
}

export async function sair() {
  ;(await cookies()).delete(COOKIE_SESSAO)
  redirect('/entrar')
}

'use server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { COOKIE_IDIOMA, eIdioma } from './config'

/** Muda o idioma da interface (cookie de 1 ano) e volta a desenhar a página. */
export async function definirIdioma(idioma: string) {
  if (!eIdioma(idioma)) return
  ;(await cookies()).set(COOKIE_IDIOMA, idioma, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
  revalidatePath('/', 'layout')
}

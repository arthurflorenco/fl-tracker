import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { COOKIE_IDIOMA, IDIOMA_PADRAO, eIdioma, type Idioma } from './config'
import { formatadores } from './formatar'
import { traduzirMensagem } from './mensagens'
import type { Metadata } from 'next'
import { DICIONARIOS, type Dicionario } from './index'

/** Idioma do pedido (cookie `fl-idioma`); inglês se não houver escolha. */
export const getIdioma = cache(async (): Promise<Idioma> => {
  const v = (await cookies()).get(COOKIE_IDIOMA)?.value
  return eIdioma(v) ? v : IDIOMA_PADRAO
})

/** Textos (`t`), formatadores (`f`) e tradutor de mensagens (`msg`) do idioma do pedido. */
export async function getI18n() {
  const idioma = await getIdioma()
  return { idioma, t: DICIONARIOS[idioma], f: formatadores(idioma), msg: (texto: string) => traduzirMensagem(texto, idioma) }
}

/** `export const generateMetadata = tituloDaPagina('obras')` — título do separador do browser no idioma certo. */
export const tituloDaPagina = (chave: keyof Dicionario['titulos']) => async (): Promise<Metadata> => ({
  title: (await getI18n()).t.titulos[chave],
})

'use client'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { IDIOMA_PADRAO, type Idioma } from './config'
import { formatadores } from './formatar'
import { traduzirMensagem } from './mensagens'
import { DICIONARIOS } from './index'

const IdiomaContext = createContext<Idioma>(IDIOMA_PADRAO)

/** Posto no layout raiz com o idioma lido no servidor (cookie). */
export function IdiomaProvider({ idioma, children }: { idioma: Idioma; children: ReactNode }) {
  return <IdiomaContext.Provider value={idioma}>{children}</IdiomaContext.Provider>
}

/** Em componentes de cliente: `const { t, f, msg } = useI18n()`. */
export function useI18n() {
  const idioma = useContext(IdiomaContext)
  return useMemo(
    () => ({ idioma, t: DICIONARIOS[idioma], f: formatadores(idioma), msg: (texto: string) => traduzirMensagem(texto, idioma) }),
    [idioma],
  )
}

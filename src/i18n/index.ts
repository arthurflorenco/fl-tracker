import type { Idioma } from './config'
import { en } from './en'
import { pt, type Dicionario } from './pt'

export type { Dicionario }
export const DICIONARIOS: Record<Idioma, Dicionario> = { en, pt }

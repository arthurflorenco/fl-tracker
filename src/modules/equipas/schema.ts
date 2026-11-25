import { z } from 'zod'

export const TIPOS_EQUIPA = ['escritorio', 'fabricacao', 'montagem'] as const
export type TipoEquipa = (typeof TIPOS_EQUIPA)[number]

export const TIPO_EQUIPA_LABEL: Record<TipoEquipa, string> = {
  escritorio: 'Escritório',
  fabricacao: 'Fabricação',
  montagem: 'Montagem',
}

export interface Equipa {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  nome: string
  tipo: TipoEquipa
  ativa: boolean
}

export const novaEquipaSchema = z.object({
  nome: z.string().trim().min(2, 'Indique o nome da equipa.'),
  tipo: z.enum(TIPOS_EQUIPA),
})

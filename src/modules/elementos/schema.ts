import { z } from 'zod'

export const TIPOS_ELEMENTO = ['janela', 'porta', 'porta_correr', 'vidro', 'estore', 'pergola', 'outro'] as const
export type TipoElemento = (typeof TIPOS_ELEMENTO)[number]

export const TIPO_ELEMENTO_LABEL: Record<TipoElemento, string> = {
  janela: 'Janela',
  porta: 'Porta',
  porta_correr: 'Porta de correr',
  vidro: 'Vidro',
  estore: 'Estore',
  pergola: 'Pérgola',
  outro: 'Outro',
}

export const ESTADOS_ELEMENTO = ['por_fabricar', 'em_fabricacao', 'fabricado', 'expedido', 'montado', 'verificado'] as const
export type EstadoElemento = (typeof ESTADOS_ELEMENTO)[number]

export const ESTADO_ELEMENTO_LABEL: Record<EstadoElemento, string> = {
  por_fabricar: 'Por fabricar',
  em_fabricacao: 'Em fabricação',
  fabricado: 'Fabricado',
  expedido: 'Expedido',
  montado: 'Montado',
  verificado: 'Verificado',
}

export interface Elemento {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  obraId: string
  /** Referência na obra, ex.: "J01", "P02". */
  referencia: string
  tipo: TipoElemento
  descricao: string
  divisao: string | null
  estado: EstadoElemento
  /** QR Code secundário — só quando é preciso rastrear o elemento individualmente. */
  qrAtivo: boolean
  qrToken: string
}

export const novoElementoSchema = z.object({
  obraId: z.string().min(1),
  referencia: z.string().trim().min(1, 'Indique a referência.').max(12),
  tipo: z.enum(TIPOS_ELEMENTO),
  descricao: z.string().trim().min(2, 'Descreva o elemento.'),
  divisao: z.string().trim().optional(),
})

export const alterarEstadoElementoSchema = z.object({
  elementoId: z.string().min(1),
  estado: z.enum(ESTADOS_ELEMENTO),
})

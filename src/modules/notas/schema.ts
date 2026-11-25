import { z } from 'zod'

export const TIPOS_NOTA = [
  'observacao',
  'problema',
  'atraso',
  'material_em_falta',
  'alteracao_solicitada',
  'nao_conformidade',
  'conclusao_etapa',
] as const
export type TipoNota = (typeof TIPOS_NOTA)[number]

export const TIPO_NOTA_LABEL: Record<TipoNota, string> = {
  observacao: 'Observação geral',
  problema: 'Problema',
  atraso: 'Atraso',
  material_em_falta: 'Material em falta',
  alteracao_solicitada: 'Alteração solicitada',
  nao_conformidade: 'Não conformidade',
  conclusao_etapa: 'Conclusão da etapa',
}

/** Tipos que contam como "problema em aberto" no painel. */
export const TIPOS_NOTA_ALERTA: TipoNota[] = ['problema', 'atraso', 'material_em_falta', 'nao_conformidade']

export interface Nota {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  clientId: string
  obraId: string
  obraEtapaId: string | null
  elementoId: string | null
  tipo: TipoNota
  texto: string
  /** Notas internas nunca são mostradas ao cliente (Fase 2). Por defeito, tudo é interno. */
  interna: boolean
  resolvida: boolean
  autorId: string
  criadoEm: string
  arquivadoEm: string | null
}

export const novaNotaSchema = z.object({
  clientId: z.uuid(),
  obraId: z.string().min(1),
  obraEtapaId: z
    .string()
    .optional()
    .transform((v) => v || null),
  elementoId: z
    .string()
    .optional()
    .transform((v) => v || null),
  tipo: z.enum(TIPOS_NOTA),
  texto: z.string().trim().min(2, 'Escreva a nota.').max(2000),
})

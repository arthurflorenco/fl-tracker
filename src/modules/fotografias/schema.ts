import { z } from 'zod'

export interface Fotografia {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  clientId: string
  obraId: string
  obraEtapaId: string | null
  elementoId: string | null
  notaId: string | null
  /** Caminho no Supabase Storage. No modo de demonstração guarda um data URL. */
  caminho: string
  legenda: string | null
  /** Fase 2: só fotografias aprovadas aparecem no portal do cliente. */
  aprovadaCliente: boolean
  autorId: string
  criadoEm: string
  arquivadoEm: string | null
}

/** Limite depois da compressão no dispositivo (ver lib/imagem.ts). */
export const FOTO_MAX_BYTES = 900_000

export const novaFotografiaSchema = z.object({
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
  legenda: z.string().trim().max(200).optional(),
  dataUrl: z
    .string()
    .startsWith('data:image/', 'Ficheiro inválido.')
    .max(Math.ceil((FOTO_MAX_BYTES * 4) / 3) + 100, 'Fotografia demasiado grande.'),
})

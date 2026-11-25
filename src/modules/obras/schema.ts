import { z } from 'zod'

export const ESTADOS_OBRA = ['ativa', 'suspensa', 'concluida', 'arquivada'] as const
export type EstadoObra = (typeof ESTADOS_OBRA)[number]

export const ESTADO_OBRA_LABEL: Record<EstadoObra, string> = {
  ativa: 'Em curso',
  suspensa: 'Suspensa',
  concluida: 'Concluída',
  arquivada: 'Arquivada',
}

export interface Obra {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  /** Código visível e no QR, ex.: "2026-014". */
  codigo: string
  projetoId: string
  clienteId: string
  titulo: string
  morada: string | null
  estado: EstadoObra
  /** Token opaco usado no URL do QR Code da obra (/q/<token>). */
  qrToken: string
  dataInicio: string
  dataPrevistaFim: string | null
  /** € contratado (copiado do valor da proposta na conversão). Dado financeiro: só administração. */
  valorContratado: number | null
  criadoEm: string
}

/**
 * Responsável pela obra (N:N: uma obra tem vários responsáveis; uma pessoa, várias obras).
 * Remover não apaga: marca `removidoEm` (fica no histórico quem foi responsável e quando).
 */
export interface ObraResponsavel {
  id: string
  empresaId: string
  obraId: string
  perfilId: string
  criadoEm: string
  removidoEm: string | null
}

export const responsavelSchema = z.object({
  obraId: z.string().min(1),
  perfilId: z.string().min(1, 'Escolha uma pessoa.'),
})

/** Equipas atribuídas à obra (os funcionários só veem as obras das suas equipas). */
export interface ObraEquipa {
  empresaId: string
  obraId: string
  equipaId: string
}

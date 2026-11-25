import { z } from 'zod'
import type { Origem } from '@/modules/auditoria/schema'

/** Fase 2 (offline): estado de sincronização de cada registo feito no dispositivo. */
export const ESTADOS_SYNC = ['sincronizado', 'pendente', 'erro'] as const
export type EstadoSync = (typeof ESTADOS_SYNC)[number]

export interface RegistoTempo {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  /** Gerado no dispositivo; garante que um registo offline não é duplicado ao sincronizar. */
  clientId: string
  obraId: string
  obraEtapaId: string
  atividadeId: string | null
  elementoId: string | null
  perfilId: string
  equipaId: string | null
  inicio: string
  fim: string | null
  /** Minutos; calculado quando o registo termina. */
  duracaoMin: number | null
  nota: string | null
  origem: Origem
  estadoSync: EstadoSync
  criadoEm: string
  arquivadoEm: string | null
}

/** "HH:MM" em quartos de hora ("24:00" = fim do dia). Ver src/lib/quartos.ts. */
const hora = z.string().regex(/^(([01]\d|2[0-3]):(00|15|30|45)|24:00)$/, 'Escolha uma hora em quartos de hora.')
const opcional = (s: z.ZodString) => z.preprocess((v) => (v === '' ? undefined : v), s.optional())

const contexto = {
  obraId: z.string().min(1),
  obraEtapaId: z.string().min(1, 'Escolha a etapa.'),
  atividadeId: z
    .string()
    .optional()
    .transform((v) => v || null),
  elementoId: z
    .string()
    .optional()
    .transform((v) => v || null),
}

export const iniciarTempoSchema = z.object({
  clientId: z.uuid(),
  ...contexto,
  /** Hora de início de hoje; vazio = agora (arredondado para baixo). */
  inicio: opcional(hora),
})

export const terminarTempoSchema = z.object({
  registoId: z.string().min(1),
  /** Hora de fim; vazio = agora (arredondado para cima). */
  fim: opcional(hora),
  nota: z.string().trim().max(500).optional(),
})

/** Horas já feitas, lançadas à mão (até 7 dias atrás). */
export const registarHorasSchema = z
  .object({
    clientId: z.uuid(),
    ...contexto,
    data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Escolha o dia.'),
    inicio: hora,
    fim: hora,
    nota: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.fim > v.inicio, { message: 'A hora de fim tem de ser depois do início.', path: ['fim'] })

export const corrigirTempoSchema = z
  .object({
    registoId: z.string().min(1),
    inicio: z.iso.datetime({ local: true, message: 'Data de início inválida.' }),
    fim: z.iso.datetime({ local: true, message: 'Data de fim inválida.' }),
    motivo: z.string().trim().min(3, 'Indique o motivo da correção.'),
  })
  .refine((v) => v.fim > v.inicio, { message: 'O fim tem de ser depois do início.', path: ['fim'] })

export const arquivarTempoSchema = z.object({
  registoId: z.string().min(1),
  motivo: z.string().trim().min(3, 'Indique o motivo.'),
})

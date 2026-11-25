import { z } from 'zod'

/** Etapa configurável (modelo). Cada obra copia as etapas ativas quando é criada. */
export interface EtapaModelo {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  nome: string
  ordem: number
  ativa: boolean
  /** Fase 2: o portal do cliente só mostra etapas marcadas como visíveis. */
  visivelCliente: boolean
}

export interface Atividade {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  etapaModeloId: string
  nome: string
  ativa: boolean
}

export const ESTADOS_ETAPA = ['por_iniciar', 'em_curso', 'bloqueada', 'concluida'] as const
export type EstadoEtapa = (typeof ESTADOS_ETAPA)[number]

export const ESTADO_ETAPA_LABEL: Record<EstadoEtapa, string> = {
  por_iniciar: 'Por iniciar',
  em_curso: 'Em curso',
  bloqueada: 'Bloqueada',
  concluida: 'Concluída',
}

export interface ObraEtapa {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  obraId: string
  etapaModeloId: string
  nome: string
  ordem: number
  estado: EstadoEtapa
  visivelCliente: boolean
  dataPrevista: string | null
  iniciadaEm: string | null
  concluidaEm: string | null
  /** Horas orçamentadas para a etapa (previsto vs. real). Só a administração edita. */
  horasPrevistas: number | null
}

export const novaEtapaSchema = z.object({
  nome: z.string().trim().min(2, 'Indique o nome.'),
  visivelCliente: z.boolean(),
})

export const novaAtividadeSchema = z.object({
  etapaModeloId: z.string().min(1),
  nome: z.string().trim().min(2, 'Indique o nome.'),
})

export const alterarEstadoEtapaSchema = z.object({
  obraEtapaId: z.string().min(1),
  estado: z.enum(ESTADOS_ETAPA),
  motivo: z.string().trim().optional(),
})

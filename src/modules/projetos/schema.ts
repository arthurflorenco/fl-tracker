import { z } from 'zod'

export const ESTADOS_PROJETO = ['pedido', 'medicao', 'proposta', 'em_revisao', 'aprovado', 'recusado'] as const
export const estadoProjetoSchema = z.enum(ESTADOS_PROJETO)
export type EstadoProjeto = z.infer<typeof estadoProjetoSchema>

export const ESTADO_PROJETO_LABEL: Record<EstadoProjeto, string> = {
  pedido: 'Pedido recebido',
  medicao: 'Medição',
  proposta: 'Proposta enviada',
  em_revisao: 'Em revisão',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
}

export interface Cliente {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  nome: string
  email: string | null
  telefone: string | null
  nif: string | null
}

export interface Projeto {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  /** Referência interna, ex.: "P-2026-031". */
  referencia: string
  titulo: string
  clienteId: string
  morada: string | null
  estado: EstadoProjeto
  valorProposta: number | null
  responsavelId: string
  obraId: string | null
  criadoEm: string
  atualizadoEm: string
}

export const novoProjetoSchema = z.object({
  titulo: z.string().trim().min(3, 'Indique um título.'),
  clienteNome: z.string().trim().min(2, 'Indique o cliente.'),
  clienteEmail: z.union([z.email('Email inválido.'), z.literal('')]).optional(),
  clienteTelefone: z.string().trim().optional(),
  morada: z.string().trim().optional(),
})

export const alterarEstadoProjetoSchema = z.object({
  projetoId: z.string().min(1),
  estado: estadoProjetoSchema,
  motivo: z.string().trim().optional(),
})

export const converterEmObraSchema = z.object({
  projetoId: z.string().min(1),
  equipaIds: z.preprocess((v) => v ?? [], z.array(z.string()).min(1, 'Atribua pelo menos uma equipa.')),
  dataPrevistaFim: z.string().optional(),
})

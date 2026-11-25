import { z } from 'zod'

/**
 * Todos os papéis previstos no produto. `pos_venda` e `cliente` existem já no
 * modelo (e no enum da base de dados) mas só ficam atribuíveis na Fase 2.
 */
export const PAPEIS = ['admin', 'orcamentacao', 'compras', 'fabricacao', 'montagem', 'pos_venda', 'cliente'] as const
export const papelSchema = z.enum(PAPEIS)
export type Papel = z.infer<typeof papelSchema>

/** Papéis que se podem atribuir na Fase 1. */
export const PAPEIS_FASE1 = ['admin', 'orcamentacao', 'compras', 'fabricacao', 'montagem'] as const satisfies readonly Papel[]

export const PAPEL_LABEL: Record<Papel, string> = {
  admin: 'Administração',
  orcamentacao: 'Orçamentação',
  compras: 'Compras',
  fabricacao: 'Fabricação',
  montagem: 'Montagem',
  pos_venda: 'Pós-venda',
  cliente: 'Cliente',
}

export interface Perfil {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  nome: string
  email: string
  papel: Papel
  equipaId: string | null
  ativo: boolean
  criadoEm: string
}

export const novoUtilizadorSchema = z.object({
  nome: z.string().trim().min(2, 'Indique o nome.'),
  email: z.email('Email inválido.'),
  papel: z.enum(PAPEIS_FASE1),
  equipaId: z
    .string()
    .optional()
    .transform((v) => v || null),
})

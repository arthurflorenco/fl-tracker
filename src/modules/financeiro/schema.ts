import { z } from 'zod'

/**
 * Dados financeiros: só a administração vê e altera (UI, ações e RLS).
 * Nunca entram na vista do cliente (`vistaCliente`).
 */

/** Custo/hora de uma pessoa a partir de uma data. O valor em vigor é o último com `desde` <= data do registo. */
export interface CustoHora {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  perfilId: string
  /** € por hora (custo para a empresa). */
  valor: number
  /** "AAAA-MM-DD" (dia em Lisboa). */
  desde: string
  criadoEm: string
  autorId: string
}

export const TIPOS_CUSTO = ['materiais', 'vidro', 'acessorios', 'transporte', 'subempreitada', 'outros'] as const
export type TipoCusto = (typeof TIPOS_CUSTO)[number]

export const TIPO_CUSTO_LABEL: Record<TipoCusto, string> = {
  materiais: 'Perfis e materiais',
  vidro: 'Vidro',
  acessorios: 'Ferragens e acessórios',
  transporte: 'Transporte',
  subempreitada: 'Subempreitada',
  outros: 'Outros',
}

/** Custo direto lançado na obra (registo leve; não é o módulo de compras). */
export interface CustoDireto {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  obraId: string
  tipo: TipoCusto
  descricao: string
  valor: number
  /** "AAAA-MM-DD" */
  data: string
  autorId: string
  criadoEm: string
  arquivadoEm: string | null
}

const euros = (msg: string) =>
  z.preprocess(
    (v) => (typeof v === 'string' ? Number(v.replace(/\s/g, '').replace(',', '.')) : v),
    z.number({ error: msg }).finite(msg).nonnegative('O valor não pode ser negativo.'),
  )

const dia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')

export const definirCustoHoraSchema = z.object({
  perfilId: z.string().min(1),
  valor: euros('Indique o custo por hora.').refine((v) => v > 0 && v < 500, 'Valor fora do normal (0–500 €/h).'),
  desde: dia,
})

export const lancarCustoSchema = z.object({
  obraId: z.string().min(1),
  tipo: z.enum(TIPOS_CUSTO),
  descricao: z.string().trim().min(2, 'Descreva o custo.'),
  valor: euros('Indique o valor.').refine((v) => v > 0, 'Indique o valor.'),
  data: dia,
})

export const alterarValorContratadoSchema = z.object({
  obraId: z.string().min(1),
  valor: euros('Indique o valor contratado.'),
  motivo: z.string().trim().optional(),
})

/** Horas previstas por etapa: campos `h_<obraEtapaId>` no formulário. Vazio = sem previsão. */
export function lerHorasPrevistas(
  form: Record<string, unknown>,
): { horas: Record<string, number | null> } | { erro: string; campo: string } {
  const out: Record<string, number | null> = {}
  for (const [k, v] of Object.entries(form)) {
    if (!k.startsWith('h_')) continue
    const s = String(v ?? '')
      .trim()
      .replace(',', '.')
    if (s === '') out[k.slice(2)] = null
    else {
      const n = Number(s)
      if (!Number.isFinite(n) || n < 0 || n > 10000) return { erro: 'Horas inválidas.', campo: k }
      out[k.slice(2)] = n
    }
  }
  return { horas: out }
}

export const PERIODOS = ['30d', '90d', 'ano', 'tudo'] as const
export type Periodo = (typeof PERIODOS)[number]
export const PERIODO_LABEL: Record<Periodo, string> = { '30d': '30 dias', '90d': '90 dias', ano: 'Este ano', tudo: 'Tudo' }

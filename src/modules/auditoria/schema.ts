/**
 * Origem de uma alteração. `ia`, `sync` e `importacao` ficam preparados para o
 * assistente (IA), o modo offline e a integração com o software de orçamentação.
 */
export const ORIGENS = ['manual', 'ia', 'sync', 'importacao'] as const
export type Origem = (typeof ORIGENS)[number]

export type AcaoHistorico = 'criar' | 'alterar' | 'arquivar'

export interface EntradaHistorico {
  id: string
  /** Empresa dona do registo (multi-empresa: cada empresa só vê os seus dados). */
  empresaId: string
  entidade: string
  entidadeId: string
  /** Obra a que a alteração pertence (para o separador Histórico da obra). */
  obraId: string | null
  acao: AcaoHistorico
  /** Descrição curta legível, ex.: "Terminou registo de tempo". */
  resumo: string
  antes: Record<string, unknown> | null
  depois: Record<string, unknown> | null
  autorId: string
  motivo: string | null
  origem: Origem
  criadoEm: string
}

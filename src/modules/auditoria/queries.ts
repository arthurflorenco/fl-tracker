import 'server-only'
import { db } from '@/lib/mock/store'

/** Entradas com valores em € (custos, custo/hora, valor contratado): só a administração as vê. */
export const eFinanceira = (h: { entidade: string; depois: Record<string, unknown> | null }) =>
  h.entidade === 'custos_diretos' || h.entidade === 'custos_hora' || (h.depois != null && 'valorContratado' in h.depois)

export function historicoDaObra(obraId: string, { limite = 100, financeiro = false } = {}) {
  return db()
    .historico.filter((h) => h.obraId === obraId && (financeiro || !eFinanceira(h)))
    .slice(0, limite)
}

export function historicoGlobal(empresaId: string, limite = 200) {
  return db()
    .historico.filter((h) => h.empresaId === empresaId)
    .slice(0, limite)
}

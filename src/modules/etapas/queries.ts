import 'server-only'
import { db } from '@/lib/mock/store'

export const etapasModelo = (empresaId: string) =>
  db()
    .etapasModelo.filter((e) => e.empresaId === empresaId)
    .sort((a, b) => a.ordem - b.ordem)
export const atividadesDe = (etapaModeloId: string) => db().atividades.filter((a) => a.etapaModeloId === etapaModeloId && a.ativa)
export const etapasDaObra = (obraId: string) =>
  db()
    .obraEtapas.filter((e) => e.obraId === obraId)
    .sort((a, b) => a.ordem - b.ordem)
export const atividadePorId = (id: string | null) => (id ? (db().atividades.find((a) => a.id === id) ?? null) : null)
export const obraEtapaPorId = (id: string | null) => (id ? (db().obraEtapas.find((e) => e.id === id) ?? null) : null)

/** Atividades agrupadas por etapa da obra — para o seletor do modo registo. */
export function atividadesPorObraEtapa(obraId: string) {
  return Object.fromEntries(etapasDaObra(obraId).map((oe) => [oe.id, atividadesDe(oe.etapaModeloId)]))
}

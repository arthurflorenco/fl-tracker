import 'server-only'
import { db } from '@/lib/mock/store'
import { TIPOS_NOTA_ALERTA } from './schema'

export function notasDaObra(obraId: string) {
  const d = db()
  return d.notas
    .filter((n) => n.obraId === obraId && !n.arquivadoEm)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .map((n) => ({
      ...n,
      autor: d.perfis.find((p) => p.id === n.autorId) ?? null,
      elemento: d.elementos.find((e) => e.id === n.elementoId) ?? null,
      etapa: d.obraEtapas.find((e) => e.id === n.obraEtapaId) ?? null,
    }))
}

export function alertasAbertos(obraIds: string[]) {
  const d = db()
  return d.notas
    .filter((n) => obraIds.includes(n.obraId) && !n.resolvida && !n.arquivadoEm && TIPOS_NOTA_ALERTA.includes(n.tipo))
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .map((n) => ({ ...n, obra: d.obras.find((o) => o.id === n.obraId)!, autor: d.perfis.find((p) => p.id === n.autorId) ?? null }))
}

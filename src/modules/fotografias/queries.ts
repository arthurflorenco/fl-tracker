import 'server-only'
import { db } from '@/lib/mock/store'

export function fotografiasDaObra(obraId: string) {
  const d = db()
  return d.fotografias
    .filter((f) => f.obraId === obraId && !f.arquivadoEm)
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .map((f) => ({
      ...f,
      autor: d.perfis.find((p) => p.id === f.autorId) ?? null,
      elemento: d.elementos.find((e) => e.id === f.elementoId) ?? null,
    }))
}

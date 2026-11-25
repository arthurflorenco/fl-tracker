import 'server-only'
import { db } from '@/lib/mock/store'

export const elementosDaObra = (obraId: string) =>
  db()
    .elementos.filter((e) => e.obraId === obraId)
    .sort((a, b) => a.referencia.localeCompare(b.referencia, 'pt', { numeric: true }))
export const elementoPorId = (id: string | null) => (id ? (db().elementos.find((e) => e.id === id) ?? null) : null)

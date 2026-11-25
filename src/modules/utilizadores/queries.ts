import 'server-only'
import { db } from '@/lib/mock/store'

/** Pessoas de uma empresa. Sem `empresaId` (só o ecrã de demonstração /entrar): todas. */
export const listarPerfis = (empresaId?: string) =>
  db()
    .perfis.filter((p) => !empresaId || p.empresaId === empresaId)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
export const perfilPorId = (id: string) => db().perfis.find((p) => p.id === id) ?? null
export const nomeDe = (id: string | null) => (id ? (perfilPorId(id)?.nome ?? '—') : '—')

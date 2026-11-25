import 'server-only'
import { db } from '@/lib/mock/store'
import type { AcessoObra } from '@/lib/permissions'

export const listarEquipas = (empresaId: string) => db().equipas.filter((e) => e.ativa && e.empresaId === empresaId)
export const equipaPorId = (id: string | null) => (id ? (db().equipas.find((e) => e.id === id) ?? null) : null)
export const membrosDe = (equipaId: string) => db().perfis.filter((p) => p.equipaId === equipaId && p.ativo)
export const equipasDaObra = (obraId: string) =>
  db()
    .obraEquipas.filter((oe) => oe.obraId === obraId)
    .map((oe) => oe.equipaId)

/** Empresa e equipas da obra, para `podeVerObra`. Obra inexistente → empresaId null (sem acesso). */
export function acessoObra(obraId: string): AcessoObra {
  const obra = db().obras.find((o) => o.id === obraId)
  return { empresaId: obra?.empresaId ?? null, equipas: obra ? equipasDaObra(obraId) : [] }
}

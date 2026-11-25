import 'server-only'
import { db } from '@/lib/mock/store'

export const clientePorId = (id: string) => db().clientes.find((c) => c.id === id) ?? null

export function listarProjetos(empresaId: string) {
  return db()
    .projetos.filter((p) => p.empresaId === empresaId)
    .sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm))
    .map((p) => ({ ...p, cliente: clientePorId(p.clienteId) }))
}

export function projetoDetalhe(empresaId: string, id: string) {
  const projeto = db().projetos.find((p) => p.id === id && p.empresaId === empresaId)
  if (!projeto) return null
  return {
    projeto,
    cliente: clientePorId(projeto.clienteId),
    responsavel: db().perfis.find((u) => u.id === projeto.responsavelId) ?? null,
    obra: projeto.obraId ? (db().obras.find((o) => o.id === projeto.obraId) ?? null) : null,
  }
}

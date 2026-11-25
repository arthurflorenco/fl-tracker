import 'server-only'
import { db } from '@/lib/mock/store'
import { podeVerObra } from '@/lib/permissions'
import type { Perfil } from '@/modules/utilizadores/schema'
import { acessoObra, equipasDaObra } from '@/modules/equipas/queries'
import { etapasDaObra } from '@/modules/etapas/queries'
import type { Obra } from './schema'

function resumo(o: Obra, agora = new Date()) {
  const d = db()
  const etapas = etapasDaObra(o.id)
  const concluidas = etapas.filter((e) => e.estado === 'concluida').length
  const etapaAtual =
    etapas.find((e) => e.estado === 'em_curso' || e.estado === 'bloqueada') ?? etapas.find((e) => e.estado === 'por_iniciar') ?? null
  const atrasada =
    o.estado === 'ativa' &&
    ((o.dataPrevistaFim != null && new Date(o.dataPrevistaFim) < agora) ||
      etapas.some((e) => e.estado !== 'concluida' && e.dataPrevista != null && new Date(e.dataPrevista) < agora))
  return {
    ...o,
    cliente: d.clientes.find((c) => c.id === o.clienteId) ?? null,
    etapaAtual,
    progresso: etapas.length ? Math.round((concluidas / etapas.length) * 100) : 0,
    atrasada,
    equipas: d.equipas.filter((e) => equipasDaObra(o.id).includes(e.id)),
  }
}
export type ObraResumo = ReturnType<typeof resumo>

/** Obras que o perfil pode ver (escritório: todas; campo: as das suas equipas). */
export function obrasVisiveis(perfil: Perfil, { incluirArquivadas = false } = {}) {
  return db()
    .obras.filter((o) => (incluirArquivadas || o.estado !== 'arquivada') && podeVerObra(perfil, acessoObra(o.id)))
    .sort((a, b) => b.codigo.localeCompare(a.codigo))
    .map((o) => resumo(o))
}

export function obraParaPerfil(id: string, perfil: Perfil) {
  const o = db().obras.find((x) => x.id === id)
  if (!o || !podeVerObra(perfil, acessoObra(o.id))) return null
  return resumo(o)
}

/** Resolve o token de um QR Code (obra ou elemento com QR ativo). */
export function resolverToken(token: string) {
  const d = db()
  const obra = d.obras.find((o) => o.qrToken === token)
  if (obra) return { obra, elemento: null }
  const elemento = d.elementos.find((e) => e.qrToken === token && e.qrAtivo)
  if (elemento) return { obra: d.obras.find((o) => o.id === elemento.obraId) ?? null, elemento }
  return null
}

/** Próximo código sequencial do ano, por empresa: "2026-022". */
export function proximoCodigoObra(empresaId: string, agora = new Date()) {
  const ano = String(agora.getFullYear())
  const nums = db()
    .obras.filter((o) => o.empresaId === empresaId)
    .map((o) => o.codigo)
    .filter((c) => c.startsWith(`${ano}-`))
    .map((c) => Number(c.slice(5)))
  return `${ano}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, '0')}`
}

/** Responsáveis ativos da obra, com o perfil (nome, papel). A obra já foi validada por `obraParaPerfil`. */
export function responsaveisDaObra(obraId: string) {
  const d = db()
  return d.obraResponsaveis
    .filter((r) => r.obraId === obraId && !r.removidoEm)
    .map((r) => ({ ...r, perfil: d.perfis.find((p) => p.id === r.perfilId)! }))
    .filter((r) => r.perfil)
    .sort((a, b) => a.perfil.nome.localeCompare(b.perfil.nome, 'pt'))
}

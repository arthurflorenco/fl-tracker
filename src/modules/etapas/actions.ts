'use server'
import { revalidatePath } from 'next/cache'
import { db, novoId } from '@/lib/mock/store'
import { exigirSessao } from '@/lib/session'
import { eAdmin, podeVerObra, mesmaEmpresa } from '@/lib/permissions'
import { falhaValidacao, lerForm, naoEncontrado, semPermissao, type Resultado } from '@/lib/acao'
import { registarHistorico } from '@/modules/auditoria/registar'
import { acessoObra } from '@/modules/equipas/queries'
import { ESTADO_ETAPA_LABEL, alterarEstadoEtapaSchema, novaAtividadeSchema, novaEtapaSchema } from './schema'

/** Estado de uma etapa numa obra. Reabrir uma etapa concluída é só para a administração. */
export async function alterarEstadoEtapa(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  const v = alterarEstadoEtapaSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const e = db().obraEtapas.find((x) => x.id === v.data.obraEtapaId)
  if (!e) return naoEncontrado('Etapa')
  if (!podeVerObra(eu, acessoObra(e.obraId))) return semPermissao()
  if (e.estado === 'concluida' && !eAdmin(eu)) return { ok: false, erro: 'Só a administração pode reabrir uma etapa concluída.' }
  if (e.estado === v.data.estado) return { ok: true }

  const antes = e.estado
  const agora = new Date().toISOString()
  e.estado = v.data.estado
  if (e.estado === 'em_curso' && !e.iniciadaEm) e.iniciadaEm = agora
  e.concluidaEm = e.estado === 'concluida' ? agora : null
  registarHistorico({
    entidade: 'obra_etapas',
    entidadeId: e.id,
    obraId: e.obraId,
    acao: 'alterar',
    resumo: `${e.nome}: ${ESTADO_ETAPA_LABEL[antes]} → ${ESTADO_ETAPA_LABEL[e.estado]}`,
    antes: { estado: antes },
    depois: { estado: e.estado },
    motivo: v.data.motivo || null,
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

export async function criarEtapaModelo(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!eAdmin(eu)) return semPermissao()
  const v = novaEtapaSchema.safeParse({ ...lerForm(formData), visivelCliente: formData.get('visivelCliente') === 'on' })
  if (!v.success) return falhaValidacao(v.error)
  const d = db()
  const ordem = Math.max(0, ...d.etapasModelo.filter((e) => e.empresaId === eu.empresaId).map((e) => e.ordem)) + 1
  const etapa = { id: novoId(), empresaId: eu.empresaId, nome: v.data.nome, ordem, ativa: true, visivelCliente: v.data.visivelCliente }
  d.etapasModelo.push(etapa)
  registarHistorico({
    entidade: 'etapas_modelo',
    entidadeId: etapa.id,
    acao: 'criar',
    resumo: `Criou a etapa "${etapa.nome}"`,
    depois: etapa,
    autorId: eu.id,
  })
  revalidatePath('/admin/definicoes/etapas')
  return { ok: true, mensagem: 'Etapa criada. Aplica-se às novas obras.' }
}

export async function alternarEtapaModelo(etapaId: string, campo: 'ativa' | 'visivelCliente') {
  const eu = await exigirSessao()
  if (!eAdmin(eu)) return
  const e = db().etapasModelo.find((x) => x.id === etapaId)
  if (!e || !mesmaEmpresa(eu, e)) return
  const antes = e[campo]
  e[campo] = !antes
  registarHistorico({
    entidade: 'etapas_modelo',
    entidadeId: e.id,
    acao: 'alterar',
    resumo: `Etapa "${e.nome}": ${campo} ${antes ? 'sim → não' : 'não → sim'}`,
    antes: { [campo]: antes },
    depois: { [campo]: e[campo] },
    autorId: eu.id,
  })
  revalidatePath('/admin/definicoes/etapas')
}

export async function criarAtividade(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!eAdmin(eu)) return semPermissao()
  const v = novaAtividadeSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  if (
    !mesmaEmpresa(
      eu,
      db().etapasModelo.find((e) => e.id === v.data.etapaModeloId),
    )
  )
    return naoEncontrado('Etapa')
  const atividade = { id: novoId(), empresaId: eu.empresaId, etapaModeloId: v.data.etapaModeloId, nome: v.data.nome, ativa: true }
  db().atividades.push(atividade)
  registarHistorico({
    entidade: 'atividades',
    entidadeId: atividade.id,
    acao: 'criar',
    resumo: `Criou a atividade "${atividade.nome}"`,
    depois: atividade,
    autorId: eu.id,
  })
  revalidatePath('/admin/definicoes/etapas')
  return { ok: true }
}

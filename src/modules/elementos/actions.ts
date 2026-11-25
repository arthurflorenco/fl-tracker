'use server'
import { revalidatePath } from 'next/cache'
import { db, novoId, novoToken } from '@/lib/mock/store'
import { exigirSessao } from '@/lib/session'
import { podeGerirObra, podeVerObra, mesmaEmpresa } from '@/lib/permissions'
import { falhaValidacao, lerForm, naoEncontrado, semPermissao, type Resultado } from '@/lib/acao'
import { registarHistorico } from '@/modules/auditoria/registar'
import { acessoObra } from '@/modules/equipas/queries'
import { ESTADO_ELEMENTO_LABEL, alterarEstadoElementoSchema, novoElementoSchema } from './schema'

export async function criarElemento(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!podeGerirObra(eu)) return semPermissao()
  const v = novoElementoSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  if (!podeVerObra(eu, acessoObra(v.data.obraId))) return semPermissao()
  const d = db()
  const referencia = v.data.referencia.toUpperCase()
  if (d.elementos.some((e) => e.obraId === v.data.obraId && e.referencia === referencia))
    return { ok: false, erro: 'Já existe um elemento com esta referência nesta obra.', campos: { referencia: ['Referência repetida.'] } }
  const elemento = {
    id: novoId(),
    empresaId: eu.empresaId,
    obraId: v.data.obraId,
    referencia,
    tipo: v.data.tipo,
    descricao: v.data.descricao,
    divisao: v.data.divisao || null,
    estado: 'por_fabricar' as const,
    qrAtivo: false,
    qrToken: novoToken(),
  }
  d.elementos.push(elemento)
  registarHistorico({
    entidade: 'elementos',
    entidadeId: elemento.id,
    obraId: elemento.obraId,
    acao: 'criar',
    resumo: `Adicionou o elemento ${referencia}`,
    depois: elemento,
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, mensagem: 'Elemento adicionado.' }
}

export async function alterarEstadoElemento(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  const v = alterarEstadoElementoSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const e = db().elementos.find((x) => x.id === v.data.elementoId)
  if (!e) return naoEncontrado('Elemento')
  if (!podeVerObra(eu, acessoObra(e.obraId))) return semPermissao()
  if (e.estado === v.data.estado) return { ok: true }
  const antes = e.estado
  e.estado = v.data.estado
  registarHistorico({
    entidade: 'elementos',
    entidadeId: e.id,
    obraId: e.obraId,
    acao: 'alterar',
    resumo: `${e.referencia}: ${ESTADO_ELEMENTO_LABEL[antes]} → ${ESTADO_ELEMENTO_LABEL[e.estado]}`,
    antes: { estado: antes },
    depois: { estado: e.estado },
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true }
}

/** Ativa/desativa o QR Code secundário de um elemento. */
export async function alternarQrElemento(elementoId: string) {
  const eu = await exigirSessao()
  if (!podeGerirObra(eu)) return
  const e = db().elementos.find((x) => x.id === elementoId)
  if (!e || !mesmaEmpresa(eu, e)) return
  e.qrAtivo = !e.qrAtivo
  registarHistorico({
    entidade: 'elementos',
    entidadeId: e.id,
    obraId: e.obraId,
    acao: 'alterar',
    resumo: `${e.referencia}: QR Code ${e.qrAtivo ? 'ativado' : 'desativado'}`,
    antes: { qrAtivo: !e.qrAtivo },
    depois: { qrAtivo: e.qrAtivo },
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
}

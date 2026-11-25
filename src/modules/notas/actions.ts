'use server'
import { revalidatePath } from 'next/cache'
import { db, novoId } from '@/lib/mock/store'
import { exigirSessao } from '@/lib/session'
import { podeVerObra } from '@/lib/permissions'
import { falhaValidacao, lerForm, type Resultado } from '@/lib/acao'
import { registarHistorico } from '@/modules/auditoria/registar'
import { acessoObra } from '@/modules/equipas/queries'
import { TIPO_NOTA_LABEL, novaNotaSchema } from './schema'

export async function criarNota(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  const v = novaNotaSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  if (!podeVerObra(eu, acessoObra(v.data.obraId))) return { ok: false, erro: 'Não tem acesso a esta obra.' }
  const d = db()
  if (d.notas.some((n) => n.clientId === v.data.clientId)) return { ok: true }
  const nota = {
    id: novoId(),
    empresaId: eu.empresaId,
    ...v.data,
    interna: true,
    resolvida: false,
    autorId: eu.id,
    criadoEm: new Date().toISOString(),
    arquivadoEm: null,
  }
  d.notas.push(nota)
  registarHistorico({
    entidade: 'notas',
    entidadeId: nota.id,
    obraId: nota.obraId,
    acao: 'criar',
    resumo: `Nota: ${TIPO_NOTA_LABEL[nota.tipo]}`,
    depois: { tipo: nota.tipo, texto: nota.texto },
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, mensagem: 'Nota guardada.' }
}

export async function marcarNotaResolvida(notaId: string) {
  const eu = await exigirSessao()
  const n = db().notas.find((x) => x.id === notaId)
  if (!n || !podeVerObra(eu, acessoObra(n.obraId))) return
  n.resolvida = !n.resolvida
  registarHistorico({
    entidade: 'notas',
    entidadeId: n.id,
    obraId: n.obraId,
    acao: 'alterar',
    resumo: n.resolvida ? 'Marcou nota como resolvida' : 'Reabriu nota',
    antes: { resolvida: !n.resolvida },
    depois: { resolvida: n.resolvida },
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
}

'use server'
import { revalidatePath } from 'next/cache'
import { db, novoId } from '@/lib/mock/store'
import { exigirSessao } from '@/lib/session'
import { eAdmin, mesmaEmpresa } from '@/lib/permissions'
import { falhaValidacao, lerForm, semPermissao, type Resultado } from '@/lib/acao'
import { registarHistorico } from '@/modules/auditoria/registar'
import { novoUtilizadorSchema } from './schema'

/** Cada pessoa tem conta própria. Nunca contas partilhadas. Com Supabase: convite por email. */
export async function criarUtilizador(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!eAdmin(eu)) return semPermissao()
  const v = novoUtilizadorSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const d = db()
  if (d.perfis.some((p) => p.email.toLowerCase() === v.data.email.toLowerCase()))
    return { ok: false, erro: 'Já existe um utilizador com este email.', campos: { email: ['Email repetido.'] } }
  if (
    v.data.equipaId &&
    !mesmaEmpresa(
      eu,
      d.equipas.find((e) => e.id === v.data.equipaId),
    )
  )
    return { ok: false, erro: 'Equipa inválida.', campos: { equipaId: ['Equipa inválida.'] } }
  const perfil = { id: novoId(), empresaId: eu.empresaId, ...v.data, ativo: true, criadoEm: new Date().toISOString() }
  d.perfis.push(perfil)
  registarHistorico({
    entidade: 'perfis',
    entidadeId: perfil.id,
    acao: 'criar',
    resumo: `Criou o utilizador ${perfil.nome}`,
    depois: perfil,
    autorId: eu.id,
  })
  revalidatePath('/admin/utilizadores')
  return { ok: true, mensagem: 'Utilizador adicionado.' }
}

/** Desativar em vez de apagar: o histórico continua a apontar para a pessoa. */
export async function alternarUtilizadorAtivo(perfilId: string) {
  const eu = await exigirSessao()
  if (!eAdmin(eu) || perfilId === eu.id) return
  const p = db().perfis.find((x) => x.id === perfilId)
  if (!p || !mesmaEmpresa(eu, p)) return
  p.ativo = !p.ativo
  registarHistorico({
    entidade: 'perfis',
    entidadeId: p.id,
    acao: 'alterar',
    resumo: `${p.ativo ? 'Reativou' : 'Desativou'} ${p.nome}`,
    antes: { ativo: !p.ativo },
    depois: { ativo: p.ativo },
    autorId: eu.id,
  })
  revalidatePath('/admin/utilizadores')
}

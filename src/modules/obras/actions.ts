'use server'
import { revalidatePath } from 'next/cache'
import { db, novoId } from '@/lib/mock/store'
import { exigirSessao } from '@/lib/session'
import { mesmaEmpresa, podeGerirObra, podeVerObra } from '@/lib/permissions'
import { falhaValidacao, lerForm, naoEncontrado, semPermissao, type Resultado } from '@/lib/acao'
import { registarHistorico } from '@/modules/auditoria/registar'
import { acessoObra } from '@/modules/equipas/queries'
import { responsavelSchema } from './schema'

/* Responsáveis pela obra: só o escritório (administração e orçamentação) os define.
   RLS equivalente: supabase/migrations/0006_obra_responsaveis.sql. */

export async function adicionarResponsavel(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!podeGerirObra(eu)) return semPermissao()
  const v = responsavelSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  if (!podeVerObra(eu, acessoObra(v.data.obraId))) return naoEncontrado('Obra')
  const d = db()
  const perfil = d.perfis.find((p) => p.id === v.data.perfilId && p.ativo)
  // A pessoa tem de ser da mesma empresa (um id de outra empresa é tratado como inexistente).
  if (!perfil || !mesmaEmpresa(eu, perfil)) return { ok: false, erro: 'Pessoa inválida.', campos: { perfilId: ['Pessoa inválida.'] } }
  if (d.obraResponsaveis.some((r) => r.obraId === v.data.obraId && r.perfilId === perfil.id && !r.removidoEm))
    return { ok: false, erro: 'Esta pessoa já é responsável por esta obra.', campos: { perfilId: ['Já é responsável.'] } }

  const r = {
    id: novoId(),
    empresaId: eu.empresaId,
    obraId: v.data.obraId,
    perfilId: perfil.id,
    criadoEm: new Date().toISOString(),
    removidoEm: null,
  }
  d.obraResponsaveis.push(r)
  registarHistorico({
    entidade: 'obra_responsaveis',
    entidadeId: r.id,
    obraId: r.obraId,
    acao: 'criar',
    resumo: `Adicionou ${perfil.nome} como responsável`,
    depois: { perfilId: perfil.id },
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, mensagem: 'Responsável adicionado.' }
}

/** Remove um responsável (marca `removidoEm`; nada é apagado). */
export async function removerResponsavel(responsavelId: string) {
  const eu = await exigirSessao()
  if (!podeGerirObra(eu)) return
  const r = db().obraResponsaveis.find((x) => x.id === responsavelId)
  if (!r || r.removidoEm || !mesmaEmpresa(eu, r) || !podeVerObra(eu, acessoObra(r.obraId))) return
  r.removidoEm = new Date().toISOString()
  const nome = db().perfis.find((p) => p.id === r.perfilId)?.nome ?? '—'
  registarHistorico({
    entidade: 'obra_responsaveis',
    entidadeId: r.id,
    obraId: r.obraId,
    acao: 'arquivar',
    resumo: `Removeu ${nome} dos responsáveis`,
    antes: { removidoEm: null },
    depois: { removidoEm: r.removidoEm },
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
}

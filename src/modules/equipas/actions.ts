'use server'
import { revalidatePath } from 'next/cache'
import { db, novoId } from '@/lib/mock/store'
import { exigirSessao } from '@/lib/session'
import { eAdmin } from '@/lib/permissions'
import { falhaValidacao, lerForm, semPermissao, type Resultado } from '@/lib/acao'
import { registarHistorico } from '@/modules/auditoria/registar'
import { novaEquipaSchema } from './schema'

export async function criarEquipa(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!eAdmin(eu)) return semPermissao()
  const v = novaEquipaSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const equipa = { id: novoId(), empresaId: eu.empresaId, ...v.data, ativa: true }
  db().equipas.push(equipa)
  registarHistorico({
    entidade: 'equipas',
    entidadeId: equipa.id,
    acao: 'criar',
    resumo: `Criou a equipa ${equipa.nome}`,
    depois: equipa,
    autorId: eu.id,
  })
  revalidatePath('/admin/equipas')
  return { ok: true, mensagem: 'Equipa criada.' }
}

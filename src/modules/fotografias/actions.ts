'use server'
import { revalidatePath } from 'next/cache'
import { db, novoId } from '@/lib/mock/store'
import { exigirSessao } from '@/lib/session'
import { podeVerObra } from '@/lib/permissions'
import { falhaValidacao, lerForm, type Resultado } from '@/lib/acao'
import { registarHistorico } from '@/modules/auditoria/registar'
import { acessoObra } from '@/modules/equipas/queries'
import { novaFotografiaSchema } from './schema'

/**
 * Demonstração: guarda a imagem (já comprimida no dispositivo) como data URL em memória.
 * Com Supabase: upload para o bucket privado `fotografias/<obraId>/<id>.jpg` e guarda o caminho.
 */
export async function carregarFotografia(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  const v = novaFotografiaSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  if (!podeVerObra(eu, acessoObra(v.data.obraId))) return { ok: false, erro: 'Não tem acesso a esta obra.' }
  const d = db()
  if (d.fotografias.some((f) => f.clientId === v.data.clientId)) return { ok: true }
  const foto = {
    id: novoId(),
    empresaId: eu.empresaId,
    clientId: v.data.clientId,
    obraId: v.data.obraId,
    obraEtapaId: v.data.obraEtapaId,
    elementoId: v.data.elementoId,
    notaId: null,
    caminho: v.data.dataUrl,
    legenda: v.data.legenda || null,
    aprovadaCliente: false,
    autorId: eu.id,
    criadoEm: new Date().toISOString(),
    arquivadoEm: null,
  }
  d.fotografias.push(foto)
  registarHistorico({
    entidade: 'fotografias',
    entidadeId: foto.id,
    obraId: foto.obraId,
    acao: 'criar',
    resumo: 'Adicionou fotografia',
    depois: { legenda: foto.legenda, elementoId: foto.elementoId },
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, mensagem: 'Fotografia guardada.' }
}

'use server'
import { revalidatePath } from 'next/cache'
import { db, novoId } from '@/lib/mock/store'
import { exigirSessao } from '@/lib/session'
import { podeVerFinanceiro, mesmaEmpresa } from '@/lib/permissions'
import { falhaValidacao, lerForm, naoEncontrado, semPermissao, type Resultado } from '@/lib/acao'
import { fmtData, fmtEuro } from '@/lib/format'
import { registarHistorico } from '@/modules/auditoria/registar'
import { TIPO_CUSTO_LABEL, alterarValorContratadoSchema, definirCustoHoraSchema, lancarCustoSchema, lerHorasPrevistas } from './schema'

/* Dados financeiros: só a administração (podeVerFinanceiro), como no RLS (e_admin()). */

export async function definirCustoHora(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!podeVerFinanceiro(eu)) return semPermissao()
  const v = definirCustoHoraSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const d = db()
  const perfil = d.perfis.find((p) => p.id === v.data.perfilId && p.empresaId === eu.empresaId)
  if (!perfil) return naoEncontrado('Utilizador')

  // Um valor por dia: se já existe para essa data, substitui (fica no histórico).
  const existente = d.custosHora.find((c) => c.perfilId === perfil.id && c.desde === v.data.desde)
  const antes = existente ? { valor: existente.valor, desde: existente.desde } : null
  if (existente) existente.valor = v.data.valor
  else d.custosHora.push({ id: novoId(), empresaId: eu.empresaId, ...v.data, criadoEm: new Date().toISOString(), autorId: eu.id })
  registarHistorico({
    entidade: 'custos_hora',
    entidadeId: existente?.id ?? perfil.id,
    acao: existente ? 'alterar' : 'criar',
    resumo: `Custo/hora de ${perfil.nome}: ${fmtEuro(v.data.valor, { cent: true })} a partir de ${fmtData(v.data.desde)}`,
    antes,
    depois: { valor: v.data.valor, desde: v.data.desde },
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, mensagem: 'Custo/hora guardado.' }
}

export async function lancarCustoDireto(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!podeVerFinanceiro(eu)) return semPermissao()
  const v = lancarCustoSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const d = db()
  const obra = d.obras.find((o) => o.id === v.data.obraId && o.empresaId === eu.empresaId)
  if (!obra) return naoEncontrado('Obra')
  const custo = { id: novoId(), empresaId: eu.empresaId, ...v.data, autorId: eu.id, criadoEm: new Date().toISOString(), arquivadoEm: null }
  d.custosDiretos.push(custo)
  registarHistorico({
    entidade: 'custos_diretos',
    entidadeId: custo.id,
    obraId: obra.id,
    acao: 'criar',
    resumo: `Custo lançado: ${TIPO_CUSTO_LABEL[custo.tipo]} — ${custo.descricao} (${fmtEuro(custo.valor, { cent: true })})`,
    depois: custo,
    autorId: eu.id,
  })
  revalidatePath(`/admin/obras/${obra.id}`)
  return { ok: true, mensagem: 'Custo lançado.' }
}

/** Arquivar em vez de apagar: o custo deixa de contar mas fica no histórico. */
export async function arquivarCustoDireto(custoId: string) {
  const eu = await exigirSessao()
  if (!podeVerFinanceiro(eu)) return
  const c = db().custosDiretos.find((x) => x.id === custoId)
  if (!c || c.arquivadoEm || !mesmaEmpresa(eu, c)) return
  c.arquivadoEm = new Date().toISOString()
  registarHistorico({
    entidade: 'custos_diretos',
    entidadeId: c.id,
    obraId: c.obraId,
    acao: 'arquivar',
    resumo: `Custo arquivado: ${c.descricao} (${fmtEuro(c.valor, { cent: true })})`,
    antes: { arquivadoEm: null },
    depois: { arquivadoEm: c.arquivadoEm },
    autorId: eu.id,
  })
  revalidatePath(`/admin/obras/${c.obraId}`)
}

export async function alterarValorContratado(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!podeVerFinanceiro(eu)) return semPermissao()
  const v = alterarValorContratadoSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const obra = db().obras.find((o) => o.id === v.data.obraId && o.empresaId === eu.empresaId)
  if (!obra) return naoEncontrado('Obra')
  if (obra.valorContratado === v.data.valor) return { ok: true }
  const antes = obra.valorContratado
  obra.valorContratado = v.data.valor
  registarHistorico({
    entidade: 'obras',
    entidadeId: obra.id,
    obraId: obra.id,
    acao: 'alterar',
    resumo: `Valor contratado: ${fmtEuro(antes)} → ${fmtEuro(v.data.valor)}`,
    antes: { valorContratado: antes },
    depois: { valorContratado: v.data.valor },
    motivo: v.data.motivo || null,
    autorId: eu.id,
  })
  revalidatePath(`/admin/obras/${obra.id}`)
  return { ok: true, mensagem: 'Valor atualizado.' }
}

/** Horas previstas de todas as etapas da obra de uma vez (campos h_<obraEtapaId>). */
export async function definirHorasPrevistas(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!podeVerFinanceiro(eu)) return semPermissao()
  const form = lerForm(formData)
  const obraId = String(form.obraId ?? '')
  const r = lerHorasPrevistas(form)
  if ('erro' in r) return { ok: false, erro: r.erro, campos: { [r.campo]: [r.erro] } }
  const etapas = db().obraEtapas.filter((e) => e.obraId === obraId && e.empresaId === eu.empresaId)
  if (!etapas.length) return naoEncontrado('Obra')
  const antes: Record<string, number | null> = {}
  const depois: Record<string, number | null> = {}
  for (const e of etapas) {
    if (!(e.id in r.horas) || r.horas[e.id] === e.horasPrevistas) continue
    antes[e.nome] = e.horasPrevistas
    depois[e.nome] = r.horas[e.id]
    e.horasPrevistas = r.horas[e.id]
  }
  if (!Object.keys(depois).length) return { ok: true, mensagem: 'Sem alterações.' }
  registarHistorico({
    entidade: 'obra_etapas',
    entidadeId: obraId,
    obraId,
    acao: 'alterar',
    resumo: `Horas previstas atualizadas (${Object.keys(depois).join(', ')})`,
    antes,
    depois,
    autorId: eu.id,
  })
  revalidatePath(`/admin/obras/${obraId}`)
  return { ok: true, mensagem: 'Horas previstas guardadas.' }
}

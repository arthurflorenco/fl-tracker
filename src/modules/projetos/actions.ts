'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db, novoId, novoToken } from '@/lib/mock/store'
import { exigirSessao } from '@/lib/session'
import { podeGerirProjetos } from '@/lib/permissions'
import { falhaValidacao, lerForm, naoEncontrado, semPermissao, type Resultado } from '@/lib/acao'
import { registarHistorico } from '@/modules/auditoria/registar'
import { proximoCodigoObra } from '@/modules/obras/queries'
import { lerHorasPrevistas } from '@/modules/financeiro/schema'
import { ESTADO_PROJETO_LABEL, alterarEstadoProjetoSchema, converterEmObraSchema, novoProjetoSchema } from './schema'

export async function criarProjeto(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!podeGerirProjetos(eu)) return semPermissao()
  const v = novoProjetoSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)

  const d = db()
  const agora = new Date().toISOString()
  let cliente = d.clientes.find((c) => c.empresaId === eu.empresaId && c.nome.toLowerCase() === v.data.clienteNome.toLowerCase())
  if (!cliente) {
    cliente = {
      id: novoId(),
      empresaId: eu.empresaId,
      nome: v.data.clienteNome,
      email: v.data.clienteEmail || null,
      telefone: v.data.clienteTelefone || null,
      nif: null,
    }
    d.clientes.push(cliente)
  }
  const ano = new Date().getFullYear()
  const seq = d.projetos.filter((p) => p.empresaId === eu.empresaId && p.referencia.startsWith(`P-${ano}-`)).length + 1
  const projeto = {
    id: novoId(),
    empresaId: eu.empresaId,
    referencia: `P-${ano}-${String(seq + 30).padStart(3, '0')}`,
    titulo: v.data.titulo,
    clienteId: cliente.id,
    morada: v.data.morada || null,
    estado: 'pedido' as const,
    valorProposta: null,
    responsavelId: eu.id,
    obraId: null,
    criadoEm: agora,
    atualizadoEm: agora,
  }
  d.projetos.push(projeto)
  registarHistorico({
    entidade: 'projetos',
    entidadeId: projeto.id,
    acao: 'criar',
    resumo: `Criou o projeto ${projeto.referencia}`,
    depois: projeto,
    autorId: eu.id,
  })
  redirect(`/admin/projetos/${projeto.id}`)
}

export async function alterarEstadoProjeto(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!podeGerirProjetos(eu)) return semPermissao()
  const v = alterarEstadoProjetoSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const p = db().projetos.find((x) => x.id === v.data.projetoId && x.empresaId === eu.empresaId)
  if (!p) return naoEncontrado('Projeto')
  if (p.obraId) return { ok: false, erro: 'Este projeto já foi convertido em obra.' }
  if (p.estado === v.data.estado) return { ok: true }

  const antes = p.estado
  p.estado = v.data.estado
  p.atualizadoEm = new Date().toISOString()
  registarHistorico({
    entidade: 'projetos',
    entidadeId: p.id,
    acao: 'alterar',
    resumo: `Projeto ${p.referencia}: ${ESTADO_PROJETO_LABEL[antes]} → ${ESTADO_PROJETO_LABEL[p.estado]}`,
    antes: { estado: antes },
    depois: { estado: p.estado },
    motivo: v.data.motivo || null,
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, mensagem: 'Estado atualizado.' }
}

/** Orçamento aprovado → obra: gera código, QR Code e as etapas operacionais. */
export async function converterEmObra(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!podeGerirProjetos(eu)) return semPermissao()
  const form = lerForm(formData)
  const v = converterEmObraSchema.safeParse(form)
  if (!v.success) return falhaValidacao(v.error)
  // Horas previstas por etapa do modelo (campos h_<etapaModeloId>, opcionais).
  const previstas = lerHorasPrevistas(form)
  if ('erro' in previstas) return { ok: false, erro: previstas.erro, campos: { [previstas.campo]: [previstas.erro] } }

  const d = db()
  const p = d.projetos.find((x) => x.id === v.data.projetoId && x.empresaId === eu.empresaId)
  if (!p) return naoEncontrado('Projeto')
  if (p.estado !== 'aprovado') return { ok: false, erro: 'Só projetos aprovados podem ser convertidos em obra.' }
  if (p.obraId) return { ok: false, erro: 'Este projeto já tem obra.' }
  // As equipas têm de ser desta empresa (um id de equipa de outra empresa é recusado).
  if (!v.data.equipaIds.every((id) => d.equipas.some((e) => e.id === id && e.empresaId === eu.empresaId)))
    return { ok: false, erro: 'Equipa inválida.', campos: { equipaIds: ['Equipa inválida.'] } }

  const agora = new Date().toISOString()
  const obra = {
    id: novoId(),
    empresaId: eu.empresaId,
    codigo: proximoCodigoObra(eu.empresaId),
    projetoId: p.id,
    clienteId: p.clienteId,
    titulo: p.titulo,
    morada: p.morada,
    estado: 'ativa' as const,
    qrToken: novoToken(),
    dataInicio: agora,
    dataPrevistaFim: v.data.dataPrevistaFim ? new Date(v.data.dataPrevistaFim).toISOString() : null,
    // O valor da proposta aprovada passa a valor contratado (a administração pode ajustá-lo na obra).
    valorContratado: p.valorProposta,
    criadoEm: agora,
  }
  d.obras.push(obra)
  for (const equipaId of v.data.equipaIds) d.obraEquipas.push({ empresaId: eu.empresaId, obraId: obra.id, equipaId })

  const modelo = d.etapasModelo.filter((e) => e.empresaId === eu.empresaId && e.ativa).sort((a, b) => a.ordem - b.ordem)
  modelo.forEach((e) =>
    d.obraEtapas.push({
      id: novoId(),
      empresaId: eu.empresaId,
      obraId: obra.id,
      etapaModeloId: e.id,
      nome: e.nome,
      ordem: e.ordem,
      // A orçamentação fica concluída com a aprovação.
      estado: e.ordem === 1 ? 'concluida' : 'por_iniciar',
      visivelCliente: e.visivelCliente,
      dataPrevista: null,
      iniciadaEm: e.ordem === 1 ? p.criadoEm : null,
      concluidaEm: e.ordem === 1 ? agora : null,
      horasPrevistas: previstas.horas[e.id] ?? null,
    }),
  )

  p.obraId = obra.id
  p.atualizadoEm = agora
  registarHistorico({
    entidade: 'obras',
    entidadeId: obra.id,
    obraId: obra.id,
    acao: 'criar',
    resumo: `Projeto ${p.referencia} convertido na obra ${obra.codigo}`,
    depois: { codigo: obra.codigo, equipas: v.data.equipaIds },
    autorId: eu.id,
  })
  redirect(`/admin/obras/${obra.id}`)
}

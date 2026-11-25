'use server'
import { revalidatePath } from 'next/cache'
import { db, novoId } from '@/lib/mock/store'
import { exigirSessao } from '@/lib/session'
import { eAdmin, podeEditarRegisto, podeVerObra, mesmaEmpresa } from '@/lib/permissions'
import { chaveDia, inputLisboaParaIso } from '@/lib/format'
import {
  arredondarFim,
  arredondarInicio,
  diasPermitidos,
  duracaoMin,
  fimSugerido,
  horaDe,
  inicioSugerido,
  isoDe,
  sobrepoe,
} from '@/lib/quartos'
import { falhaValidacao, lerForm, naoEncontrado, semPermissao, type Resultado } from '@/lib/acao'
import { registarHistorico } from '@/modules/auditoria/registar'
import { acessoObra } from '@/modules/equipas/queries'
import { arquivarTempoSchema, corrigirTempoSchema, iniciarTempoSchema, registarHorasSchema, terminarTempoSchema } from './schema'

/* Tempo sempre em quartos de hora (src/lib/quartos.ts): início para baixo, fim para cima, mínimo 15 min.
   A mesma pessoa nunca tem registos sobrepostos. */

const SOBREPOSTO = 'Já tem horas registadas nesse intervalo.'

/** Registos não arquivados da pessoa (exceto `excluir`). */
const registosDe = (perfilId: string, excluir?: string) =>
  db().registosTempo.filter((r) => r.perfilId === perfilId && !r.arquivadoEm && r.id !== excluir)

/**
 * O elemento tem de ser desta obra e a atividade desta etapa: sem isto, um registo podia
 * ficar ligado a um elemento de outra obra (dados incoerentes ou de outra equipa).
 */
function contextoValido(obraId: string, etapa: { etapaModeloId: string }, elementoId?: string | null, atividadeId?: string | null) {
  const d = db()
  if (elementoId && !d.elementos.some((e) => e.id === elementoId && e.obraId === obraId)) return false
  if (atividadeId && !d.atividades.some((a) => a.id === atividadeId && a.etapaModeloId === etapa.etapaModeloId)) return false
  return true
}
const CONTEXTO_INVALIDO = 'O elemento ou a atividade não pertencem a esta obra/etapa.'

/** Passa a etapa a "em curso" quando alguém começa a trabalhar nela. */
function marcarEtapaEmCurso(etapa: { estado: string; iniciadaEm: string | null }, quando: string) {
  if (etapa.estado === 'por_iniciar') {
    etapa.estado = 'em_curso'
    etapa.iniciadaEm = quando
  }
}

/** Inicia um registo de tempo da própria pessoa. Só um registo em curso por pessoa. */
export async function iniciarTempo(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  const v = iniciarTempoSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const d = db()
  if (!podeVerObra(eu, acessoObra(v.data.obraId))) return semPermissao()
  // Idempotente: o mesmo clientId (ex.: reenvio do tablet) não cria um segundo registo.
  const existente = d.registosTempo.find((r) => r.clientId === v.data.clientId)
  if (existente) return existente.perfilId === eu.id ? { ok: true, id: existente.id } : semPermissao()
  if (d.registosTempo.some((r) => r.perfilId === eu.id && r.fim == null && !r.arquivadoEm))
    return { ok: false, erro: 'Já tem um trabalho em curso. Termine-o primeiro.' }
  const etapa = d.obraEtapas.find((e) => e.id === v.data.obraEtapaId && e.obraId === v.data.obraId)
  if (!etapa) return { ok: false, erro: 'Etapa inválida.' }
  if (!contextoValido(v.data.obraId, etapa, v.data.elementoId, v.data.atividadeId)) return { ok: false, erro: CONTEXTO_INVALIDO }

  const agora = new Date()
  const meus = registosDe(eu.id)
  // "Agora": o quarto atual, ou o fim do último registo (registos seguidos encadeiam).
  const sugerido = inicioSugerido(
    agora,
    meus.reduce((m, r) => (r.fim && r.fim > m ? r.fim : m), ''),
  )
  let inicio = sugerido
  if (v.data.inicio) {
    inicio = isoDe(chaveDia(agora), v.data.inicio)
    if (inicio > sugerido && inicio > arredondarFim(agora))
      return { ok: false, erro: 'A hora de início não pode ser no futuro.', campos: { inicio: ['No futuro.'] } }
  }
  if (sobrepoe({ inicio, fim: null }, meus)) return { ok: false, erro: SOBREPOSTO, campos: { inicio: [SOBREPOSTO] } }

  const registo = {
    id: novoId(),
    empresaId: eu.empresaId,
    clientId: v.data.clientId,
    obraId: v.data.obraId,
    obraEtapaId: etapa.id,
    atividadeId: v.data.atividadeId,
    elementoId: v.data.elementoId,
    perfilId: eu.id,
    equipaId: eu.equipaId,
    inicio,
    fim: null,
    duracaoMin: null,
    nota: null,
    origem: 'manual' as const,
    estadoSync: 'sincronizado' as const,
    criadoEm: agora.toISOString(),
    arquivadoEm: null,
  }
  d.registosTempo.push(registo)
  marcarEtapaEmCurso(etapa, inicio)
  registarHistorico({
    entidade: 'registos_tempo',
    entidadeId: registo.id,
    obraId: registo.obraId,
    acao: 'criar',
    resumo: `Iniciou trabalho em ${etapa.nome} às ${horaDe(inicio)}`,
    depois: registo,
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, id: registo.id, mensagem: 'Trabalho iniciado.' }
}

export async function terminarTempo(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  const v = terminarTempoSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const r = db().registosTempo.find((x) => x.id === v.data.registoId)
  if (!r) return naoEncontrado()
  if (r.perfilId !== eu.id) return semPermissao()
  if (r.fim) return { ok: true }
  const agora = new Date()
  // "Agora": o quarto seguinte, no mínimo início + 15 min (pode terminar logo a seguir a iniciar).
  const limite = fimSugerido(agora, r.inicio)
  const fim = v.data.fim ? isoDe(chaveDia(agora), v.data.fim) : limite
  if (fim > limite) return { ok: false, erro: 'A hora de fim não pode ser no futuro.', campos: { fim: ['No futuro.'] } }
  if (fim <= r.inicio) return { ok: false, erro: 'A hora de fim tem de ser depois do início.', campos: { fim: ['Antes do início.'] } }
  if (sobrepoe({ inicio: r.inicio, fim }, registosDe(eu.id, r.id))) return { ok: false, erro: SOBREPOSTO, campos: { fim: [SOBREPOSTO] } }
  r.fim = fim
  r.duracaoMin = duracaoMin(r.inicio, fim)
  if (v.data.nota) r.nota = v.data.nota
  registarHistorico({
    entidade: 'registos_tempo',
    entidadeId: r.id,
    obraId: r.obraId,
    acao: 'alterar',
    resumo: `Terminou trabalho às ${horaDe(fim)} (${horaDe(r.inicio)}–${horaDe(fim)})`,
    antes: { fim: null },
    depois: { fim: r.fim, duracaoMin: r.duracaoMin },
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, mensagem: 'Trabalho terminado.' }
}

/** Horas já feitas, lançadas à mão (ex.: esqueceu-se de registar). Até 7 dias atrás. */
export async function registarHoras(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  const v = registarHorasSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const d = db()
  if (!podeVerObra(eu, acessoObra(v.data.obraId))) return semPermissao()
  const existente = d.registosTempo.find((r) => r.clientId === v.data.clientId)
  if (existente) return existente.perfilId === eu.id ? { ok: true, id: existente.id } : semPermissao()
  const etapa = d.obraEtapas.find((e) => e.id === v.data.obraEtapaId && e.obraId === v.data.obraId)
  if (!etapa) return { ok: false, erro: 'Etapa inválida.' }
  if (!contextoValido(v.data.obraId, etapa, v.data.elementoId, v.data.atividadeId)) return { ok: false, erro: CONTEXTO_INVALIDO }

  const agora = new Date()
  if (!diasPermitidos(agora).includes(v.data.data))
    return {
      ok: false,
      erro: 'Só pode lançar horas dos últimos 7 dias. Para dias anteriores, fale com a administração.',
      campos: { data: ['Fora do prazo.'] },
    }
  const inicio = isoDe(v.data.data, v.data.inicio)
  const fim = isoDe(v.data.data, v.data.fim)
  if (fim > arredondarFim(agora)) return { ok: false, erro: 'Não pode lançar horas no futuro.', campos: { fim: ['No futuro.'] } }
  if (sobrepoe({ inicio, fim }, registosDe(eu.id))) return { ok: false, erro: SOBREPOSTO, campos: { inicio: [SOBREPOSTO] } }

  const registo = {
    id: novoId(),
    empresaId: eu.empresaId,
    clientId: v.data.clientId,
    obraId: v.data.obraId,
    obraEtapaId: etapa.id,
    atividadeId: v.data.atividadeId,
    elementoId: v.data.elementoId,
    perfilId: eu.id,
    equipaId: eu.equipaId,
    inicio,
    fim,
    duracaoMin: duracaoMin(inicio, fim),
    nota: v.data.nota || null,
    origem: 'manual' as const,
    estadoSync: 'sincronizado' as const,
    criadoEm: agora.toISOString(),
    arquivadoEm: null,
  }
  d.registosTempo.push(registo)
  marcarEtapaEmCurso(etapa, inicio)
  registarHistorico({
    entidade: 'registos_tempo',
    entidadeId: registo.id,
    obraId: registo.obraId,
    acao: 'criar',
    resumo: `Lançou horas em ${etapa.nome}: ${v.data.inicio}–${v.data.fim}`,
    depois: registo,
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, id: registo.id, mensagem: 'Horas guardadas.' }
}

/**
 * Corrige início/fim, sem aprovação: o autor durante 24 h, a administração sempre.
 * Depois das 24 h o registo fica fechado para o autor. Fica no histórico com o motivo.
 */
export async function corrigirTempo(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  const v = corrigirTempoSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const d = db()
  const r = d.registosTempo.find((x) => x.id === v.data.registoId)
  if (!r) return naoEncontrado()
  if (!podeEditarRegisto(eu, r))
    return r.perfilId === eu.id
      ? { ok: false, erro: 'Já passaram 24 horas: este registo está fechado. Só a administração o pode alterar.' }
      : semPermissao()
  // Sempre em quartos de hora: início para baixo, fim para cima.
  const inicio = arredondarInicio(inputLisboaParaIso(v.data.inicio))
  const fim = arredondarFim(inputLisboaParaIso(v.data.fim))
  if (fim > arredondarFim(new Date()))
    return { ok: false, erro: 'O fim não pode ser no futuro.', campos: { fim: ['O fim não pode ser no futuro.'] } }
  // Um registo ainda em curso só a administração fecha por aqui (o próprio termina no ecrã de registo).
  const emCurso = r.fim == null
  if (emCurso && !eAdmin(eu)) return { ok: false, erro: 'Termine o trabalho no ecrã de registo.' }
  if (sobrepoe({ inicio, fim }, registosDe(r.perfilId, r.id))) return { ok: false, erro: SOBREPOSTO }

  const antes = { inicio: r.inicio, fim: r.fim, duracaoMin: r.duracaoMin }
  r.inicio = inicio
  r.fim = fim
  r.duracaoMin = duracaoMin(inicio, fim)
  registarHistorico({
    entidade: 'registos_tempo',
    entidadeId: r.id,
    obraId: r.obraId,
    acao: 'alterar',
    resumo: emCurso ? `Terminou registo em curso às ${horaDe(fim)}` : 'Corrigiu registo de tempo',
    antes,
    depois: { inicio, fim, duracaoMin: r.duracaoMin },
    motivo: v.data.motivo,
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, mensagem: 'Registo corrigido.' }
}

/** Arquiva um registo errado (só administração). Deixa de contar em horas e custos; fica no histórico. */
export async function arquivarTempo(_: Resultado | null, formData: FormData): Promise<Resultado> {
  const eu = await exigirSessao()
  if (!eAdmin(eu)) return semPermissao()
  const v = arquivarTempoSchema.safeParse(lerForm(formData))
  if (!v.success) return falhaValidacao(v.error)
  const r = db().registosTempo.find((x) => x.id === v.data.registoId)
  if (!r || !mesmaEmpresa(eu, r)) return naoEncontrado()
  if (r.arquivadoEm) return { ok: false, erro: 'Este registo já está arquivado.' }
  r.arquivadoEm = new Date().toISOString()
  registarHistorico({
    entidade: 'registos_tempo',
    entidadeId: r.id,
    obraId: r.obraId,
    acao: 'arquivar',
    resumo: 'Arquivou registo de tempo',
    antes: { arquivadoEm: null, inicio: r.inicio, fim: r.fim, duracaoMin: r.duracaoMin },
    depois: { arquivadoEm: r.arquivadoEm },
    motivo: v.data.motivo,
    autorId: eu.id,
  })
  revalidatePath('/admin', 'layout')
  return { ok: true, mensagem: 'Registo arquivado.' }
}

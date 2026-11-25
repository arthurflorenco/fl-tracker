import 'server-only'
import { db } from '@/lib/mock/store'
import { chaveDia } from '@/lib/format'
import { etapasDaObra } from '@/modules/etapas/queries'
import { custoAcumulado, custoHoraAtual, custoHoraEm, inicioPeriodo, resumoObra, semanaDe } from './calculos'
import type { Periodo } from './schema'

/* Só a administração chama estas funções (as páginas usam exigirArea('analise') ou podeVerFinanceiro).
   As funções de entrada recebem `empresaId` e só olham para os dados dessa empresa. */

const registosValidos = () => db().registosTempo.filter((r) => !r.arquivadoEm)

export const custosDiretosDaObra = (obraId: string) =>
  db()
    .custosDiretos.filter((c) => c.obraId === obraId && !c.arquivadoEm)
    .sort((a, b) => b.data.localeCompare(a.data))

export const historicoCustoHora = (perfilId: string) =>
  db()
    .custosHora.filter((c) => c.perfilId === perfilId)
    .sort((a, b) => b.desde.localeCompare(a.desde))

export const custoHoraAtualDe = (perfilId: string) => custoHoraAtual(db().custosHora, perfilId)

/** Dia em que a obra terminou (última etapa concluída), se estiver concluída. */
function concluidaEm(obraId: string) {
  const etapas = etapasDaObra(obraId)
  if (!etapas.length || etapas.some((e) => e.estado !== 'concluida')) return null
  return etapas.reduce((m, e) => (e.concluidaEm && e.concluidaEm > m ? e.concluidaEm : m), '')
}

/** Custos diretos / valor contratado nas obras concluídas — base da projeção das obras em curso. */
export function taxaDiretosHistorica(empresaId: string) {
  const d = db()
  let valor = 0
  let diretos = 0
  for (const o of d.obras.filter((x) => x.empresaId === empresaId && x.estado === 'concluida' && x.valorContratado)) {
    valor += o.valorContratado!
    diretos += d.custosDiretos.filter((c) => c.obraId === o.id && !c.arquivadoEm).reduce((s, c) => s + c.valor, 0)
  }
  return valor ? diretos / valor : null
}

export function resumoFinanceiroObra(empresaId: string, obraId: string, taxa = taxaDiretosHistorica(empresaId)) {
  const d = db()
  const obra = d.obras.find((o) => o.id === obraId && o.empresaId === empresaId)
  if (!obra) return null
  const registos = registosValidos().filter((r) => r.obraId === obraId)
  const custos = d.custosDiretos.filter((c) => c.obraId === obraId)
  const etapas = etapasDaObra(obraId)
  const resumo = resumoObra({
    valorContratado: obra.valorContratado,
    registos,
    custosHora: d.custosHora,
    custosDiretos: custos,
    etapas,
    concluida: obra.estado === 'concluida',
    taxaDiretosHistorica: taxa,
  })
  const elementos = d.elementos.filter((e) => e.obraId === obraId).length
  return {
    obra,
    ...resumo,
    elementos,
    horasPorElemento: elementos ? resumo.minutos / 60 / elementos : null,
    custoPorElemento: elementos ? resumo.custoTotal / elementos : null,
    serie: custoAcumulado(registos, d.custosHora, custos),
    concluidaEm: concluidaEm(obraId),
    pessoas: resumo.porPessoa.map((p) => ({ ...p, nome: d.perfis.find((x) => x.id === p.perfilId)?.nome ?? '—' })),
  }
}
export type ResumoFinanceiroObra = NonNullable<ReturnType<typeof resumoFinanceiroObra>>

/** Todas as obras não arquivadas com o resumo financeiro (mais recentes primeiro). */
export function financeiroDasObras(empresaId: string) {
  const taxa = taxaDiretosHistorica(empresaId)
  return db()
    .obras.filter((o) => o.empresaId === empresaId && o.estado !== 'arquivada')
    .sort((a, b) => b.codigo.localeCompare(a.codigo))
    .map((o) => resumoFinanceiroObra(empresaId, o.id, taxa)!)
}

/** Tipo de trabalho do registo, pela equipa: fabricação, montagem ou escritório. */
function tipoTrabalho(equipaId: string | null) {
  const t = db().equipas.find((e) => e.id === equipaId)?.tipo
  return t === 'fabricacao' || t === 'montagem' ? t : 'escritorio'
}

export function resumoEmpresa(empresaId: string, periodo: Periodo, agora = new Date()) {
  const d = db()
  const desde = inicioPeriodo(periodo, agora)
  const noPeriodo = (iso: string) => !desde || chaveDia(iso) >= desde
  const registos = registosValidos().filter((r) => r.empresaId === empresaId && r.duracaoMin != null && noPeriodo(r.inicio))

  // Obras relevantes: em curso, ou com trabalho / conclusão no período.
  const obras = financeiroDasObras(empresaId).filter(
    (o) => o.obra.estado === 'ativa' || registos.some((r) => r.obraId === o.obra.id) || (o.concluidaEm != null && noPeriodo(o.concluidaEm)),
  )
  const concluidas = obras.filter((o) => o.obra.estado === 'concluida')
  const ativas = obras.filter((o) => o.obra.estado === 'ativa')
  const soma = (xs: number[]) => xs.reduce((s, x) => s + x, 0)

  const valorConcluidas = soma(concluidas.map((o) => o.valorContratado ?? 0))
  const margemConcluidas = soma(concluidas.map((o) => o.margem ?? 0))
  const valorAtivas = soma(ativas.map((o) => o.valorContratado ?? 0))
  const margemProjetadaAtivas = soma(ativas.map((o) => o.margemProjetada ?? 0))

  let minutos = 0
  let custoMaoObra = 0
  const semanas = new Map<string, { fabricacao: number; montagem: number; escritorio: number }>()
  const etapas = new Map<string, number>()
  const pessoas = new Map<string, { minutos: number; custo: number }>()
  for (const r of registos) {
    const custo = (r.duracaoMin! / 60) * (custoHoraEm(d.custosHora, r.perfilId, r.inicio) ?? 0)
    minutos += r.duracaoMin!
    custoMaoObra += custo
    const s = semanaDe(chaveDia(r.inicio))
    const w = semanas.get(s) ?? { fabricacao: 0, montagem: 0, escritorio: 0 }
    w[tipoTrabalho(r.equipaId)] += r.duracaoMin! / 60
    semanas.set(s, w)
    const nomeEtapa = d.obraEtapas.find((e) => e.id === r.obraEtapaId)?.nome ?? '—'
    etapas.set(nomeEtapa, (etapas.get(nomeEtapa) ?? 0) + r.duracaoMin! / 60)
    const p = pessoas.get(r.perfilId) ?? { minutos: 0, custo: 0 }
    p.minutos += r.duracaoMin!
    p.custo += custo
    pessoas.set(r.perfilId, p)
  }

  const ordemEtapa = (nome: string) => d.etapasModelo.find((e) => e.nome === nome)?.ordem ?? 99
  const arred = (n: number) => Math.round(n * 10) / 10

  return {
    desde,
    kpis: {
      valorObras: valorConcluidas + valorAtivas,
      valorConcluidas,
      margemConcluidas,
      margemConcluidasPct: valorConcluidas ? (margemConcluidas / valorConcluidas) * 100 : null,
      valorAtivas,
      margemProjetadaAtivas,
      margemProjetadaAtivasPct: valorAtivas ? (margemProjetadaAtivas / valorAtivas) * 100 : null,
      minutos,
      custoMaoObra,
      nConcluidas: concluidas.length,
      nAtivas: ativas.length,
      emPrejuizo: obras.filter((o) => o.estado === 'prejuizo' || (o.obra.estado === 'ativa' && (o.margemProjetada ?? 0) < 0)),
      emRisco: obras.filter((o) => o.estado === 'risco'),
    },
    obras,
    horasPorSemana: [...semanas.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([semana, v]) => ({ semana, fabricacao: arred(v.fabricacao), montagem: arred(v.montagem), escritorio: arred(v.escritorio) })),
    horasPorEtapa: [...etapas.entries()]
      .sort(([a], [b]) => ordemEtapa(a) - ordemEtapa(b))
      .map(([etapa, horas]) => ({ etapa, horas: arred(horas) })),
    pessoas: [...pessoas.entries()]
      .map(([perfilId, v]) => ({
        perfilId,
        nome: d.perfis.find((p) => p.id === perfilId)?.nome ?? '—',
        horas: arred(v.minutos / 60),
        custo: Math.round(v.custo),
      }))
      .sort((a, b) => b.horas - a.horas),
  }
}

/** Funcionários no período: custo/hora atual, horas, custo gerado, distribuição por etapa e obras. */
export function porFuncionario(empresaId: string, periodo: Periodo, agora = new Date()) {
  const d = db()
  const desde = inicioPeriodo(periodo, agora)
  const registos = registosValidos().filter(
    (r) => r.empresaId === empresaId && r.duracaoMin != null && (!desde || chaveDia(r.inicio) >= desde),
  )
  return d.perfis
    .filter((p) => p.empresaId === empresaId && p.ativo && p.papel !== 'cliente' && p.papel !== 'pos_venda')
    .map((p) => {
      const meus = registos.filter((r) => r.perfilId === p.id)
      const porEtapa: Record<string, number> = {}
      let custo = 0
      for (const r of meus) {
        const nome = d.obraEtapas.find((e) => e.id === r.obraEtapaId)?.nome ?? '—'
        porEtapa[nome] = (porEtapa[nome] ?? 0) + r.duracaoMin! / 60
        custo += (r.duracaoMin! / 60) * (custoHoraEm(d.custosHora, p.id, r.inicio) ?? 0)
      }
      const minutos = meus.reduce((s, r) => s + r.duracaoMin!, 0)
      const obras = [...new Set(meus.map((r) => r.obraId))]
        .map((id) => d.obras.find((o) => o.id === id)!)
        .filter(Boolean)
        .sort((a, b) => b.codigo.localeCompare(a.codigo))
      return {
        perfil: p,
        equipa: d.equipas.find((e) => e.id === p.equipaId) ?? null,
        custoHora: custoHoraAtual(d.custosHora, p.id, agora),
        minutos,
        custo,
        porEtapa,
        obras,
      }
    })
    .sort((a, b) => b.minutos - a.minutos)
}

/** Para comparar obras por etapa: horas reais e previstas por nome de etapa. */
export function comparacaoPorEtapa(empresaId: string, obraIds: string[]) {
  const resumos = obraIds.map((id) => resumoFinanceiroObra(empresaId, id)).filter((r): r is ResumoFinanceiroObra => r != null)
  const nomes = [...new Set(resumos.flatMap((r) => r.porEtapa.filter((e) => e.minutos > 0 || e.horasPrevistas).map((e) => e.nome)))]
  const ordem = (n: string) => db().etapasModelo.find((e) => e.nome === n)?.ordem ?? 99
  return {
    resumos,
    linhas: nomes
      .sort((a, b) => ordem(a) - ordem(b))
      .map((etapa) => ({
        etapa,
        ...Object.fromEntries(
          resumos.map((r) => [r.obra.id, Math.round(((r.porEtapa.find((e) => e.nome === etapa)?.minutos ?? 0) / 60) * 10) / 10]),
        ),
      })),
  }
}

/* ─── Pessoas e equipas: ficha, histórico de obras e comparação ─────────── */

type RegistoTerminado = ReturnType<typeof registosValidos>[number] & { duracaoMin: number }

const terminados = () => registosValidos().filter((r): r is RegistoTerminado => r.duracaoMin != null)
const arred1 = (n: number) => Math.round(n * 10) / 10
const nomeEtapa = (obraEtapaId: string) => db().obraEtapas.find((e) => e.id === obraEtapaId)?.nome ?? '—'
const ordemEtapa = (nome: string) => db().etapasModelo.find((e) => e.nome === nome)?.ordem ?? 99
const custoDe = (r: RegistoTerminado) => (r.duracaoMin / 60) * (custoHoraEm(db().custosHora, r.perfilId, r.inicio) ?? 0)

/** Totais de um conjunto de registos terminados: horas, custo, dias, etapas, semanas, tipo de trabalho. */
function agregar(registos: RegistoTerminado[]) {
  let minutos = 0
  let custo = 0
  const dias = new Set<string>()
  const porEtapa: Record<string, number> = {}
  const porSemana: Record<string, number> = {}
  const porTipo = { fabricacao: 0, montagem: 0, escritorio: 0 }
  for (const r of registos) {
    const h = r.duracaoMin / 60
    minutos += r.duracaoMin
    custo += custoDe(r)
    const dia = chaveDia(r.inicio)
    dias.add(dia)
    const e = nomeEtapa(r.obraEtapaId)
    porEtapa[e] = (porEtapa[e] ?? 0) + h
    const s = semanaDe(dia)
    porSemana[s] = (porSemana[s] ?? 0) + h
    porTipo[tipoTrabalho(r.equipaId)] += h
  }
  return {
    minutos,
    custo,
    diasTrabalhados: dias.size,
    mediaHorasDia: dias.size ? minutos / 60 / dias.size : null,
    porEtapa,
    porSemana,
    porTipo,
    obraIds: [...new Set(registos.map((r) => r.obraId))],
  }
}

/** Histórico de obras de um conjunto de registos (todas, mais recentes primeiro). */
function historicoObras(registos: RegistoTerminado[], extraObraIds: string[] = []) {
  const d = db()
  const ids = [...new Set([...registos.map((r) => r.obraId), ...extraObraIds])]
  return ids
    .map((id) => {
      const obra = d.obras.find((o) => o.id === id)
      if (!obra) return null
      const meus = registos.filter((r) => r.obraId === id)
      const a = agregar(meus)
      const inicios = meus.map((r) => r.inicio).sort()
      return {
        obra,
        minutos: a.minutos,
        custo: a.custo,
        primeiro: inicios[0] ?? null,
        ultimo: inicios.at(-1) ?? null,
        etapas: Object.keys(a.porEtapa).sort((x, y) => ordemEtapa(x) - ordemEtapa(y)),
      }
    })
    .filter((x) => x != null)
    .sort((a, b) => (b.ultimo ?? b.obra.dataInicio).localeCompare(a.ultimo ?? a.obra.dataInicio))
}

const noPeriodo = (periodo: Periodo, agora: Date) => {
  const desde = inicioPeriodo(periodo, agora)
  return (r: RegistoTerminado) => !desde || chaveDia(r.inicio) >= desde
}

const ordenarEtapas = (porEtapa: Record<string, number>) =>
  Object.entries(porEtapa)
    .sort(([a], [b]) => ordemEtapa(a) - ordemEtapa(b))
    .map(([etapa, h]) => ({ etapa, horas: arred1(h) }))

/** Todas as semanas (segundas-feiras) entre a primeira e a última — as semanas sem horas aparecem a 0 nos gráficos. */
function semanasSeguidas(semanas: string[]) {
  if (!semanas.length) return []
  const ord = [...semanas].sort()
  const out: string[] = []
  for (let d = new Date(`${ord[0]}T12:00:00Z`); d.toISOString().slice(0, 10) <= ord.at(-1)!; d.setUTCDate(d.getUTCDate() + 7))
    out.push(d.toISOString().slice(0, 10))
  return out
}

const ordenarSemanas = (porSemana: Record<string, number>) =>
  semanasSeguidas(Object.keys(porSemana)).map((semana) => ({ semana, horas: arred1(porSemana[semana] ?? 0) }))

/** Ficha de uma pessoa: números do período, gráficos e histórico de obras (desde sempre). */
export function fichaFuncionario(empresaId: string, perfilId: string, periodo: Periodo, agora = new Date()) {
  const d = db()
  const perfil = d.perfis.find((p) => p.id === perfilId && p.empresaId === empresaId)
  if (!perfil) return null
  const todos = terminados().filter((r) => r.perfilId === perfilId)
  const doPeriodo = todos.filter(noPeriodo(periodo, agora))
  const a = agregar(doPeriodo)
  const obrasPeriodo = historicoObras(doPeriodo)
  return {
    perfil,
    equipa: d.equipas.find((e) => e.id === perfil.equipaId) ?? null,
    custoHora: custoHoraAtual(d.custosHora, perfilId, agora),
    historicoCustoHora: historicoCustoHora(perfilId),
    ...a,
    horasPorEtapa: ordenarEtapas(a.porEtapa),
    horasPorSemana: ordenarSemanas(a.porSemana),
    horasPorObra: obrasPeriodo.map((o) => ({ obra: o.obra.codigo, horas: arred1(o.minutos / 60) })),
    obras: historicoObras(todos),
  }
}

/** Ficha de uma equipa: membros, horas por membro e histórico de obras (atribuídas ou com horas da equipa). */
export function fichaEquipa(empresaId: string, equipaId: string, periodo: Periodo, agora = new Date()) {
  const d = db()
  const equipa = d.equipas.find((e) => e.id === equipaId && e.empresaId === empresaId)
  if (!equipa) return null
  const membros = d.perfis.filter((p) => p.equipaId === equipaId && p.ativo).sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
  // Horas "da equipa": registos feitos ao serviço desta equipa (equipa guardada no registo).
  const todos = terminados().filter((r) => r.equipaId === equipaId)
  const doPeriodo = todos.filter(noPeriodo(periodo, agora))
  const a = agregar(doPeriodo)
  const pessoasIds = [...new Set([...membros.map((m) => m.id), ...doPeriodo.map((r) => r.perfilId)])]
  const semanas = new Map<string, Record<string, number>>()
  for (const r of doPeriodo) {
    const s = semanaDe(chaveDia(r.inicio))
    const w = semanas.get(s) ?? {}
    w[r.perfilId] = (w[r.perfilId] ?? 0) + r.duracaoMin / 60
    semanas.set(s, w)
  }
  const atribuidas = d.obraEquipas.filter((oe) => oe.equipaId === equipaId).map((oe) => oe.obraId)
  return {
    equipa,
    membros,
    ...a,
    pessoas: pessoasIds
      .map((id) => {
        const p = d.perfis.find((x) => x.id === id)!
        const m = agregar(doPeriodo.filter((r) => r.perfilId === id))
        return { perfil: p, membro: membros.some((x) => x.id === id), minutos: m.minutos, custo: m.custo }
      })
      .sort((x, y) => y.minutos - x.minutos),
    horasPorSemana: semanasSeguidas([...semanas.keys()]).map((semana) => ({
      semana,
      ...Object.fromEntries(pessoasIds.map((pid) => [pid, arred1(semanas.get(semana)?.[pid] ?? 0)])),
    })),
    obras: historicoObras(todos, atribuidas).map((o) => ({ ...o, atribuida: atribuidas.includes(o.obra.id) })),
  }
}

/** Comparação de 2 a 6 pessoas no período: horas por etapa e por semana, e números lado a lado. */
export function comparacaoFuncionarios(empresaId: string, perfilIds: string[], periodo: Periodo, agora = new Date()) {
  const d = db()
  const registos = terminados().filter(noPeriodo(periodo, agora))
  const pessoas = perfilIds
    .map((id) => d.perfis.find((p) => p.id === id && p.empresaId === empresaId))
    .filter((p) => p != null)
    .map((perfil) => {
      const a = agregar(registos.filter((r) => r.perfilId === perfil.id))
      const total = a.minutos / 60
      return {
        perfil,
        equipa: d.equipas.find((e) => e.id === perfil.equipaId) ?? null,
        custoHora: custoHoraAtual(d.custosHora, perfil.id, agora),
        ...a,
        pctMontagem: total ? (a.porTipo.montagem / total) * 100 : null,
        pctFabricacao: total ? (a.porTipo.fabricacao / total) * 100 : null,
      }
    })
  const etapas = [...new Set(pessoas.flatMap((p) => Object.keys(p.porEtapa)))].sort((a, b) => ordemEtapa(a) - ordemEtapa(b))
  const semanas = semanasSeguidas([...new Set(pessoas.flatMap((p) => Object.keys(p.porSemana)))])
  return {
    pessoas,
    porEtapa: etapas.map((etapa) => ({
      etapa,
      ...Object.fromEntries(pessoas.map((p) => [p.perfil.id, arred1(p.porEtapa[etapa] ?? 0)])),
    })),
    porSemana: semanas.map((semana) => ({
      semana,
      ...Object.fromEntries(pessoas.map((p) => [p.perfil.id, arred1(p.porSemana[semana] ?? 0)])),
    })),
  }
}

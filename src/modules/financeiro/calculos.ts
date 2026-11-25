/**
 * Cálculos financeiros puros (sem I/O) — testados em calculos.test.ts.
 * Lucro = valor contratado − mão de obra (horas × custo/hora em vigor na data) − custos diretos.
 */
import { chaveDia } from '@/lib/format'
import type { EstadoEtapa } from '@/modules/etapas/schema'
import type { CustoDireto, CustoHora, TipoCusto } from './schema'

/** Etapa em risco quando as horas reais passam desta fração das previstas sem estar concluída. */
export const LIMIAR_RISCO = 0.8

export interface RegistoCalc {
  perfilId: string
  obraEtapaId: string
  inicio: string
  duracaoMin: number | null
  arquivadoEm: string | null
}

export interface EtapaCalc {
  id: string
  nome: string
  ordem: number
  estado: EstadoEtapa
  horasPrevistas: number | null
}

/** Custo/hora em vigor para a pessoa no dia do registo (último `desde` <= dia). */
export function custoHoraEm(historico: CustoHora[], perfilId: string, dataIso: string): number | null {
  const dia = chaveDia(dataIso)
  let melhor: CustoHora | null = null
  for (const c of historico) {
    if (c.perfilId !== perfilId || c.desde > dia) continue
    if (!melhor || c.desde > melhor.desde) melhor = c
  }
  return melhor?.valor ?? null
}

/** Custo/hora atual (o mais recente já em vigor). */
export const custoHoraAtual = (historico: CustoHora[], perfilId: string, agora = new Date()) =>
  custoHoraEm(historico, perfilId, agora.toISOString())

const terminados = <T extends RegistoCalc>(rs: T[]) => rs.filter((r) => !r.arquivadoEm && r.duracaoMin != null)

/** Mão de obra de um conjunto de registos terminados. Pessoas sem custo/hora contam 0 € e são assinaladas. */
export function maoDeObra(registos: RegistoCalc[], historico: CustoHora[]) {
  let minutos = 0
  let custo = 0
  const semCusto = new Set<string>()
  for (const r of terminados(registos)) {
    const ch = custoHoraEm(historico, r.perfilId, r.inicio)
    if (ch == null) semCusto.add(r.perfilId)
    minutos += r.duracaoMin!
    custo += (r.duracaoMin! / 60) * (ch ?? 0)
  }
  return { minutos, custo, semCusto: [...semCusto] }
}

export type EstadoFinanceiro = 'ok' | 'risco' | 'prejuizo' | 'sem_valor'

export interface ResumoObraInput {
  valorContratado: number | null
  registos: RegistoCalc[]
  custosHora: CustoHora[]
  custosDiretos: Pick<CustoDireto, 'tipo' | 'valor' | 'data' | 'arquivadoEm'>[]
  etapas: EtapaCalc[]
  /** Obra concluída: a projeção é o real. */
  concluida?: boolean
  /** Custos diretos / valor nas obras concluídas (0–1). Estima o material que ainda falta comprar. */
  taxaDiretosHistorica?: number | null
}

export function resumoObra({
  valorContratado,
  registos,
  custosHora,
  custosDiretos,
  etapas,
  concluida = false,
  taxaDiretosHistorica = null,
}: ResumoObraInput) {
  const validos = terminados(registos)
  const emCurso = registos.filter((r) => !r.arquivadoEm && r.duracaoMin == null).length
  const mo = maoDeObra(validos, custosHora)

  // Por etapa
  const porEtapa = [...etapas]
    .sort((a, b) => a.ordem - b.ordem)
    .map((e) => {
      const m = maoDeObra(
        validos.filter((r) => r.obraEtapaId === e.id),
        custosHora,
      )
      const horas = m.minutos / 60
      const prev = e.horasPrevistas
      const desvioPct = prev ? ((horas - prev) / prev) * 100 : null
      const excedida = prev != null && horas > prev
      const risco = prev != null && e.estado !== 'concluida' && horas >= prev * LIMIAR_RISCO
      return {
        id: e.id,
        nome: e.nome,
        ordem: e.ordem,
        estado: e.estado,
        minutos: m.minutos,
        custo: m.custo,
        horasPrevistas: prev,
        desvioPct,
        excedida,
        risco,
      }
    })

  // Por pessoa
  const porPessoaMap = new Map<string, { perfilId: string; minutos: number; custo: number }>()
  for (const r of validos) {
    const p = porPessoaMap.get(r.perfilId) ?? { perfilId: r.perfilId, minutos: 0, custo: 0 }
    p.minutos += r.duracaoMin!
    p.custo += (r.duracaoMin! / 60) * (custoHoraEm(custosHora, r.perfilId, r.inicio) ?? 0)
    porPessoaMap.set(r.perfilId, p)
  }
  const porPessoa = [...porPessoaMap.values()].sort((a, b) => b.minutos - a.minutos)

  // Custos diretos
  const diretos = custosDiretos.filter((c) => !c.arquivadoEm)
  const custosDiretosTotal = diretos.reduce((s, c) => s + c.valor, 0)
  const porTipo = {} as Record<TipoCusto, number>
  for (const c of diretos) porTipo[c.tipo] = (porTipo[c.tipo] ?? 0) + c.valor

  const custoTotal = mo.custo + custosDiretosTotal
  const margem = valorContratado != null ? valorContratado - custoTotal : null
  const margemPct = valorContratado ? (margem! / valorContratado) * 100 : null
  const horas = mo.minutos / 60
  const horasPrevistas = etapas.some((e) => e.horasPrevistas != null) ? etapas.reduce((s, e) => s + (e.horasPrevistas ?? 0), 0) : null

  // Projeção no fim: etapas por concluir gastam pelo menos o previsto (ao custo/hora médio da obra).
  const custoHoraMedio = mo.minutos ? mo.custo / horas : 0
  const restante = concluida
    ? 0
    : porEtapa.reduce((s, e) => {
        if (e.estado === 'concluida' || e.horasPrevistas == null) return s
        return s + Math.max(e.horasPrevistas - e.minutos / 60, 0) * custoHoraMedio
      }, 0)
  // Custos diretos ainda por lançar: pelo menos a média histórica (custos diretos / valor) das obras concluídas.
  const diretosEstimados =
    concluida || valorContratado == null || !taxaDiretosHistorica
      ? 0
      : Math.max(valorContratado * taxaDiretosHistorica - custosDiretosTotal, 0)
  const custoProjetado = custoTotal + restante + diretosEstimados
  const margemProjetada = valorContratado != null ? valorContratado - custoProjetado : null

  const estado: EstadoFinanceiro =
    valorContratado == null
      ? 'sem_valor'
      : margem! < 0
        ? 'prejuizo'
        : margemProjetada! < 0 || porEtapa.some((e) => e.risco || (e.excedida && e.estado !== 'concluida'))
          ? 'risco'
          : 'ok'

  return {
    valorContratado,
    minutos: mo.minutos,
    registosEmCurso: emCurso,
    custoMaoObra: mo.custo,
    semCusto: mo.semCusto,
    custosDiretos: custosDiretosTotal,
    porTipo,
    custoTotal,
    margem,
    margemPct,
    euroPorHora: valorContratado != null && horas > 0 ? valorContratado / horas : null,
    horasPrevistas,
    custoProjetado,
    diretosEstimados,
    margemProjetada,
    porEtapa,
    porPessoa,
    estado,
  }
}
export type ResumoObra = ReturnType<typeof resumoObra>

/** Custo acumulado por dia (mão de obra + custos diretos) — para ver quando a obra passa o valor contratado. */
export function custoAcumulado(
  registos: RegistoCalc[],
  custosHora: CustoHora[],
  custosDiretos: Pick<CustoDireto, 'valor' | 'data' | 'arquivadoEm'>[],
) {
  const porDia = new Map<string, { maoObra: number; diretos: number }>()
  const add = (dia: string, k: 'maoObra' | 'diretos', v: number) => {
    const x = porDia.get(dia) ?? { maoObra: 0, diretos: 0 }
    x[k] += v
    porDia.set(dia, x)
  }
  for (const r of terminados(registos))
    add(chaveDia(r.inicio), 'maoObra', (r.duracaoMin! / 60) * (custoHoraEm(custosHora, r.perfilId, r.inicio) ?? 0))
  for (const c of custosDiretos) if (!c.arquivadoEm) add(c.data, 'diretos', c.valor)
  let mo = 0
  let di = 0
  return [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dia, v]) => {
      mo += v.maoObra
      di += v.diretos
      return { dia, maoObra: Math.round(mo), diretos: Math.round(di), total: Math.round(mo + di) }
    })
}

/** Início do período ("AAAA-MM-DD") ou null para "tudo". */
export function inicioPeriodo(periodo: '30d' | '90d' | 'ano' | 'tudo', agora = new Date()): string | null {
  if (periodo === 'tudo') return null
  if (periodo === 'ano') return `${chaveDia(agora).slice(0, 4)}-01-01`
  const dias = periodo === '30d' ? 30 : 90
  return chaveDia(new Date(agora.getTime() - dias * 864e5))
}

/** Segunda-feira da semana do dia ("AAAA-MM-DD"), para agrupar por semana. */
export function semanaDe(dia: string) {
  const d = new Date(`${dia}T12:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

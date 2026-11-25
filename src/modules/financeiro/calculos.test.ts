import { describe, expect, it } from 'vitest'
import { custoAcumulado, custoHoraEm, inicioPeriodo, resumoObra, semanaDe, type EtapaCalc, type RegistoCalc } from './calculos'
import type { CustoHora } from './schema'

const ch = (perfilId: string, valor: number, desde: string): CustoHora => ({
  id: `${perfilId}-${desde}`,
  empresaId: 'emp-a',
  perfilId,
  valor,
  desde,
  criadoEm: '2026-01-01T00:00:00Z',
  autorId: 'u-ana',
})
const reg = (
  perfilId: string,
  obraEtapaId: string,
  inicio: string,
  duracaoMin: number | null,
  arquivadoEm: string | null = null,
): RegistoCalc => ({
  perfilId,
  obraEtapaId,
  inicio,
  duracaoMin,
  arquivadoEm,
})
const etapa = (id: string, ordem: number, estado: EtapaCalc['estado'], horasPrevistas: number | null): EtapaCalc => ({
  id,
  nome: id,
  ordem,
  estado,
  horasPrevistas,
})

const historico = [ch('rui', 15, '2026-01-01'), ch('rui', 18, '2026-06-01'), ch('joao', 12, '2026-01-01')]

describe('custoHoraEm', () => {
  it('usa o valor em vigor no dia do registo', () => {
    expect(custoHoraEm(historico, 'rui', '2026-05-31T10:00:00Z')).toBe(15)
    expect(custoHoraEm(historico, 'rui', '2026-06-01T08:00:00Z')).toBe(18)
    expect(custoHoraEm(historico, 'rui', '2025-12-31T10:00:00Z')).toBeNull()
  })
})

describe('resumoObra', () => {
  it('custo/hora muda a meio da obra: cada registo usa o valor da sua data', () => {
    const r = resumoObra({
      valorContratado: 1000,
      registos: [reg('rui', 'fab', '2026-05-20T08:00:00Z', 120), reg('rui', 'fab', '2026-06-02T08:00:00Z', 120)],
      custosHora: historico,
      custosDiretos: [],
      etapas: [etapa('fab', 1, 'em_curso', null)],
    })
    expect(r.custoMaoObra).toBe(2 * 15 + 2 * 18)
    expect(r.margem).toBe(1000 - 66)
  })

  it('obra em prejuízo quando os custos passam o valor contratado', () => {
    const r = resumoObra({
      valorContratado: 500,
      registos: [reg('joao', 'mont', '2026-03-01T08:00:00Z', 600)],
      custosHora: historico,
      custosDiretos: [{ tipo: 'materiais', valor: 450, data: '2026-02-20', arquivadoEm: null }],
      etapas: [etapa('mont', 1, 'concluida', 10)],
      concluida: true,
    })
    expect(r.custoTotal).toBe(120 + 450)
    expect(r.margem).toBe(-70)
    expect(r.estado).toBe('prejuizo')
  })

  it('sem horas previstas não há desvio nem risco', () => {
    const r = resumoObra({
      valorContratado: 1000,
      registos: [reg('joao', 'mont', '2026-03-01T08:00:00Z', 60)],
      custosHora: historico,
      custosDiretos: [],
      etapas: [etapa('mont', 1, 'em_curso', null)],
    })
    expect(r.horasPrevistas).toBeNull()
    expect(r.porEtapa[0].desvioPct).toBeNull()
    expect(r.estado).toBe('ok')
  })

  it('ignora registos arquivados e em curso, e custos arquivados', () => {
    const r = resumoObra({
      valorContratado: 1000,
      registos: [
        reg('joao', 'mont', '2026-03-01T08:00:00Z', 60),
        reg('joao', 'mont', '2026-03-02T08:00:00Z', 60, '2026-03-03T00:00:00Z'),
        reg('joao', 'mont', '2026-03-04T08:00:00Z', null),
      ],
      custosHora: historico,
      custosDiretos: [{ tipo: 'vidro', valor: 999, data: '2026-03-01', arquivadoEm: '2026-03-02T00:00:00Z' }],
      etapas: [etapa('mont', 1, 'em_curso', null)],
    })
    expect(r.minutos).toBe(60)
    expect(r.registosEmCurso).toBe(1)
    expect(r.custosDiretos).toBe(0)
  })

  it('etapa a passar 80% do previsto fica em risco; projeção soma o que falta', () => {
    const r = resumoObra({
      valorContratado: 400,
      registos: [reg('joao', 'mont', '2026-03-01T08:00:00Z', 9 * 60)],
      custosHora: historico,
      custosDiretos: [],
      etapas: [etapa('mont', 1, 'em_curso', 10), etapa('verif', 2, 'por_iniciar', 20)],
    })
    expect(r.porEtapa[0].risco).toBe(true)
    expect(r.porEtapa[0].desvioPct).toBeCloseTo(-10)
    // 9 h × 12 € = 108 €; falta 1 h + 20 h a 12 €/h = 252 € → 360 €
    expect(r.custoProjetado).toBeCloseTo(360)
    expect(r.estado).toBe('risco')
  })

  it('pessoa sem custo/hora conta 0 € e fica assinalada', () => {
    const r = resumoObra({
      valorContratado: 100,
      registos: [reg('novo', 'mont', '2026-03-01T08:00:00Z', 60)],
      custosHora: historico,
      custosDiretos: [],
      etapas: [etapa('mont', 1, 'em_curso', null)],
    })
    expect(r.custoMaoObra).toBe(0)
    expect(r.semCusto).toEqual(['novo'])
  })
})

describe('auxiliares', () => {
  it('custo acumulado por dia', () => {
    const s = custoAcumulado(
      [reg('joao', 'mont', '2026-03-01T10:00:00Z', 60), reg('joao', 'mont', '2026-03-03T10:00:00Z', 60)],
      historico,
      [{ valor: 100, data: '2026-03-02', arquivadoEm: null }],
    )
    expect(s.map((x) => x.total)).toEqual([12, 112, 124])
  })

  it('períodos e semanas', () => {
    const agora = new Date('2026-10-17T12:00:00Z')
    expect(inicioPeriodo('ano', agora)).toBe('2026-01-01')
    expect(inicioPeriodo('30d', agora)).toBe('2026-09-17')
    expect(inicioPeriodo('tudo', agora)).toBeNull()
    expect(semanaDe('2026-10-17')).toBe('2026-10-12')
    expect(semanaDe('2026-10-12')).toBe('2026-10-12')
  })
})

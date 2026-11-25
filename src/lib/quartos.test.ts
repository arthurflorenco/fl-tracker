import { describe, expect, it } from 'vitest'
import {
  arredondarFim,
  arredondarInicio,
  diasPermitidos,
  duracaoMin,
  eQuarto,
  fimSugerido,
  inicioSugerido,
  isoDe,
  opcoesHoras,
  sobrepoe,
} from './quartos'

describe('quartos de hora (a favor do funcionário)', () => {
  it('início arredonda para baixo e fim para cima', () => {
    expect(arredondarInicio('2026-10-17T07:07:00Z')).toBe('2026-10-17T07:00:00.000Z')
    expect(arredondarFim('2026-10-17T11:08:00Z')).toBe('2026-10-17T11:15:00.000Z')
    expect(arredondarFim('2026-10-17T11:15:00Z')).toBe('2026-10-17T11:15:00.000Z')
    expect(eQuarto('2026-10-17T11:30:00Z')).toBe(true)
    expect(eQuarto('2026-10-17T11:31:00Z')).toBe(false)
  })

  it('hora de Lisboa → ISO, também no verão', () => {
    expect(isoDe('2026-07-01', '08:00')).toBe('2026-07-01T07:00:00.000Z')
    expect(isoDe('2026-01-15', '08:00')).toBe('2026-01-15T08:00:00.000Z')
    expect(duracaoMin(isoDe('2026-07-01', '14:00'), isoDe('2026-07-01', '17:30'))).toBe(210)
  })

  it('opções de 15 em 15 min', () => {
    expect(opcoesHoras('07:30', '08:15')).toEqual(['07:30', '07:45', '08:00', '08:15'])
    expect(opcoesHoras()).toHaveLength(96)
  })

  it('deteta sobreposição, incluindo registos em curso', () => {
    const outros = [
      { inicio: '2026-10-17T08:00:00Z', fim: '2026-10-17T12:00:00Z' },
      { inicio: '2026-10-17T15:00:00Z', fim: null },
    ]
    expect(sobrepoe({ inicio: '2026-10-17T12:00:00Z', fim: '2026-10-17T13:00:00Z' }, outros)).toBe(false)
    expect(sobrepoe({ inicio: '2026-10-17T11:45:00Z', fim: '2026-10-17T13:00:00Z' }, outros)).toBe(true)
    expect(sobrepoe({ inicio: '2026-10-17T16:00:00Z', fim: '2026-10-17T17:00:00Z' }, outros)).toBe(true)
  })

  it('pode lançar horas até 7 dias atrás', () => {
    const d = diasPermitidos(new Date('2026-10-17T12:00:00Z'))
    expect(d[0]).toBe('2026-10-17')
    expect(d.at(-1)).toBe('2026-10-10')
    expect(d).toHaveLength(8)
  })

  it('iniciar e terminar logo a seguir dá o quarto seguinte', () => {
    const inicio = inicioSugerido('2026-10-17T17:00:00Z')
    expect(inicio).toBe('2026-10-17T17:00:00.000Z')
    expect(fimSugerido('2026-10-17T17:00:30Z', inicio)).toBe('2026-10-17T17:15:00.000Z')
    // Às 17:00 em ponto o arredondamento para cima não sai do sítio: vale o mínimo de 15 min.
    expect(fimSugerido('2026-10-17T17:00:00Z', inicio)).toBe('2026-10-17T17:15:00.000Z')
  })

  it('registos seguidos encadeiam, mesmo com o fim anterior à frente do relógio', () => {
    const inicio = inicioSugerido('2026-10-17T17:02:00Z', '2026-10-17T17:15:00.000Z')
    expect(inicio).toBe('2026-10-17T17:15:00.000Z')
    expect(fimSugerido('2026-10-17T17:02:10Z', inicio)).toBe('2026-10-17T17:30:00.000Z')
    expect(
      sobrepoe({ inicio, fim: '2026-10-17T17:30:00.000Z' }, [{ inicio: '2026-10-17T17:00:00Z', fim: '2026-10-17T17:15:00.000Z' }]),
    ).toBe(false)
  })

  it('sem registos anteriores (ou com um de ontem) usa o relógio', () => {
    expect(inicioSugerido('2026-10-17T17:20:00Z')).toBe('2026-10-17T17:15:00.000Z')
    expect(inicioSugerido('2026-10-17T17:20:00Z', '2026-10-16T18:00:00.000Z')).toBe('2026-10-17T17:15:00.000Z')
    expect(fimSugerido('2026-10-17T17:20:00Z', '2026-10-17T17:15:00.000Z')).toBe('2026-10-17T17:30:00.000Z')
    expect(fimSugerido('2026-10-17T19:40:00Z', '2026-10-17T17:15:00.000Z')).toBe('2026-10-17T19:45:00.000Z')
  })
})

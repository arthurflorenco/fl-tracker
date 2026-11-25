import { describe, expect, it } from 'vitest'
import { fmtDuracao, inputLisboaParaIso, isoParaInputLisboa } from './format'

describe('formatação', () => {
  it('duração', () => {
    expect(fmtDuracao(45)).toBe('45 min')
    expect(fmtDuracao(120)).toBe('2 h')
    expect(fmtDuracao(135)).toBe('2 h 15 min')
    expect(fmtDuracao(null)).toBe('—')
  })

  it('hora de Lisboa ↔ UTC (verão e inverno)', () => {
    expect(inputLisboaParaIso('2026-07-01T09:00')).toBe('2026-07-01T08:00:00.000Z')
    expect(inputLisboaParaIso('2026-12-01T09:00')).toBe('2026-12-01T09:00:00.000Z')
    expect(isoParaInputLisboa('2026-07-01T08:00:00.000Z')).toBe('2026-07-01T09:00')
    expect(isoParaInputLisboa('2026-12-01T09:00:00.000Z')).toBe('2026-12-01T09:00')
  })
})

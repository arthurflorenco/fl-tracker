import { describe, expect, it } from 'vitest'
import { eQuarto, sobrepoe } from '@/lib/quartos'
import { criarSeed } from './seed'

describe('dados fictícios', () => {
  const d = criarSeed(new Date('2026-10-17T14:07:00Z'))

  it('registos em quartos de hora', () => {
    const fora = d.registosTempo.filter((r) => !eQuarto(r.inicio) || (r.fim && !eQuarto(r.fim)))
    expect(fora.map((r) => r.id)).toEqual([])
  })

  it('sem registos sobrepostos da mesma pessoa', () => {
    const sobrepostos = d.registosTempo.filter((r, i) =>
      sobrepoe(
        r,
        d.registosTempo.filter((o, j) => j !== i && o.perfilId === r.perfilId),
      ),
    )
    expect(sobrepostos.map((r) => r.id)).toEqual([])
  })

  it('duas empresas, com ids e tokens de QR únicos na base toda', () => {
    expect(d.empresas.map((e) => e.id)).toEqual(['emp-a', 'emp-b'])
    const ids = Object.entries(d).flatMap(([, linhas]) => (linhas as { id?: unknown }[]).map((l) => l.id).filter((x) => x != null))
    expect(new Set(ids).size).toBe(ids.length)
    const tokens = [...d.obras, ...d.elementos].map((x) => x.qrToken)
    expect(new Set(tokens).size).toBe(tokens.length)
    for (const e of d.empresas) expect(d.obras.filter((o) => o.empresaId === e.id).length).toBeGreaterThan(0)
  })

  it('nenhuma linha aponta para uma linha de outra empresa', () => {
    const empresaDe = new Map<string, string>()
    for (const [tabela, linhas] of Object.entries(d))
      if (tabela !== 'empresas') for (const l of linhas as { id?: string; empresaId: string }[]) if (l.id) empresaDe.set(l.id, l.empresaId)
    const cruzadas: string[] = []
    for (const [tabela, linhas] of Object.entries(d)) {
      if (tabela === 'empresas') continue
      for (const l of linhas as Record<string, unknown>[])
        for (const [k, v] of Object.entries(l))
          if (k.endsWith('Id') && k !== 'empresaId' && k !== 'clientId' && typeof v === 'string' && empresaDe.get(v) !== l.empresaId)
            cruzadas.push(`${tabela}.${k}=${v}`)
    }
    expect(cruzadas).toEqual([])
  })
})

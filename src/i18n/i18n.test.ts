import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { en } from './en'
import { pt } from './pt'
import { formatadores } from './formatar'
import { MENSAGENS_EN, traduzirMensagem } from './mensagens'

/** Todas as chaves de um objeto aninhado: "nav.painel", "rotulos.papel.admin"… */
function chaves(o: object, prefixo = ''): string[] {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? chaves(v, `${prefixo}${k}.`) : [`${prefixo}${k}`]))
}
function valores(o: object): unknown[] {
  return Object.values(o).flatMap((v) => (v && typeof v === 'object' ? valores(v) : [v]))
}
function ficheiros(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? ficheiros(p) : [p]
  })
}

describe('dicionários', () => {
  it('inglês e português têm exatamente as mesmas chaves', () => {
    expect(chaves(en).sort()).toEqual(chaves(pt).sort())
  })

  it('nenhum texto vazio', () => {
    for (const d of [en, pt]) for (const v of valores(d)) if (typeof v === 'string') expect(v.trim()).not.toBe('')
  })

  it('funções devolvem o texto com o valor', () => {
    expect(en.comum.obraCodigo('2026-014')).toBe('Project 2026-014')
    expect(pt.comum.obraCodigo('2026-014')).toBe('Obra 2026-014')
  })
})

describe('mensagens do servidor (ações e validação)', () => {
  // Frases em português escritas no código do servidor: '[Maiúscula]…[ponto]'.
  const fontes = ficheiros('src/modules')
    .filter((f) => /\/(actions|schema)\.ts$/.test(f))
    .concat('src/lib/acao.ts')
  const frases = [...new Set(fontes.flatMap((f) => [...readFileSync(f, 'utf8').matchAll(/'([A-ZÀ-Ú][^'\n]*\.)'/g)].map((m) => m[1])))]

  it('encontra as frases no código', () => {
    expect(frases.length).toBeGreaterThan(50)
  })

  it('todas têm tradução para inglês', () => {
    expect(frases.filter((f) => !(f in MENSAGENS_EN))).toEqual([])
  })

  it('em português passam como estão; desconhecidas também', () => {
    expect(traduzirMensagem('Nota guardada.', 'pt')).toBe('Nota guardada.')
    expect(traduzirMensagem('Nota guardada.', 'en')).toBe('Note saved.')
    expect(traduzirMensagem('???', 'en')).toBe('???')
  })
})

describe('formatadores', () => {
  const espacos = (s: string) => s.replace(/[  ]/g, ' ')

  it('euros e percentagens no formato de cada idioma', () => {
    expect(formatadores('en').euro(12345)).toBe('€12,345')
    expect(espacos(formatadores('pt').euro(12345))).toBe('12 345 €')
    expect(formatadores('en').pct(12.34)).toBe('12.3%')
    expect(formatadores('pt').pct(12.34)).toBe('12,3%')
    expect(formatadores('en').horas(12.5)).toBe('12.5 h')
  })

  it('datas e horas em hora de Lisboa', () => {
    const iso = '2026-07-14T09:05:00Z' // verão: Lisboa = UTC+1
    expect(formatadores('en').data(iso)).toBe('14/07/2026')
    expect(formatadores('pt').hora(iso)).toBe('10:05')
    expect(formatadores('en').duracao(135)).toBe('2 h 15 min')
    expect(formatadores('en').data(null)).toBe('—')
  })
})

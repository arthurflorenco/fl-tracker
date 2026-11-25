import { describe, expect, it } from 'vitest'
import { paraCsv, slug } from './csv'

const semBom = (s: string) => s.slice(1)

describe('paraCsv', () => {
  it('começa com BOM e usa ; e CRLF', () => {
    const csv = paraCsv(['Obra', 'Horas'], [['2026-014', 12]])
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(semBom(csv)).toBe('Obra;Horas\r\n2026-014;12\r\n')
  })

  it('números com vírgula decimal, arredondados a 2 casas', () => {
    expect(semBom(paraCsv(['v'], [[15.5], [3.14159], [-2.5]]))).toBe('v\r\n15,5\r\n3,14\r\n-2,5\r\n')
  })

  it('aspas quando o texto tem ; aspas ou mudança de linha', () => {
    const csv = semBom(paraCsv(['nota'], [['a;b'], ['diz "olá"'], ['linha1\nlinha2']]))
    expect(csv).toBe('nota\r\n"a;b"\r\n"diz ""olá"""\r\n"linha1\nlinha2"\r\n')
  })

  it('vazios para null/undefined', () => {
    expect(semBom(paraCsv(['a', 'b', 'c'], [[null, undefined, 'x']]))).toBe('a;b;c\r\n;;x\r\n')
  })

  it('neutraliza fórmulas em texto', () => {
    const csv = semBom(paraCsv(['t'], [['=SOMA(A1)'], ['+351 912'], ['-x'], ['@cmd']]))
    expect(csv).toBe("t\r\n'=SOMA(A1)\r\n'+351 912\r\n'-x\r\n'@cmd\r\n")
  })

  it('mantém acentos', () => {
    expect(semBom(paraCsv(['Fabricação'], [['Medição']]))).toBe('Fabricação\r\nMedição\r\n')
  })
})

describe('slug', () => {
  it('tira acentos e espaços', () => {
    expect(slug('João Gonçalves')).toBe('joao-goncalves')
  })
})

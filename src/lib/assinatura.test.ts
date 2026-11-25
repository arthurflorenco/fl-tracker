import { describe, expect, it } from 'vitest'
import { assinar, destinoSeguro, segredoSessao, verificar } from './assinatura'

const S = 'segredo-de-teste-com-mais-de-32-caracteres'

describe('cookie de sessão assinado', () => {
  it('aceita um valor assinado com o segredo certo', () => {
    expect(verificar(assinar('u-ana', S), S)).toBe('u-ana')
  })

  it('recusa um cookie forjado (id trocado à mão)', () => {
    const [, assinatura] = assinar('u-joao', S).split('.')
    expect(verificar(`u-ana.${assinatura}`, S)).toBeNull()
  })

  it('recusa um cookie sem assinatura (formato antigo) ou vazio', () => {
    expect(verificar('u-ana', S)).toBeNull()
    expect(verificar('', S)).toBeNull()
    expect(verificar(undefined, S)).toBeNull()
  })

  it('recusa uma assinatura feita com outro segredo', () => {
    expect(verificar(assinar('u-ana', 'outro-segredo-qualquer-com-32-caracteres'), S)).toBeNull()
  })

  it('em produção exige SESSION_SECRET', () => {
    expect(() => segredoSessao({ NODE_ENV: 'production' })).toThrow()
    expect(segredoSessao({ NODE_ENV: 'production', SESSION_SECRET: S })).toBe(S)
  })
})

describe('destino depois do login', () => {
  it('aceita caminhos internos', () => {
    expect(destinoSeguro('/admin/obras/ob-1')).toBe('/admin/obras/ob-1')
  })

  it.each(['//mau.com', '/\\mau.com', 'https://mau.com', '', null])('recusa %s', (d) => {
    expect(destinoSeguro(d)).toBe('/admin')
  })
})

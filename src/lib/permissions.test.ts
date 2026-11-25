import { describe, expect, it } from 'vitest'
import {
  JANELA_EDICAO_MS,
  mesmaEmpresa,
  podeEditarRegisto,
  podeVerArea,
  podeVerFinanceiro,
  podeVerObra,
  vistaCliente,
  type VistaInternaObra,
} from './permissions'

const A = 'emp-a'
const admin = { id: 'u-admin', papel: 'admin' as const, equipaId: null, empresaId: A }
const montador = { id: 'u-mont', papel: 'montagem' as const, equipaId: 'eq-mont', empresaId: A }
const outro = { id: 'u-outro', papel: 'fabricacao' as const, equipaId: 'eq-fab', empresaId: A }
/** Administração de OUTRA empresa: não pode ver nem alterar nada da empresa A. */
const adminDeOutraEmpresa = { id: 'u-admin-b', papel: 'admin' as const, equipaId: null, empresaId: 'emp-b' }
const obra = (...equipas: string[]) => ({ empresaId: A, equipas })

const agora = new Date('2026-10-17T12:00:00Z')
const ha = (ms: number) => new Date(agora.getTime() - ms).toISOString()

describe('janela de 24 h', () => {
  it('o autor edita dentro das 24 h', () => {
    expect(podeEditarRegisto(montador, { empresaId: A, perfilId: montador.id, criadoEm: ha(23 * 3600e3) }, agora)).toBe(true)
  })

  it('depois das 24 h o registo fica fechado para o autor; a administração ainda altera', () => {
    const registo = { empresaId: A, perfilId: montador.id, criadoEm: ha(JANELA_EDICAO_MS + 60e3) }
    expect(podeEditarRegisto(montador, registo, agora)).toBe(false)
    expect(podeEditarRegisto(admin, registo, agora)).toBe(true)
  })

  it('ninguém edita registos de outra pessoa, exceto a administração', () => {
    const registo = { empresaId: A, perfilId: montador.id, criadoEm: ha(60e3) }
    expect(podeEditarRegisto(outro, registo, agora)).toBe(false)
    expect(podeEditarRegisto(admin, { empresaId: A, perfilId: montador.id, criadoEm: ha(30 * 24 * 3600e3) }, agora)).toBe(true)
  })

  it('notas usam autorId', () => {
    expect(podeEditarRegisto(montador, { empresaId: A, autorId: montador.id, criadoEm: ha(60e3) }, agora)).toBe(true)
  })

  it('registos arquivados só a administração altera', () => {
    const registo = { empresaId: A, perfilId: montador.id, criadoEm: ha(60e3), arquivadoEm: ha(1) }
    expect(podeEditarRegisto(montador, registo, agora)).toBe(false)
    expect(podeEditarRegisto(admin, registo, agora)).toBe(true)
  })
})

describe('multi-empresa', () => {
  it('nem a administração vê obras de outra empresa', () => {
    expect(podeVerObra(admin, obra())).toBe(true)
    expect(podeVerObra(adminDeOutraEmpresa, obra())).toBe(false)
  })

  it('obra inexistente: ninguém vê', () => {
    expect(podeVerObra(admin, { empresaId: null, equipas: [] })).toBe(false)
  })

  it('nem a administração altera registos de outra empresa', () => {
    const registo = { empresaId: A, perfilId: montador.id, criadoEm: ha(60e3) }
    expect(podeEditarRegisto(admin, registo, agora)).toBe(true)
    expect(podeEditarRegisto(adminDeOutraEmpresa, registo, agora)).toBe(false)
  })

  it('mesmaEmpresa recusa linhas em falta', () => {
    expect(mesmaEmpresa(admin, { empresaId: A })).toBe(true)
    expect(mesmaEmpresa(admin, { empresaId: 'emp-b' })).toBe(false)
    expect(mesmaEmpresa(admin, undefined)).toBe(false)
  })
})

describe('acesso às obras', () => {
  it('funcionários de campo só veem obras das suas equipas', () => {
    expect(podeVerObra(montador, obra('eq-mont'))).toBe(true)
    expect(podeVerObra(montador, obra('eq-fab'))).toBe(false)
  })

  it('escritório vê todas', () => {
    expect(podeVerObra(admin, obra())).toBe(true)
    expect(podeVerObra({ papel: 'orcamentacao', equipaId: null, empresaId: A }, obra())).toBe(true)
  })

  it('cliente e pós-venda não entram na área interna (Fase 2)', () => {
    expect(podeVerObra({ papel: 'cliente', equipaId: null, empresaId: A }, obra())).toBe(false)
    expect(podeVerArea('cliente', 'painel')).toBe(false)
    expect(podeVerArea('pos_venda', 'obras')).toBe(false)
  })

  it('só a administração gere utilizadores', () => {
    expect(podeVerArea('admin', 'utilizadores')).toBe(true)
    expect(podeVerArea('montagem', 'utilizadores')).toBe(false)
  })

  it('dados financeiros e análise só para a administração', () => {
    expect(podeVerFinanceiro(admin)).toBe(true)
    for (const papel of ['orcamentacao', 'compras', 'fabricacao', 'montagem', 'pos_venda', 'cliente'] as const) {
      expect(podeVerFinanceiro({ papel })).toBe(false)
      expect(podeVerArea(papel, 'analise')).toBe(false)
    }
    expect(podeVerArea('admin', 'analise')).toBe(true)
  })
})

describe('vista do cliente', () => {
  const interna: VistaInternaObra = {
    codigo: '2026-014',
    titulo: 'Moradia',
    estado: 'ativa',
    etapas: [
      { nome: 'Fabricação', estado: 'em_curso', visivelCliente: true, dataPrevista: null },
      { nome: 'Pedidos a fornecedores', estado: 'concluida', visivelCliente: false, dataPrevista: null },
    ],
    elementos: [{ referencia: 'J01', tipo: 'janela', estado: 'fabricado' }],
    fotografias: [
      { caminho: 'a.jpg', legenda: null, aprovadaCliente: true },
      { caminho: 'b.jpg', legenda: 'interna', aprovadaCliente: false },
    ],
    notas: [
      { texto: 'Vidro chegou partido — fornecedor X', interna: true, tipo: 'problema' },
      { texto: 'Fabricação a decorrer', interna: false, tipo: 'observacao' },
    ],
    registosTempo: [{ perfilId: 'u-mont', duracaoMin: 90 }],
    custos: { total: 1000 },
    margens: { pct: 30 },
    fornecedores: ['X'],
  }

  const v = vistaCliente(interna)
  const json = JSON.stringify(v)

  it('nunca inclui horas, custos, margens, fornecedores ou notas internas', () => {
    expect(v).not.toHaveProperty('registosTempo')
    expect(v).not.toHaveProperty('custos')
    expect(v).not.toHaveProperty('margens')
    expect(v).not.toHaveProperty('fornecedores')
    expect(json).not.toContain('fornecedor X')
    expect(json).not.toContain('duracaoMin')
  })

  it('só etapas visíveis e fotografias aprovadas', () => {
    expect(v.etapas.map((e) => e.nome)).toEqual(['Fabricação'])
    expect(v.fotografias.map((f) => f.caminho)).toEqual(['a.jpg'])
    expect(v.atualizacoes).toEqual([{ texto: 'Fabricação a decorrer' }])
  })
})

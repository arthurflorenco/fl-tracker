import { afterEach, describe, expect, it } from 'vitest'
import { agendarGravacao, db, gravacaoPendente, reporDb, sincronizarDb, usarLoja, type Loja } from './store'

/** Loja em memória, como o Netlify Blobs: guarda JSON e devolve um etag novo a cada escrita. */
function lojaFalsa() {
  let valor: string | null = null
  let versao = 0
  const loja: Loja & { escritas: number } = {
    escritas: 0,
    getMetadata: async () => (valor ? { etag: `e${versao}` } : null),
    get: async () => (valor ? JSON.parse(valor) : null),
    setJSON: async (_chave, dados) => {
      valor = JSON.stringify(dados)
      versao++
      loja.escritas++
      return { etag: `e${versao}` }
    },
  }
  return loja
}

const g = globalThis as unknown as { __flDb?: unknown }
/** Simula outra instância do servidor: memória vazia, a mesma loja. */
const outraInstancia = (l: Loja) => {
  g.__flDb = undefined
  usarLoja(l)
}

afterEach(() => usarLoja(null))

describe('dados partilhados entre instâncias (demonstração no Netlify)', () => {
  it('um registo criado numa instância existe na seguinte', async () => {
    const l = lojaFalsa()
    outraInstancia(l)
    await sincronizarDb() // primeira vez: grava os dados fictícios
    expect(l.escritas).toBe(1)

    db().registosTempo.push({ ...db().registosTempo[0], id: 'novo', fim: null })
    agendarGravacao()
    await gravacaoPendente()

    outraInstancia(l)
    await sincronizarDb()
    expect(db().registosTempo.some((r) => r.id === 'novo')).toBe(true)
  })

  it('várias alterações seguidas acabam todas gravadas', async () => {
    const l = lojaFalsa()
    outraInstancia(l)
    await sincronizarDb()
    db().notas.push({ ...db().notas[0], id: 'n1' })
    agendarGravacao()
    db().notas.push({ ...db().notas[0], id: 'n2' })
    agendarGravacao()
    await gravacaoPendente()

    outraInstancia(l)
    await sincronizarDb()
    expect(db().notas.map((n) => n.id)).toEqual(expect.arrayContaining(['n1', 'n2']))
  })

  it('não volta a ler a loja se nada mudou', async () => {
    const l = lojaFalsa()
    outraInstancia(l)
    await sincronizarDb()
    const antes = db()
    await sincronizarDb()
    expect(db()).toBe(antes)
  })

  it('"Repor dados" grava os dados fictícios para todas as instâncias', async () => {
    const l = lojaFalsa()
    outraInstancia(l)
    await sincronizarDb()
    db().notas.push({ ...db().notas[0], id: 'apagar' })
    agendarGravacao()
    await gravacaoPendente()
    await reporDb()

    outraInstancia(l)
    await sincronizarDb()
    expect(db().notas.some((n) => n.id === 'apagar')).toBe(false)
  })

  it('sem loja (máquina local) fica só em memória', async () => {
    usarLoja(null)
    await sincronizarDb()
    expect(db().perfis.length).toBeGreaterThan(0)
  })
})

/**
 * Testes das server actions (o ponto único de escrita): login, permissões e registo de horas.
 * Correm as ações reais contra a base em memória (seed com duas empresas), com a sessão
 * simulada por um cookie assinado. Ver src/test/ambiente.ts.
 */
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => import('@/test/ambiente').then((m) => m.mockHeaders))
vi.mock('next/navigation', () => import('@/test/ambiente').then((m) => m.mockNavigation))
vi.mock('next/cache', () => import('@/test/ambiente').then((m) => m.mockCache))
vi.mock('next/server', () => import('@/test/ambiente').then((m) => m.mockServer))

import { cookiesDoPedido, form, Redirecionado, semSessao, sessaoComo } from '@/test/ambiente'
import { assinar } from '@/lib/assinatura'
import { db, usarLoja } from '@/lib/mock/store'
import { getSessao } from '@/lib/session'
import { entrar } from '@/app/entrar/actions'
import { corrigirTempo, iniciarTempo, registarHoras, terminarTempo } from '@/modules/tempos/actions'
import { criarElemento } from '@/modules/elementos/actions'
import { adicionarResponsavel, removerResponsavel } from '@/modules/obras/actions'
import { alternarUtilizadorAtivo } from '@/modules/utilizadores/actions'
import { obraParaPerfil, obrasVisiveis } from '@/modules/obras/queries'
import { listarProjetos } from '@/modules/projetos/queries'
import { financeiroDasObras } from '@/modules/financeiro/queries'

/* Pessoas do seed (src/lib/mock/seed.ts):
   Empresa A — u-ana (admin), u-carlos (orçamentação), u-miguel (montagem A), u-pedro (montagem B)
   Empresa B — b-u-ana (admin), b-u-miguel (montagem)
   Obras A: ob-1 (fabricação + montagem A), ob-3 (só fabricação). Obra B: b-ob-1. */

// Quarta-feira, 14 de outubro de 2026, 10:07 em Lisboa (09:07 UTC).
const AGORA = new Date('2026-10-14T09:07:00Z')
const uuid = () => crypto.randomUUID()

beforeEach(() => {
  vi.useFakeTimers({ now: AGORA, toFake: ['Date'] })
  usarLoja(null) // sem Netlify Blobs: só memória
  ;(globalThis as { __flDb?: unknown }).__flDb = undefined // seed novo em cada teste
  db()
  semSessao()
})
afterAll(() => vi.useRealTimers())

const pedeRedirect = async (p: Promise<unknown>) => {
  try {
    await p
  } catch (e) {
    if (e instanceof Redirecionado) return e.destino
    throw e
  }
  return null
}

describe('login', () => {
  it('entra com um perfil válido e grava um cookie assinado', async () => {
    const destino = await pedeRedirect(entrar(form({ perfilId: 'u-miguel', destino: '/admin/obras' })))
    expect(destino).toBe('/admin/obras')
    expect(cookiesDoPedido.get('fl-sessao')).toMatch(/^u-miguel\./)
    expect((await getSessao())?.id).toBe('u-miguel')
  })

  it('ignora um destino externo depois do login (redirecionamento aberto)', async () => {
    expect(await pedeRedirect(entrar(form({ perfilId: 'u-miguel', destino: '/\\mau.example' })))).toBe('/admin')
    expect(await pedeRedirect(entrar(form({ perfilId: 'u-miguel', destino: '//mau.example' })))).toBe('/admin')
  })

  it('perfil inexistente volta para /entrar sem sessão', async () => {
    expect(await pedeRedirect(entrar(form({ perfilId: 'u-nao-existe' })))).toBe('/entrar')
    expect(cookiesDoPedido.size).toBe(0)
  })

  it('um cookie forjado (id trocado à mão) não abre sessão', async () => {
    sessaoComo('u-miguel')
    const assinatura = cookiesDoPedido.get('fl-sessao')!.split('.')[1]
    cookiesDoPedido.set('fl-sessao', `u-ana.${assinatura}`)
    expect(await getSessao()).toBeNull()
    cookiesDoPedido.set('fl-sessao', 'u-ana')
    expect(await getSessao()).toBeNull()
    cookiesDoPedido.set('fl-sessao', assinar('u-ana', 'segredo-errado-com-mais-de-32-caracteres!'))
    expect(await getSessao()).toBeNull()
  })

  it('um utilizador desativado perde a sessão', async () => {
    sessaoComo('u-miguel')
    db().perfis.find((p) => p.id === 'u-miguel')!.ativo = false
    expect(await getSessao()).toBeNull()
  })
})

describe('permissões entre empresas (IDOR)', () => {
  const perfil = (id: string) => db().perfis.find((p) => p.id === id)!

  it('a administração da empresa B não vê obras nem projetos da empresa A', () => {
    const adminB = perfil('b-u-ana')
    expect(obraParaPerfil('ob-1', adminB)).toBeNull()
    expect(obrasVisiveis(adminB).every((o) => o.empresaId === 'emp-b')).toBe(true)
    expect(listarProjetos('emp-b').every((p) => p.empresaId === 'emp-b')).toBe(true)
    expect(financeiroDasObras('emp-b').every((r) => r.obra.empresaId === 'emp-b')).toBe(true)
  })

  it('não regista horas numa obra de outra empresa', async () => {
    sessaoComo('b-u-ana')
    const r = await iniciarTempo(null, form({ clientId: uuid(), obraId: 'ob-1', obraEtapaId: 'oe-ob-1-8' }))
    expect(r.ok).toBe(false)
  })

  it('não cria elementos numa obra de outra empresa', async () => {
    sessaoComo('b-u-ana')
    const r = await criarElemento(null, form({ obraId: 'ob-1', referencia: 'X99', tipo: 'janela', descricao: 'Intrusa' }))
    expect(r.ok).toBe(false)
    expect(db().elementos.some((e) => e.referencia === 'X99')).toBe(false)
  })

  it('não corrige registos de outra empresa', async () => {
    sessaoComo('b-u-ana')
    const alvo = db().registosTempo.find((r) => r.empresaId === 'emp-a' && r.fim)!
    const antes = { ...alvo }
    const r = await corrigirTempo(null, form({ registoId: alvo.id, inicio: '2026-10-13T08:00', fim: '2026-10-13T09:00', motivo: 'ataque' }))
    expect(r.ok).toBe(false)
    expect(alvo.inicio).toBe(antes.inicio)
  })

  it('não desativa pessoas de outra empresa', async () => {
    sessaoComo('b-u-ana')
    await alternarUtilizadorAtivo('u-miguel')
    expect(perfil('u-miguel').ativo).toBe(true)
  })

  it('não adiciona responsáveis de outra empresa', async () => {
    sessaoComo('u-ana')
    const r = await adicionarResponsavel(null, form({ obraId: 'ob-1', perfilId: 'b-u-miguel' }))
    expect(r.ok).toBe(false)
  })
})

describe('permissões dentro da empresa', () => {
  it('equipas de campo só registam nas obras das suas equipas', async () => {
    sessaoComo('u-miguel') // montagem A: ob-1 sim, ob-3 não
    const r = await iniciarTempo(null, form({ clientId: uuid(), obraId: 'ob-3', obraEtapaId: 'oe-ob-3-8' }))
    expect(r).toMatchObject({ ok: false })
  })

  it('equipas de campo não definem responsáveis', async () => {
    sessaoComo('u-miguel')
    expect((await adicionarResponsavel(null, form({ obraId: 'ob-1', perfilId: 'u-miguel' }))).ok).toBe(false)
  })

  it('o escritório adiciona e remove responsáveis (vários por obra; remover não apaga)', async () => {
    sessaoComo('u-carlos')
    expect((await adicionarResponsavel(null, form({ obraId: 'ob-1', perfilId: 'u-miguel' }))).ok).toBe(true)
    expect((await adicionarResponsavel(null, form({ obraId: 'ob-1', perfilId: 'u-miguel' }))).ok).toBe(false) // repetido
    const ativos = () => db().obraResponsaveis.filter((r) => r.obraId === 'ob-1' && !r.removidoEm)
    expect(ativos().length).toBeGreaterThanOrEqual(2)
    const miguel = ativos().find((r) => r.perfilId === 'u-miguel')!
    await removerResponsavel(miguel.id)
    expect(ativos().some((r) => r.perfilId === 'u-miguel')).toBe(false)
    expect(db().obraResponsaveis.find((r) => r.id === miguel.id)?.removidoEm).not.toBeNull()
    expect(db().historico.some((h) => h.entidadeId === miguel.id && h.acao === 'arquivar')).toBe(true)
  })
})

describe('registo de horas', () => {
  const contexto = { obraId: 'ob-1', obraEtapaId: 'oe-ob-1-8' } // ob-1, etapa Montagem

  it('iniciar e terminar: quartos de hora, mínimo 15 min, e fica no histórico', async () => {
    sessaoComo('u-miguel')
    const ini = await iniciarTempo(null, form({ clientId: uuid(), ...contexto }))
    expect(ini.ok).toBe(true)
    const r = db().registosTempo.find((x) => x.id === (ini as { id: string }).id)!
    expect(r.inicio).toBe('2026-10-14T09:00:00.000Z') // 10:07 → 10:00 (para baixo)
    expect(r.empresaId).toBe('emp-a')
    const fim = await terminarTempo(null, form({ registoId: r.id }))
    expect(fim.ok).toBe(true)
    expect(r.fim).toBe('2026-10-14T09:15:00.000Z') // → 10:15 (para cima, mínimo 15 min)
    expect(r.duracaoMin).toBe(15)
    expect(
      db()
        .historico.filter((h) => h.entidadeId === r.id)
        .map((h) => h.acao),
    ).toEqual(['alterar', 'criar'])
  })

  it('só um trabalho em curso por pessoa', async () => {
    sessaoComo('u-miguel')
    expect((await iniciarTempo(null, form({ clientId: uuid(), ...contexto }))).ok).toBe(true)
    expect((await iniciarTempo(null, form({ clientId: uuid(), ...contexto }))).ok).toBe(false)
  })

  it('o mesmo clientId (reenvio do tablet) não cria um segundo registo', async () => {
    sessaoComo('u-miguel')
    const clientId = uuid()
    const a = await iniciarTempo(null, form({ clientId, ...contexto }))
    const b = await iniciarTempo(null, form({ clientId, ...contexto }))
    expect(b).toEqual({ ok: true, id: (a as { id: string }).id })
  })

  it('o clientId de outra pessoa não revela o registo dela', async () => {
    sessaoComo('u-miguel')
    const clientId = uuid()
    await iniciarTempo(null, form({ clientId, ...contexto }))
    sessaoComo('u-joao')
    expect((await iniciarTempo(null, form({ clientId, ...contexto }))).ok).toBe(false)
  })

  it('lançar horas à mão: aceita os últimos 7 dias, recusa sobreposições e dias antigos', async () => {
    sessaoComo('u-miguel')
    const horas = (data: string, inicio: string, fim: string) =>
      registarHoras(null, form({ clientId: uuid(), ...contexto, data, inicio, fim }))
    expect((await horas('2026-10-14', '07:00', '08:00')).ok).toBe(true)
    expect((await horas('2026-10-14', '07:30', '08:30')).ok).toBe(false) // sobreposto
    expect((await horas('2026-10-14', '08:00', '08:45')).ok).toBe(true) // encostado: ok
    expect((await horas('2026-10-01', '08:00', '09:00')).ok).toBe(false) // mais de 7 dias
    expect((await horas('2026-10-14', '07:10', '08:00')).ok).toBe(false) // não é quarto de hora
    expect((await horas('2026-10-14', '11:00', '12:00')).ok).toBe(false) // no futuro
  })

  it('recusa um elemento de outra obra', async () => {
    sessaoComo('u-miguel')
    const r = await iniciarTempo(null, form({ clientId: uuid(), ...contexto, elementoId: 'el-ob-2-J01' }))
    expect(r.ok).toBe(false)
  })

  it('o autor corrige durante 24 h; depois só a administração', async () => {
    sessaoComo('u-miguel')
    await registarHoras(null, form({ clientId: uuid(), ...contexto, data: '2026-10-14', inicio: '07:00', fim: '08:00' }))
    const r = db().registosTempo.find((x) => x.perfilId === 'u-miguel' && x.inicio === '2026-10-14T06:00:00.000Z')!
    const corrigir = () =>
      corrigirTempo(null, form({ registoId: r.id, inicio: '2026-10-14T06:45', fim: '2026-10-14T08:00', motivo: 'Comecei mais cedo' }))
    expect((await corrigir()).ok).toBe(true)
    expect(db().historico.find((h) => h.entidadeId === r.id && h.motivo)?.motivo).toBe('Comecei mais cedo')

    vi.setSystemTime(new Date(AGORA.getTime() + 25 * 3600e3))
    expect((await corrigir()).ok).toBe(false)
    sessaoComo('u-ana')
    expect((await corrigir()).ok).toBe(true)
  })
})

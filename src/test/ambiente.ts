/**
 * Ambiente para testar server actions fora do Next.js.
 *
 * As ações usam `cookies()`, `redirect()`, `revalidatePath()`… que só existem dentro de um
 * pedido. Nos testes substituímo-las (vi.mock) por versões simples: um "frasco" de cookies em
 * memória e um redirect que lança um erro com o destino, para o teste o poder verificar.
 *
 * Uso (no topo do ficheiro de teste):
 *   vi.mock('next/headers', () => import('@/test/ambiente').then((m) => m.mockHeaders))
 *   …
 */
import { assinar, segredoSessao } from '@/lib/assinatura'

export const cookiesDoPedido = new Map<string, string>()

export const mockHeaders = {
  cookies: async () => ({
    get: (nome: string) => (cookiesDoPedido.has(nome) ? { name: nome, value: cookiesDoPedido.get(nome)! } : undefined),
    set: (nome: string, valor: string) => void cookiesDoPedido.set(nome, valor),
    delete: (nome: string) => void cookiesDoPedido.delete(nome),
  }),
}

/** `redirect('/x')` lança `Redirecionado('/x')`; `notFound()` lança `NaoEncontrado`. */
export class Redirecionado extends Error {
  constructor(public destino: string) {
    super(`redirect → ${destino}`)
  }
}
export class NaoEncontrado extends Error {}

export const mockNavigation = {
  redirect: (destino: string) => {
    throw new Redirecionado(destino)
  },
  notFound: () => {
    throw new NaoEncontrado('notFound')
  },
}

export const mockCache = { revalidatePath: () => {} }
export const mockServer = { after: () => {} }

/** Sessão iniciada como `perfilId` (cookie assinado, como faz o login). */
export function sessaoComo(perfilId: string) {
  cookiesDoPedido.clear()
  cookiesDoPedido.set('fl-sessao', assinar(perfilId, segredoSessao()))
}

export function semSessao() {
  cookiesDoPedido.clear()
}

/** FormData a partir de um objeto (campos `x[]` para listas). */
export function form(campos: Record<string, string | string[]>) {
  const f = new FormData()
  for (const [k, v] of Object.entries(campos)) {
    if (Array.isArray(v)) for (const x of v) f.append(`${k}[]`, x)
    else f.append(k, v)
  }
  return f
}

/**
 * Assinatura de valores guardados em cookies (HMAC-SHA256).
 *
 * O cookie de sessão leva `<perfilId>.<assinatura>`. A assinatura só pode ser calculada
 * por quem conhece o segredo (SESSION_SECRET, só no servidor). Se alguém mudar o id no
 * browser, a assinatura deixa de bater certo e a sessão é recusada.
 */
import { createHmac, timingSafeEqual } from 'node:crypto'

/** Segredo de desenvolvimento/testes. Em produção é obrigatório definir SESSION_SECRET. */
const SEGREDO_DEV = 'dev-only-secret-change-me'

export function segredoSessao(env: Record<string, string | undefined> = process.env): string {
  const s = env.SESSION_SECRET
  if (s && s.length >= 32) return s
  if (env.NODE_ENV === 'production') throw new Error('SESSION_SECRET em falta (mínimo 32 caracteres).')
  return SEGREDO_DEV
}

const hmac = (valor: string, segredo: string) => createHmac('sha256', segredo).update(valor).digest('base64url')

/** "u-ana" → "u-ana.Xk3…" */
export function assinar(valor: string, segredo: string): string {
  return `${valor}.${hmac(valor, segredo)}`
}

/** Devolve o valor original se a assinatura for válida; senão null. Comparação em tempo constante. */
export function verificar(assinado: string | undefined | null, segredo: string): string | null {
  if (!assinado) return null
  const i = assinado.lastIndexOf('.')
  if (i <= 0) return null
  const valor = assinado.slice(0, i)
  const recebida = Buffer.from(assinado.slice(i + 1))
  const esperada = Buffer.from(hmac(valor, segredo))
  if (recebida.length !== esperada.length || !timingSafeEqual(recebida, esperada)) return null
  return valor
}

/**
 * Destino seguro depois do login: só caminhos internos ("/admin/obras").
 * Recusa "//site.com" e "/\site.com" (os browsers tratam "\" como "/").
 */
export function destinoSeguro(destino: unknown, padrao = '/admin'): string {
  if (typeof destino !== 'string' || !destino.startsWith('/')) return padrao
  if (destino.startsWith('//') || destino.includes('\\')) return padrao
  return destino
}

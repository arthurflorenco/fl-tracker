/**
 * Contrato comum das ações (server actions). Toda a escrita passa por
 * `modules/*\/actions.ts`, que validam com zod, verificam permissões e
 * registam no histórico. É este ponto único que o assistente de IA (fase
 * futura) vai chamar — nunca a base de dados diretamente.
 */
import type { z } from 'zod'

export type Resultado =
  | { ok: true; mensagem?: string; id?: string }
  | { ok: false; erro: string; campos?: Record<string, string[] | undefined> }

export const estadoInicial: Resultado | null = null

export function lerForm(formData: FormData) {
  const obj: Record<string, unknown> = {}
  for (const [k, v] of formData.entries()) {
    if (k.startsWith('$ACTION')) continue
    if (k.endsWith('[]')) {
      const key = k.slice(0, -2)
      const lista = (obj[key] as unknown[] | undefined) ?? []
      lista.push(v)
      obj[key] = lista
    } else obj[k] = v
  }
  return obj
}

export function falhaValidacao(erro: z.ZodError): Resultado {
  const campos: Record<string, string[]> = {}
  for (const issue of erro.issues) {
    const k = issue.path.join('.') || '_'
    ;(campos[k] ??= []).push(issue.message)
  }
  return { ok: false, erro: erro.issues[0]?.message ?? 'Dados inválidos.', campos }
}

export const semPermissao = (): Resultado => ({ ok: false, erro: 'Não tem permissão para esta ação.' })
/** `o` documenta o que faltou (no código); a mensagem é sempre a mesma, para poder ser traduzida. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const naoEncontrado = (o = 'Registo'): Resultado => ({ ok: false, erro: 'Não encontrado.' })

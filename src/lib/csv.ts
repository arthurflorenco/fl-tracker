/**
 * CSV para o Excel em Portugal: separador ";", vírgula decimal e UTF-8 com BOM (acentos certos).
 * Células de texto que começam por = + - @ levam um apóstrofo (evita fórmulas injetadas).
 */

export type Celula = string | number | null | undefined

const BOM = '﻿'
const SEP = ';'

function celula(v: Celula): string {
  if (v == null) return ''
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return ''
    return String(Math.round(v * 100) / 100).replace('.', ',')
  }
  let s = v
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function paraCsv(cabecalho: string[], linhas: Celula[][]): string {
  return BOM + [cabecalho, ...linhas].map((l) => l.map(celula).join(SEP)).join('\r\n') + '\r\n'
}

/** "Rui Fonseca" → "rui-fonseca" (para nomes de ficheiro). */
export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function respostaCsv(nomeFicheiro: string, csv: string) {
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nomeFicheiro}"`,
      'Cache-Control': 'no-store',
    },
  })
}

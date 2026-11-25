/**
 * Extrai o token de um QR Code lido na app. Aceita o URL completo de qualquer domínio
 * (os QR impressos levam o domínio final, ex.: https://app.example.com/q/<token>)
 * ou só o token. Devolve null se o texto não parecer um QR desta app.
 */
export function tokenDeQr(texto: string): string | null {
  const t = texto.trim()
  const m = t.match(/\/q\/([A-Za-z0-9_-]{6,64})\/?(?:[?#].*)?$/)
  if (m) return m[1]
  return /^[A-Za-z0-9_-]{6,64}$/.test(t) ? t : null
}

import 'server-only'
import QRCode from 'qrcode'
import { headers } from 'next/headers'

/** URL absoluto do QR: NEXT_PUBLIC_APP_URL (produção: https://app.example.com) ou o host do pedido. */
export async function urlDoToken(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? (await origemDoPedido())
  return `${base.replace(/\/$/, '')}/q/${token}`
}

async function origemDoPedido() {
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** SVG do QR Code (preto sobre branco, para impressão e leitura fiável). */
export function qrSvg(url: string) {
  return QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#111111', light: '#ffffff' } })
}

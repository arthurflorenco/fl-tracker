import { notFound, redirect } from 'next/navigation'
import { exigirSessao } from '@/lib/session'
import { podeVerObra } from '@/lib/permissions'
import { resolverToken } from '@/modules/obras/queries'
import { acessoObra } from '@/modules/equipas/queries'

/**
 * Destino do QR Code — lido pela câmara nativa do telemóvel ou pelo leitor da app (/admin/ler-qr).
 * Abre sempre a página da obra; o QR de um elemento abre o separador Elementos.
 */
export default async function QrPage(props: PageProps<'/q/[token]'>) {
  const { token } = await props.params
  const eu = await exigirSessao()
  const alvo = resolverToken(token)
  if (!alvo?.obra || !podeVerObra(eu, acessoObra(alvo.obra.id))) notFound()
  redirect(`/admin/obras/${alvo.obra.id}${alvo.elemento ? '?tab=elementos' : ''}`)
}

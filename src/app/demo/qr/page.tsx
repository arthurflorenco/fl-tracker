import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { EtiquetaQr } from '@/components/obras/EtiquetaQr'
import { OBRA } from '@/components/guia/passos'
import { PageHeader } from '@/components/ui/PageHeader'
import { MODO_DEMO } from '@/lib/demo'
import { exigirSessao } from '@/lib/session'
import { obraParaPerfil } from '@/modules/obras/queries'
import { qrSvg, urlDoToken } from '@/modules/qr/qr'

export const generateMetadata = tituloDaPagina('qr')

/**
 * DEMONSTRAÇÃO: o QR Code da obra do guia, para o cliente "ler" no computador (clicando)
 * ou com a câmara do telemóvel. Na app real o QR está impresso na obra (/admin/obras/[id]/qr).
 */
export default async function DemoQrPage() {
  if (!MODO_DEMO) notFound()
  const eu = await exigirSessao()
  const obra = obraParaPerfil(OBRA, eu)
  if (!obra) notFound()
  const url = await urlDoToken(obra.qrToken)
  const { t } = await getI18n()

  return (
    <AppShell perfil={eu}>
      <PageHeader eyebrow={t.qr.simulacao} titulo={t.titulos.lerQr} descricao={t.qr.demoDescricao} />
      <Link href={`/q/${obra.qrToken}`} data-guia="qr-obra" className="block w-full max-w-[360px] transition-transform hover:scale-[1.01]">
        <EtiquetaQr titulo={t.comum.obraCodigo(obra.codigo)} subtitulo={obra.titulo} svg={await qrSvg(url)} url={url} />
      </Link>
    </AppShell>
  )
}

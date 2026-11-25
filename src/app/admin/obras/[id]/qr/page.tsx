import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { EtiquetaQr } from '@/components/obras/EtiquetaQr'
import { PageHeader } from '@/components/ui/PageHeader'
import { PrintButton } from '@/components/ui/PrintButton'
import { exigirArea } from '@/lib/session'
import { podeGerirObra } from '@/lib/permissions'
import { obraParaPerfil } from '@/modules/obras/queries'
import { elementosDaObra } from '@/modules/elementos/queries'
import { qrSvg, urlDoToken } from '@/modules/qr/qr'

export const generateMetadata = tituloDaPagina('qr')

export default async function QrObraPage(props: PageProps<'/admin/obras/[id]/qr'>) {
  const eu = await exigirArea('obras')
  if (!podeGerirObra(eu)) notFound()
  const { t } = await getI18n()
  const { id } = await props.params
  const obra = obraParaPerfil(id, eu)
  if (!obra) notFound()

  const urlObra = await urlDoToken(obra.qrToken)
  const elementos = await Promise.all(
    elementosDaObra(obra.id)
      .filter((e) => e.qrAtivo)
      .map(async (e) => ({ ...e, url: await urlDoToken(e.qrToken), svg: await qrSvg(await urlDoToken(e.qrToken)) })),
  )

  return (
    <>
      <div className="no-print">
        <PageHeader
          eyebrow={<Link href={`/admin/obras/${obra.id}`}>{t.comum.obraCodigo(obra.codigo)} ←</Link>}
          titulo={t.titulos.qr}
          descricao={t.qr.imprimirDescricao}
          acoes={<PrintButton />}
        />
      </div>

      <div className="grid gap-6 print:block md:grid-cols-2 xl:grid-cols-3">
        <EtiquetaQr titulo={t.comum.obraCodigo(obra.codigo)} subtitulo={obra.titulo} svg={await qrSvg(urlObra)} url={urlObra} destaque />
        {elementos.map((e) => (
          <EtiquetaQr
            key={e.id}
            titulo={`${obra.codigo} · ${e.referencia}`}
            subtitulo={`${t.rotulos.tipoElemento[e.tipo]} — ${e.descricao}`}
            svg={e.svg}
            url={e.url}
          />
        ))}
      </div>
      {elementos.length === 0 && <p className="no-print mt-6 text-[13px] text-text-dim">{t.qr.semElementos}</p>}
    </>
  )
}

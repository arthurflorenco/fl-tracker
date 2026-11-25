import { PageHeader } from '@/components/ui/PageHeader'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { LeitorQr } from '@/components/registo/LeitorQr'
import { exigirArea } from '@/lib/session'

export const generateMetadata = tituloDaPagina('lerQr')

export default async function LerQrPage() {
  await exigirArea('registar')
  const { t } = await getI18n()
  return (
    <div className="mx-auto max-w-[640px]">
      <PageHeader eyebrow={t.nav.registar} titulo={t.titulos.lerQr} descricao={t.qr.lerDescricao} />
      <LeitorQr />
    </div>
  )
}

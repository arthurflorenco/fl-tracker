import { Download } from 'lucide-react'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { ObraCard } from '@/components/obras/ObraCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonClass } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { exigirArea } from '@/lib/session'
import { eAdmin } from '@/lib/permissions'
import { obrasVisiveis } from '@/modules/obras/queries'

export const generateMetadata = tituloDaPagina('obras')

export default async function ObrasPage() {
  const eu = await exigirArea('obras')
  const { t } = await getI18n()
  const obras = obrasVisiveis(eu)
  const ativas = obras.filter((o) => o.estado === 'ativa')
  const outras = obras.filter((o) => o.estado !== 'ativa')

  return (
    <>
      <PageHeader
        eyebrow={t.titulos.obras}
        titulo={t.titulos.obras}
        descricao={eu.papel === 'fabricacao' || eu.papel === 'montagem' ? t.obras.descricaoCampo : t.obras.descricaoEscritorio}
        acoes={
          eAdmin(eu) && (
            <a href="/admin/obras/exportar" download className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              <Download size={16} strokeWidth={1.5} /> {t.obras.exportarCsv}
            </a>
          )
        }
      />
      {obras.length === 0 && <EmptyState titulo={t.obras.semObras} texto={t.obras.semObrasTexto} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ativas.map((o) => (
          <ObraCard key={o.id} obra={o} />
        ))}
      </div>
      {outras.length > 0 && (
        <>
          <h2 className="mb-4 mt-12 text-[12px] font-semibold uppercase tracking-[1.5px] text-text-mid">{t.obras.concluidasESuspensas}</h2>
          <div className="grid gap-4 opacity-80 md:grid-cols-2 xl:grid-cols-3">
            {outras.map((o) => (
              <ObraCard key={o.id} obra={o} />
            ))}
          </div>
        </>
      )}
    </>
  )
}

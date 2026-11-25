import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { QrCode, ScanLine } from 'lucide-react'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { exigirArea } from '@/lib/session'
import { obrasVisiveis } from '@/modules/obras/queries'
import { registosDoPerfil } from '@/modules/tempos/queries'

export const generateMetadata = tituloDaPagina('registar')

export default async function RegistarPage() {
  const eu = await exigirArea('registar')
  const { t, f } = await getI18n()
  const obras = obrasVisiveis(eu).filter((o) => o.estado === 'ativa')
  const meus = registosDoPerfil(eu.id, 8)

  return (
    <>
      <PageHeader
        eyebrow={t.nav.registar}
        titulo={t.registar.titulo}
        descricao={
          <span className="flex items-start gap-2">
            <QrCode size={18} strokeWidth={1.5} className="mt-0.5 shrink-0 text-accent" />
            {t.registar.descricao}
          </span>
        }
        acoes={
          <Link href="/admin/ler-qr" className={buttonClass()}>
            <ScanLine size={16} strokeWidth={1.5} /> {t.registar.lerQr}
          </Link>
        }
      />

      {obras.length === 0 ? (
        <EmptyState titulo={t.registar.semObras} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {obras.map((o) => (
            <Link key={o.id} href={`/admin/obras/${o.id}/registar`} className="group">
              <Card className="flex min-h-[120px] flex-col justify-between gap-3">
                <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">{t.comum.obraCodigo(o.codigo)}</p>
                <p className="text-[18px] font-bold leading-tight group-hover:text-accent">{o.titulo}</p>
                <p className="text-[12px] text-text-mid">{o.etapaAtual?.nome}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <h2 className="mb-4 mt-12 text-[12px] font-semibold uppercase tracking-[1.5px] text-text-mid">{t.registar.meusRegistos}</h2>
      <Card className="divide-y divide-line p-0 md:p-0">
        {meus.length === 0 && <p className="p-5 text-[14px] text-text-dim">{t.registar.semRegistos}</p>}
        {meus.map((r) => (
          <Link key={r.id} href={`/admin/tempos/${r.id}`} className="flex items-center justify-between gap-4 p-4 hover:bg-dark3 md:px-5">
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-normal">
                {r.obra?.codigo} · {r.etapa?.nome}
              </span>
              <span className="block truncate text-[12px] text-text-mid">
                {f.data(r.inicio)} · {f.hora(r.inicio)}–{r.fim ? f.hora(r.fim) : '…'}
                {r.atividade ? ` · ${r.atividade.nome}` : ''}
              </span>
            </span>
            <span className="shrink-0 text-[14px] font-bold">
              {r.fim ? f.duracao(r.duracaoMin) : <span className="text-accent">{t.comum.emCurso}</span>}
            </span>
          </Link>
        ))}
      </Card>
    </>
  )
}

import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import type { ObraResumo } from '@/modules/obras/queries'
import { getI18n } from '@/i18n/server'

export async function ObraCard({ obra, href = `/admin/obras/${obra.id}` }: { obra: ObraResumo; href?: string }) {
  const { t, f } = await getI18n()
  return (
    <Link href={href} className="group block focus-visible:outline-2 focus-visible:outline-accent">
      <Card className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">{t.comum.obraCodigo(obra.codigo)}</p>
          {obra.atrasada ? (
            <Badge tom="perigo">{t.obras.atrasada}</Badge>
          ) : (
            obra.estado !== 'ativa' && <Badge tom="apagado">{t.rotulos.estadoObra[obra.estado]}</Badge>
          )}
        </div>
        <div>
          <h3 className="text-[19px] font-bold leading-tight tracking-[-0.5px] transition-colors group-hover:text-accent">{obra.titulo}</h3>
          <p className="mt-1 text-[13px] text-text-mid">{obra.cliente?.nome}</p>
        </div>
        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-normal">{obra.etapaAtual?.nome ?? t.obras.concluida}</span>
            <span className="text-text-dim">{obra.progresso}%</span>
          </div>
          <ProgressBar valor={obra.progresso} label={t.obras.progressoDe(obra.codigo)} />
          <p className="text-[11px] text-text-dim">{t.obras.fimPrevisto(f.data(obra.dataPrevistaFim))}</p>
        </div>
      </Card>
    </Link>
  )
}

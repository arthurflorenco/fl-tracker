import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { type Obra } from '@/modules/obras/schema'
import { getI18n } from '@/i18n/server'

interface LinhaObra {
  obra: Obra
  minutos: number
  custo: number
  primeiro: string | null
  ultimo: string | null
  etapas: string[]
  atribuida?: boolean
}

/** Tabela "histórico de obras" (ficha de pessoa e de equipa). Só administração (tem €). */
export async function HistoricoObras({ obras, vazio }: { obras: LinhaObra[]; vazio: string }) {
  const { t, f } = await getI18n()
  return (
    <Card className="overflow-x-auto p-0 md:p-0">
      {obras.length === 0 ? (
        <p className="p-5 text-[14px] text-text-dim">{vazio}</p>
      ) : (
        <table className="w-full min-w-[720px] text-left text-[13px]">
          <thead className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-semibold">{t.ficha.colObra}</th>
              <th className="px-3 py-3 font-semibold">{t.ficha.colPeriodo}</th>
              <th className="px-3 py-3 text-right font-semibold">{t.ficha.colHoras}</th>
              <th className="px-3 py-3 text-right font-semibold">{t.ficha.colCusto}</th>
              <th className="px-5 py-3 font-semibold">{t.ficha.colEtapas}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line font-light">
            {obras.map((o) => (
              <tr key={o.obra.id} className="hover:bg-dark3">
                <td className="px-5 py-3">
                  <Link href={`/admin/obras/${o.obra.id}?tab=resumo`} className="font-normal hover:text-accent">
                    {o.obra.codigo} · {o.obra.titulo}
                  </Link>
                  <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-dim">
                    {t.rotulos.estadoObra[o.obra.estado]}
                    {o.atribuida === false && <Badge tom="apagado">{t.ficha.apoio}</Badge>}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 tabular-nums text-text-mid">
                  {o.primeiro ? `${f.data(o.primeiro)} – ${f.data(o.ultimo)}` : t.ficha.semHoras}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums">{f.horas(Math.round(o.minutos / 6) / 10)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{f.euro(o.custo)}</td>
                <td className="px-5 py-3 text-text-mid">{o.etapas.join(', ') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  )
}

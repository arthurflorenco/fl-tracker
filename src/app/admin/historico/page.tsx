import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { exigirArea } from '@/lib/session'
import { historicoGlobal } from '@/modules/auditoria/queries'
import { nomeDe } from '@/modules/utilizadores/queries'
import { db } from '@/lib/mock/store'

export const generateMetadata = tituloDaPagina('historico')

export default async function HistoricoPage() {
  const eu = await exigirArea('historico')
  const { t, f } = await getI18n()
  const entradas = historicoGlobal(eu.empresaId)
  const codigo = (obraId: string | null) => (obraId ? db().obras.find((o) => o.id === obraId)?.codigo : null)
  return (
    <>
      <PageHeader eyebrow={t.historico.eyebrow} titulo={t.titulos.historico} descricao={t.historico.descricao} />
      <Card className="divide-y divide-line p-0 md:p-0">
        {entradas.length === 0 && <p className="p-5 text-[14px] text-text-dim">{t.historico.vazio}</p>}
        {entradas.map((e) => (
          <details key={e.id} className="group p-4 md:px-6">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
              <span className="text-[14px] font-normal">
                {codigo(e.obraId) && (
                  <Link href={`/admin/obras/${e.obraId}?tab=historico`} className="mr-2 text-accent">
                    {codigo(e.obraId)}
                  </Link>
                )}
                {e.resumo}
              </span>
              <span className="text-[11px] text-text-dim">
                {nomeDe(e.autorId)} · {f.dataHora(e.criadoEm)}
                {e.origem !== 'manual' ? ` · ${e.origem}` : ''}
              </span>
            </summary>
            <div className="mt-3 grid gap-3 text-[12px] md:grid-cols-2">
              <pre className="overflow-x-auto bg-dark3 p-3 font-mono text-text-mid">{JSON.stringify(e.antes, null, 2) ?? '—'}</pre>
              <pre className="overflow-x-auto bg-dark3 p-3 font-mono">{JSON.stringify(e.depois, null, 2) ?? '—'}</pre>
              {e.motivo && <p className="text-text-mid md:col-span-2">{t.historico.motivo(e.motivo)}</p>}
            </div>
          </details>
        ))}
      </Card>
    </>
  )
}

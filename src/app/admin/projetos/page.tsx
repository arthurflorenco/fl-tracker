import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { tomProjeto } from '@/components/obras/tomProjeto'
import { exigirArea } from '@/lib/session'
import { listarProjetos } from '@/modules/projetos/queries'

export const generateMetadata = tituloDaPagina('projetos')

export default async function ProjetosPage() {
  const eu = await exigirArea('projetos')
  const { t } = await getI18n()
  const projetos = listarProjetos(eu.empresaId)
  const abertos = projetos.filter((p) => !p.obraId && p.estado !== 'recusado')
  const fechados = projetos.filter((p) => p.obraId || p.estado === 'recusado')

  return (
    <>
      <PageHeader
        eyebrow={t.projetos.eyebrow}
        titulo={t.titulos.projetos}
        descricao={t.projetos.descricao}
        acoes={
          <Link href="/admin/projetos/novo" className={buttonClass()}>
            {t.projetos.novo}
          </Link>
        }
      />
      <Lista titulo={t.projetos.emOrcamento} projetos={abertos} />
      <div className="mt-12" />
      <Lista titulo={t.projetos.fechados} projetos={fechados} />
    </>
  )
}

async function Lista({ titulo, projetos }: { titulo: string; projetos: ReturnType<typeof listarProjetos> }) {
  const { t, f } = await getI18n()
  return (
    <section>
      <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-[1.5px] text-text-mid">{titulo}</h2>
      <Card className="divide-y divide-line p-0 md:p-0">
        {projetos.length === 0 && <p className="p-5 text-[14px] text-text-dim">{t.projetos.nenhum}</p>}
        {projetos.map((p) => (
          <Link
            key={p.id}
            href={`/admin/projetos/${p.id}`}
            className="grid gap-2 p-4 hover:bg-dark3 md:grid-cols-[110px_1fr_auto_auto] md:items-center md:gap-6 md:px-6"
          >
            <span className="text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">{p.referencia}</span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-normal">{p.titulo}</span>
              <span className="block truncate text-[12px] text-text-mid">
                {p.cliente?.nome} · {t.projetos.atualizado(f.data(p.atualizadoEm))}
              </span>
            </span>
            <span className="text-[14px] font-bold">{p.valorProposta != null ? f.euro(p.valorProposta) : '—'}</span>
            <Badge tom={tomProjeto[p.estado]}>{p.obraId ? t.projetos.emObra : t.rotulos.estadoProjeto[p.estado]}</Badge>
          </Link>
        ))}
      </Card>
    </section>
  )
}

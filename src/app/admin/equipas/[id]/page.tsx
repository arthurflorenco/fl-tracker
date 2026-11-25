import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { CartaoGrafico, Kpi, Segmentos } from '@/components/financeiro/Kpi'
import { HistoricoObras } from '@/components/financeiro/HistoricoObras'
import { CORES, GraficoArea } from '@/components/graficos/Graficos'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { exigirArea } from '@/lib/session'
import { fichaEquipa } from '@/modules/financeiro/queries'
import { PERIODOS, type Periodo } from '@/modules/financeiro/schema'

export const generateMetadata = tituloDaPagina('equipa')

const h1 = (min: number) => Math.round(min / 6) / 10

export default async function EquipaPage(props: PageProps<'/admin/equipas/[id]'>) {
  const eu = await exigirArea('equipas')
  const { t, f } = await getI18n()
  const te = t.equipas
  const { id } = await props.params
  const sp = await props.searchParams
  const periodo: Periodo = (PERIODOS as readonly string[]).includes(String(sp.periodo)) ? (sp.periodo as Periodo) : '90d'
  const ficha = fichaEquipa(eu.empresaId, id, periodo)
  if (!ficha) notFound()
  const comHoras = ficha.pessoas.filter((p) => p.minutos > 0)
  const ativas = ficha.obras.filter((o) => o.obra.estado === 'ativa' && o.atribuida).length
  const comparar = new URLSearchParams([['tab', 'funcionarios'], ['periodo', periodo], ...ficha.membros.map((m) => ['p', m.id])])

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/admin/equipas">{t.titulos.equipas} ←</Link>}
        titulo={ficha.equipa.nome}
        descricao={te.membros(t.rotulos.tipoEquipa[ficha.equipa.tipo], ficha.membros.length)}
        acoes={
          ficha.membros.length >= 2 && (
            <Link href={`/admin/analise?${comparar}`} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              <BarChart3 size={16} strokeWidth={1.5} /> {te.compararMembros}
            </Link>
          )
        }
      />

      <div className="mb-4">
        <Segmentos
          atual={periodo}
          opcoes={PERIODOS.map((p) => ({ id: p, label: t.rotulos.periodo[p], href: `/admin/equipas/${id}?periodo=${p}` }))}
        />
      </div>

      <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Kpi label={te.horasDaEquipa} valor={f.horas(h1(ficha.minutos))} detalhe={t.ficha.diasComRegistos(ficha.diasTrabalhados)} />
        <Kpi label={te.custoMaoObra} valor={f.euro(ficha.custo)} />
        <Kpi label={te.obrasNoPeriodo} valor={String(ficha.obraIds.length)} detalhe={t.ficha.desdeSempre(ficha.obras.length)} />
        <Kpi label={te.obrasEmCurso} valor={String(ativas)} detalhe={te.atribuidas} />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <CartaoGrafico titulo={t.ficha.horasPorSemana} subtitulo={te.porPessoa}>
          {ficha.horasPorSemana.length ? (
            <GraficoArea
              dados={ficha.horasPorSemana}
              x="semana"
              formatoX="semana"
              formato="horas"
              empilhado
              series={comHoras.map((p, i) => ({ chave: p.perfil.id, label: p.perfil.nome, cor: CORES[i % CORES.length] }))}
            />
          ) : (
            <p className="text-[13px] text-text-dim">{t.ficha.semHorasPeriodo}</p>
          )}
        </CartaoGrafico>
        <section>
          <SectionTitle>{te.pessoas}</SectionTitle>
          <Card className="divide-y divide-line p-0 md:p-0">
            {ficha.pessoas.length === 0 && <p className="p-5 text-[14px] text-text-dim">{te.semMembrosPonto}</p>}
            {ficha.pessoas.map((p) => (
              <Link
                key={p.perfil.id}
                href={`/admin/utilizadores/${p.perfil.id}?periodo=${periodo}`}
                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-dark3 md:px-5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-normal">{p.perfil.nome}</span>
                  {!p.membro && <span className="block text-[11px] text-text-dim">{te.ajudou}</span>}
                </span>
                <span className="flex shrink-0 gap-4 text-[13px] tabular-nums">
                  <span className="font-bold">{f.horas(h1(p.minutos))}</span>
                  <span className="w-20 text-right text-text-mid">{f.euro(p.custo)}</span>
                </span>
              </Link>
            ))}
          </Card>
        </section>
      </div>

      <section className="mt-10">
        <SectionTitle>{t.ficha.historicoObras}</SectionTitle>
        <HistoricoObras obras={ficha.obras} vazio={te.semObras} />
        <p className="mt-3 text-[12px] text-text-dim">{te.notaHistorico}</p>
      </section>
    </>
  )
}

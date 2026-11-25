import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { notFound } from 'next/navigation'
import { BarChart3, Download } from 'lucide-react'
import { CartaoGrafico, Kpi, Segmentos } from '@/components/financeiro/Kpi'
import { HistoricoObras } from '@/components/financeiro/HistoricoObras'
import { GraficoArea, GraficoBarras } from '@/components/graficos/Graficos'
import { Badge } from '@/components/ui/Badge'
import { buttonClass } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { exigirArea } from '@/lib/session'
import { fichaFuncionario } from '@/modules/financeiro/queries'
import { PERIODOS, type Periodo } from '@/modules/financeiro/schema'
import { registosDoPerfil } from '@/modules/tempos/queries'

export const generateMetadata = tituloDaPagina('pessoa')

const h1 = (min: number) => Math.round(min / 6) / 10

export default async function PessoaPage(props: PageProps<'/admin/utilizadores/[id]'>) {
  const eu = await exigirArea('utilizadores')
  const { t, f } = await getI18n()
  const tf = t.ficha
  const { id } = await props.params
  const sp = await props.searchParams
  const periodo: Periodo = (PERIODOS as readonly string[]).includes(String(sp.periodo)) ? (sp.periodo as Periodo) : '90d'
  const ficha = fichaFuncionario(eu.empresaId, id, periodo)
  if (!ficha) notFound()
  const registos = registosDoPerfil(id, 30)

  return (
    <>
      <PageHeader
        eyebrow={<Link href="/admin/utilizadores">{t.titulos.utilizadores} ←</Link>}
        titulo={ficha.perfil.nome}
        descricao={
          <span className="flex flex-wrap items-center gap-2">
            {t.rotulos.papel[ficha.perfil.papel]} ·{' '}
            {ficha.equipa ? (
              <Link href={`/admin/equipas/${ficha.equipa.id}`} className="hover:text-accent">
                {ficha.equipa.nome}
              </Link>
            ) : (
              t.comum.semEquipa
            )}{' '}
            · {ficha.perfil.email}
            {!ficha.perfil.ativo && <Badge tom="apagado">{tf.desativado}</Badge>}
          </span>
        }
        acoes={
          <>
            <Link
              href={`/admin/analise?tab=funcionarios&periodo=${periodo}&p=${ficha.perfil.id}`}
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
            >
              <BarChart3 size={16} strokeWidth={1.5} /> {tf.comparar}
            </Link>
            <a
              href={`/admin/utilizadores/${ficha.perfil.id}/exportar`}
              download
              className={buttonClass({ variant: 'secondary', size: 'sm' })}
            >
              <Download size={16} strokeWidth={1.5} /> {t.obras.exportarCsv}
            </a>
          </>
        }
      />

      <div className="mb-4">
        <Segmentos
          atual={periodo}
          opcoes={PERIODOS.map((p) => ({ id: p, label: t.rotulos.periodo[p], href: `/admin/utilizadores/${id}?periodo=${p}` }))}
        />
      </div>

      <section className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
        <Kpi label={tf.horas} valor={f.horas(h1(ficha.minutos))} detalhe={tf.diasComRegistos(ficha.diasTrabalhados)} />
        <Kpi
          label={tf.custoGerado}
          valor={f.euro(ficha.custo)}
          detalhe={
            ficha.custoHora != null ? (
              tf.porHoraAtual(f.euro(ficha.custoHora, { cent: true }))
            ) : (
              <span className="text-danger">{tf.semCustoHora}</span>
            )
          }
        />
        <Kpi label={tf.obras} valor={String(ficha.obraIds.length)} detalhe={tf.desdeSempre(ficha.obras.length)} />
        <Kpi
          label={tf.mediaPorDia}
          valor={f.horas(ficha.mediaHorasDia != null ? Math.round(ficha.mediaHorasDia * 10) / 10 : null)}
          detalhe={tf.nosDiasComRegistos}
        />
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <CartaoGrafico titulo={tf.horasPorSemana} className="xl:col-span-2">
          {ficha.horasPorSemana.length ? (
            <GraficoArea
              dados={ficha.horasPorSemana}
              x="semana"
              formatoX="semana"
              formato="horas"
              series={[{ chave: 'horas', label: tf.horas }]}
            />
          ) : (
            <p className="text-[13px] text-text-dim">{tf.semHorasPeriodo}</p>
          )}
        </CartaoGrafico>
        <CartaoGrafico titulo={tf.horasPorEtapa}>
          {ficha.horasPorEtapa.length ? (
            <GraficoBarras
              dados={ficha.horasPorEtapa}
              x="etapa"
              horizontal
              formato="horas"
              series={[{ chave: 'horas', label: tf.horas }]}
            />
          ) : (
            <p className="text-[13px] text-text-dim">{tf.semHorasPeriodo}</p>
          )}
        </CartaoGrafico>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[2fr_1fr]">
        <CartaoGrafico titulo={tf.horasPorObra} subtitulo={t.rotulos.periodo[periodo]}>
          {ficha.horasPorObra.length ? (
            <GraficoBarras dados={ficha.horasPorObra} x="obra" horizontal formato="horas" series={[{ chave: 'horas', label: tf.horas }]} />
          ) : (
            <p className="text-[13px] text-text-dim">{tf.semHorasPeriodo}</p>
          )}
        </CartaoGrafico>
        <CartaoGrafico titulo={tf.custoPorHora} subtitulo={tf.custoPorHoraSub}>
          {ficha.historicoCustoHora.length ? (
            <ul className="divide-y divide-line text-[13px]">
              {ficha.historicoCustoHora.map((c) => (
                <li key={c.id} className="flex justify-between gap-3 py-2">
                  <span className="text-text-mid">{tf.desde(f.data(c.desde))}</span>
                  <span className="font-bold tabular-nums">{f.euro(c.valor, { cent: true })}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-text-dim">
              {tf.semCustoHoraPonto}{' '}
              <Link href="/admin/utilizadores" className="text-accent">
                {tf.definir}
              </Link>
            </p>
          )}
        </CartaoGrafico>
      </div>

      <section className="mt-10">
        <SectionTitle>{tf.historicoObras}</SectionTitle>
        <HistoricoObras obras={ficha.obras} vazio={tf.semObrasPessoa} />
      </section>

      <section className="mt-10">
        <SectionTitle>{tf.ultimosRegistos}</SectionTitle>
        <Card className="divide-y divide-line p-0 md:p-0">
          {registos.length === 0 && <p className="p-5 text-[14px] text-text-dim">{tf.semRegistos}</p>}
          {registos.map((r) => (
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
      </section>
    </>
  )
}

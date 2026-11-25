import Link from 'next/link'
import { GraficoArea, GraficoBarras } from '@/components/graficos/Graficos'
import { Card } from '@/components/ui/Card'
import { SectionTitle } from '@/components/ui/PageHeader'
import { resumoEmpresa } from '@/modules/financeiro/queries'
import type { Periodo } from '@/modules/financeiro/schema'
import { BadgeFinanceiro, CartaoGrafico, Kpi } from './Kpi'
import { getI18n } from '@/i18n/server'

/** Números da empresa para a administração: faturação, margens, horas e obras em risco. */
export async function PainelEmpresa({ empresaId, periodo }: { empresaId: string; periodo: Periodo }) {
  const { t, f } = await getI18n()
  const tf = t.financeiro
  const r = resumoEmpresa(empresaId, periodo)
  const k = r.kpis
  const alertas = [...k.emPrejuizo, ...k.emRisco.filter((o) => !k.emPrejuizo.includes(o))]
  const obrasGrafico = [...r.obras].sort((a, b) => a.obra.codigo.localeCompare(b.obra.codigo))

  return (
    <>
      <section data-guia="painel-empresa" className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-5">
        <Kpi label={tf.valorObras} valor={f.euro(k.valorObras)} detalhe={tf.emCursoConcluidas(k.nAtivas, k.nConcluidas)} />
        <Kpi
          label={tf.margemReal}
          valor={f.pct(k.margemConcluidasPct)}
          tom={k.margemConcluidas < 0 ? 'perigo' : undefined}
          detalhe={k.nConcluidas ? tf.nasConcluidas(f.euro(k.margemConcluidas)) : tf.semConcluidas}
        />
        <Kpi
          label={tf.margemProjetada}
          valor={f.pct(k.margemProjetadaAtivasPct)}
          tom={k.margemProjetadaAtivas < 0 ? 'perigo' : undefined}
          detalhe={tf.nasEmCurso(f.euro(k.margemProjetadaAtivas))}
        />
        <Kpi label={tf.horasRegistadas} valor={f.horas(Math.round(k.minutos / 60))} detalhe={tf.deMaoDeObra(f.euro(k.custoMaoObra))} />
        <Kpi
          label={tf.obrasEmRisco}
          valor={String(alertas.length)}
          tom={alertas.length ? 'perigo' : 'ok'}
          detalhe={k.emPrejuizo.length ? tf.comPrejuizo(k.emPrejuizo.length) : tf.nenhumaComPrejuizo}
        />
      </section>

      <div className="mt-4 grid gap-4 md:gap-4 xl:grid-cols-3">
        <CartaoGrafico titulo={tf.horasPorSemana} subtitulo={tf.horasPorSemanaSub} className="xl:col-span-2">
          <GraficoArea
            dados={r.horasPorSemana}
            x="semana"
            formatoX="semana"
            formato="horas"
            empilhado
            series={[
              { chave: 'fabricacao', label: tf.fabricacao },
              { chave: 'montagem', label: tf.montagem },
              { chave: 'escritorio', label: tf.escritorio },
            ]}
          />
        </CartaoGrafico>
        <CartaoGrafico titulo={tf.horasPorEtapa} subtitulo={tf.horasPorEtapaSub}>
          <GraficoBarras dados={r.horasPorEtapa} x="etapa" horizontal formato="horas" series={[{ chave: 'horas', label: tf.horas }]} />
        </CartaoGrafico>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <CartaoGrafico titulo={tf.valorVsCusto} subtitulo={tf.valorVsCustoSub}>
          <GraficoBarras
            dados={obrasGrafico.map((o) => ({
              obra: o.obra.codigo,
              valor: o.valorContratado ?? 0,
              custo: Math.round(o.custoTotal),
              projetado: o.obra.estado === 'ativa' ? Math.round(o.custoProjetado) : null,
            }))}
            x="obra"
            formato="euro"
            series={[
              { chave: 'valor', label: tf.valorContratado, cor: 'var(--serie-2)' },
              { chave: 'custo', label: tf.custoAteHoje, cor: 'var(--accent)' },
              { chave: 'projetado', label: tf.custoProjetado, cor: 'var(--accent-dk)' },
            ]}
          />
        </CartaoGrafico>
        <CartaoGrafico titulo={tf.margemPorObra} subtitulo={tf.margemPorObraSub}>
          <GraficoBarras
            dados={obrasGrafico.map((o) => ({
              obra: `${o.obra.codigo}${o.obra.estado === 'ativa' ? tf.proj : ''}`,
              margem:
                o.valorContratado != null
                  ? Math.round((((o.obra.estado === 'ativa' ? o.margemProjetada : o.margem) ?? 0) / o.valorContratado) * 1000) / 10
                  : 0,
            }))}
            x="obra"
            horizontal
            sinal
            formato="pct"
            series={[{ chave: 'margem', label: tf.margem }]}
          />
        </CartaoGrafico>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section>
          <SectionTitle>{tf.obrasAAcompanhar}</SectionTitle>
          <Card className="divide-y divide-line p-0 md:p-0">
            {alertas.length === 0 && <p className="p-5 text-[14px] text-text-dim">{tf.todasDentro}</p>}
            {alertas.map((o) => {
              const etapa = o.porEtapa.find((e) => e.risco || (e.excedida && e.estado !== 'concluida'))
              return (
                <Link
                  key={o.obra.id}
                  href={`/admin/obras/${o.obra.id}?tab=resumo`}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-dark3 md:px-5"
                >
                  <span className="min-w-0">
                    <span className="block text-[14px] font-normal">
                      {o.obra.codigo} · {o.obra.titulo}
                    </span>
                    <span className="block text-[12px] text-text-mid">
                      {o.estado === 'prejuizo'
                        ? tf.custoParaContratados(f.euro(o.custoTotal), f.euro(o.valorContratado))
                        : etapa
                          ? tf.etapaDePrevistas(etapa.nome, f.horas(Math.round(etapa.minutos / 6) / 10), f.horas(etapa.horasPrevistas))
                          : tf.margemProjetadaDe(f.euro(o.margemProjetada))}
                    </span>
                  </span>
                  <BadgeFinanceiro estado={o.estado === 'ok' ? 'risco' : o.estado} />
                </Link>
              )
            })}
          </Card>
        </section>
        <section>
          <SectionTitle
            acoes={
              <Link href="/admin/analise?tab=funcionarios" className="text-[11px] font-semibold uppercase tracking-[1.5px] text-accent">
                {tf.verEquipa}
              </Link>
            }
          >
            {tf.horasPorPessoa}
          </SectionTitle>
          <Card className="divide-y divide-line p-0 md:p-0">
            {r.pessoas.length === 0 && <p className="p-5 text-[14px] text-text-dim">{tf.semHorasPeriodo}</p>}
            {r.pessoas.slice(0, 6).map((p) => (
              <div key={p.perfilId} className="flex items-center justify-between gap-4 px-4 py-3 md:px-5">
                <span className="truncate text-[14px] font-normal">{p.nome}</span>
                <span className="flex shrink-0 gap-4 text-[13px] tabular-nums">
                  <span className="font-bold">{f.horas(p.horas)}</span>
                  <span className="w-20 text-right text-text-mid">{f.euro(p.custo)}</span>
                </span>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </>
  )
}

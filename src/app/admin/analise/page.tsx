import Link from 'next/link'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { BadgeFinanceiro, CartaoGrafico, Segmentos } from '@/components/financeiro/Kpi'
import { CORES, GraficoArea, GraficoBarras } from '@/components/graficos/Graficos'
import { Card } from '@/components/ui/Card'
import { PageHeader, SectionTitle } from '@/components/ui/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { buttonClass } from '@/components/ui/Button'
import { exigirArea } from '@/lib/session'
import { cn } from '@/lib/utils'
import { comparacaoFuncionarios, comparacaoPorEtapa, financeiroDasObras, porFuncionario } from '@/modules/financeiro/queries'
import { PERIODOS, type Periodo } from '@/modules/financeiro/schema'

export const generateMetadata = tituloDaPagina('analise')

const h1 = (min: number) => Math.round(min / 6) / 10
const lista = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : [])

export default async function AnalisePage(props: PageProps<'/admin/analise'>) {
  const eu = await exigirArea('analise')
  const { t } = await getI18n()
  const ta = t.analise
  const sp = await props.searchParams
  const tab = sp.tab === 'funcionarios' ? 'funcionarios' : 'obras'

  return (
    <>
      <PageHeader eyebrow={ta.eyebrow} titulo={t.titulos.analise} descricao={ta.descricao} />
      <Tabs
        base="/admin/analise"
        atual={tab}
        tabs={[
          { id: 'obras', label: ta.tabObras },
          { id: 'funcionarios', label: ta.tabFuncionarios },
        ]}
      />
      {tab === 'obras' ? (
        <Obras empresaId={eu.empresaId} selecionadas={lista(sp.c)} />
      ) : (
        <Funcionarios
          empresaId={eu.empresaId}
          periodo={(PERIODOS as readonly string[]).includes(String(sp.periodo)) ? (sp.periodo as Periodo) : '90d'}
          selecionadas={lista(sp.p)}
        />
      )}
    </>
  )
}

async function Obras({ empresaId, selecionadas }: { empresaId: string; selecionadas: string[] }) {
  const { t, f } = await getI18n()
  const ta = t.analise
  const obras = financeiroDasObras(empresaId)
  const ids = selecionadas.filter((id) => obras.some((o) => o.obra.id === id)).slice(0, 4)
  const comp = ids.length >= 2 ? comparacaoPorEtapa(empresaId, ids) : null

  return (
    <div className="flex flex-col gap-8">
      <form action="/admin/analise" className="flex flex-col gap-4">
        <input type="hidden" name="tab" value="obras" />
        <Card data-guia="analise-obras" className="overflow-x-auto p-0 md:p-0">
          <table className="w-full min-w-[980px] text-left text-[13px]">
            <thead className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
              <tr className="border-b border-line">
                <th className="w-10 px-5 py-3" aria-label={ta.comparar} />
                <th className="px-3 py-3 font-semibold">{ta.colObra}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colValor}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colCusto}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colMargem}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colHoras}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colDesvio}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colEuroHora}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colHElemento}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colEuroElemento}</th>
                <th className="px-5 py-3 font-semibold">{ta.colEstado}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-light">
              {obras.map((o) => {
                const horas = h1(o.minutos)
                const ativa = o.obra.estado === 'ativa'
                // Em curso: desvio só nas etapas concluídas e margem projetada no fim.
                const fechadas = o.porEtapa.filter((e) => e.horasPrevistas != null && (!ativa || e.estado === 'concluida'))
                const prev = fechadas.reduce((s, e) => s + e.horasPrevistas!, 0)
                const real = fechadas.reduce((s, e) => s + e.minutos / 60, 0)
                const desvio = prev ? ((real - prev) / prev) * 100 : null
                const margemPct = ativa ? (o.valorContratado ? ((o.margemProjetada ?? 0) / o.valorContratado) * 100 : null) : o.margemPct
                return (
                  <tr key={o.obra.id} className="hover:bg-dark3">
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        name="c"
                        value={o.obra.id}
                        defaultChecked={ids.includes(o.obra.id)}
                        aria-label={ta.compararItem(o.obra.codigo)}
                        className="h-4 w-4 accent-accent"
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Link href={`/admin/obras/${o.obra.id}?tab=resumo`} className="font-normal hover:text-accent">
                        {o.obra.codigo} · {o.obra.titulo}
                      </Link>
                      <span className="block text-[11px] text-text-dim">{t.rotulos.estadoObra[o.obra.estado]}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{f.euro(o.valorContratado)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{f.euro(o.custoTotal)}</td>
                    <td
                      className={cn('whitespace-nowrap px-3 py-3 text-right font-bold tabular-nums', (margemPct ?? 0) < 0 && 'text-danger')}
                    >
                      {f.pct(margemPct)}
                      {ativa && <span className="block text-[10px] font-normal text-text-dim">{ta.projetada}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{f.horas(horas)}</td>
                    <td
                      className={cn('whitespace-nowrap px-3 py-3 text-right tabular-nums', desvio != null && desvio > 0 && 'text-danger')}
                    >
                      {f.pct(desvio, { sinal: true })}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{f.euro(o.euroPorHora)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{f.horas(o.horasPorElemento)}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{f.euro(o.custoPorElemento)}</td>
                    <td className="px-5 py-3">
                      <BadgeFinanceiro estado={o.estado} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Card>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className={buttonClass()}>
            {ta.compararSelecionadas}
          </button>
          <span className="text-[12px] text-text-dim">{ta.escolhaObras}</span>
        </div>
      </form>

      {comp && (
        <section className="flex flex-col gap-4">
          <SectionTitle>{ta.comparacao}</SectionTitle>
          <CartaoGrafico titulo={ta.horasPorEtapa} subtitulo={comp.resumos.map((r) => r.obra.codigo).join(' · ')}>
            <GraficoBarras
              dados={comp.linhas}
              x="etapa"
              horizontal
              formato="horas"
              series={comp.resumos.map((r, i) => ({ chave: r.obra.id, label: r.obra.codigo, cor: CORES[i] }))}
            />
          </CartaoGrafico>
          <div className="grid gap-4 xl:grid-cols-3">
            <CartaoGrafico titulo={ta.margem} subtitulo={ta.margemSub}>
              <GraficoBarras
                dados={comp.resumos.map((r) => ({
                  obra: r.obra.codigo,
                  margem:
                    Math.round(
                      (r.obra.estado === 'ativa' && r.valorContratado
                        ? ((r.margemProjetada ?? 0) / r.valorContratado) * 100
                        : (r.margemPct ?? 0)) * 10,
                    ) / 10,
                }))}
                x="obra"
                sinal
                formato="pct"
                altura={220}
                series={[{ chave: 'margem', label: ta.margem }]}
              />
            </CartaoGrafico>
            <CartaoGrafico titulo={ta.horasPorElemento} subtitulo={ta.horasPorElementoSub}>
              <GraficoBarras
                dados={comp.resumos.map((r) => ({ obra: r.obra.codigo, h: Math.round((r.horasPorElemento ?? 0) * 10) / 10 }))}
                x="obra"
                formato="horas"
                altura={220}
                series={[{ chave: 'h', label: ta.horasPorElemento }]}
              />
            </CartaoGrafico>
            <CartaoGrafico titulo={ta.valorPorHora} subtitulo={ta.valorPorHoraSub}>
              <GraficoBarras
                dados={comp.resumos.map((r) => ({ obra: r.obra.codigo, v: Math.round(r.euroPorHora ?? 0) }))}
                x="obra"
                formato="euro"
                altura={220}
                series={[{ chave: 'v', label: ta.euroPorHora }]}
              />
            </CartaoGrafico>
          </div>
        </section>
      )}
    </div>
  )
}

const MAX_PESSOAS = 6

async function Funcionarios({ empresaId, periodo, selecionadas }: { empresaId: string; periodo: Periodo; selecionadas: string[] }) {
  const { t, f } = await getI18n()
  const ta = t.analise
  const pessoas = porFuncionario(empresaId, periodo).filter(
    (p) => p.minutos > 0 || p.custoHora != null || selecionadas.includes(p.perfil.id),
  )
  const ids = selecionadas.filter((id) => pessoas.some((p) => p.perfil.id === id)).slice(0, MAX_PESSOAS)
  const comp = ids.length >= 2 ? comparacaoFuncionarios(empresaId, ids, periodo) : null
  const qs = (p: Periodo) => new URLSearchParams([['tab', 'funcionarios'], ['periodo', p], ...ids.map((id) => ['p', id])]).toString()
  const etapas = [...new Set(pessoas.flatMap((p) => Object.keys(p.porEtapa)))]
  const principais = etapas
    .map((e) => ({ e, h: pessoas.reduce((s, p) => s + (p.porEtapa[e] ?? 0), 0) }))
    .sort((a, b) => b.h - a.h)
    .slice(0, 4)
    .map((x) => x.e)
  const comHoras = pessoas.filter((p) => p.minutos > 0)

  return (
    <div className="flex flex-col gap-6">
      <Segmentos atual={periodo} opcoes={PERIODOS.map((p) => ({ id: p, label: t.rotulos.periodo[p], href: `/admin/analise?${qs(p)}` }))} />
      {comp && <ComparacaoPessoas comp={comp} periodo={periodo} />}
      <CartaoGrafico titulo={ta.horasPessoaEtapa} subtitulo={ta.horasPessoaEtapaSub}>
        <GraficoBarras
          dados={comHoras.map((p) => {
            const linha: Record<string, string | number> = { pessoa: p.perfil.nome }
            let outras = 0
            for (const [e, h] of Object.entries(p.porEtapa)) {
              const i = principais.indexOf(e)
              if (i >= 0) linha[`e${i}`] = Math.round(h * 10) / 10
              else outras += h
            }
            linha.outras = Math.round(outras * 10) / 10
            return linha
          })}
          x="pessoa"
          horizontal
          empilhado
          formato="horas"
          series={[
            ...principais.map((e, i) => ({ chave: `e${i}`, label: e, cor: CORES[i] })),
            { chave: 'outras', label: ta.outras, cor: 'var(--ok)' },
          ]}
        />
      </CartaoGrafico>

      <form action="/admin/analise" className="flex flex-col gap-4">
        <input type="hidden" name="tab" value="funcionarios" />
        <input type="hidden" name="periodo" value={periodo} />
        <Card className="overflow-x-auto p-0 md:p-0">
          <table className="w-full min-w-[800px] text-left text-[13px]">
            <thead className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
              <tr className="border-b border-line">
                <th className="w-10 px-5 py-3" aria-label={ta.comparar} />
                <th className="px-3 py-3 font-semibold">{ta.colPessoa}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colCustoHora}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colHoras}</th>
                <th className="px-3 py-3 text-right font-semibold">{ta.colCustoGerado}</th>
                <th className="px-5 py-3 font-semibold">{ta.colObras}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line font-light">
              {pessoas.map((p) => (
                <tr key={p.perfil.id} className="hover:bg-dark3">
                  <td className="px-5 py-3">
                    <input
                      type="checkbox"
                      name="p"
                      value={p.perfil.id}
                      defaultChecked={ids.includes(p.perfil.id)}
                      aria-label={ta.compararItem(p.perfil.nome)}
                      className="h-4 w-4 accent-accent"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/utilizadores/${p.perfil.id}?periodo=${periodo}`} className="font-normal hover:text-accent">
                      {p.perfil.nome}
                    </Link>
                    <span className="block text-[11px] text-text-dim">{p.equipa?.nome ?? t.comum.semEquipa}</span>
                  </td>
                  <td className={cn('px-3 py-3 text-right tabular-nums', p.custoHora == null && 'text-danger')}>
                    {p.custoHora != null ? f.euro(p.custoHora, { cent: true }) : ta.porDefinir}
                  </td>
                  <td className="px-3 py-3 text-right font-bold tabular-nums">{f.horas(h1(p.minutos))}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{f.euro(p.custo)}</td>
                  <td className="px-5 py-3 text-text-mid">
                    {p.obras.length
                      ? p.obras.map((o, i) => (
                          <span key={o.id}>
                            {i > 0 && ', '}
                            <Link href={`/admin/obras/${o.id}?tab=resumo`} className="hover:text-accent">
                              {o.codigo}
                            </Link>
                          </span>
                        ))
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className={buttonClass()}>
            {ta.compararSelecionadas}
          </button>
          <span className="text-[12px] text-text-dim">{ta.escolhaPessoas(MAX_PESSOAS)}</span>
        </div>
      </form>
      <p className="text-[12px] text-text-dim">
        {ta.custoDefineEm}{' '}
        <Link href="/admin/utilizadores" className="text-accent">
          {t.titulos.utilizadores}
        </Link>
        {ta.cadaRegisto}
      </p>
    </div>
  )
}

async function ComparacaoPessoas({ comp, periodo }: { comp: ReturnType<typeof comparacaoFuncionarios>; periodo: Periodo }) {
  const { t, f } = await getI18n()
  const ta = t.analise
  const series = comp.pessoas.map((p, i) => ({ chave: p.perfil.id, label: p.perfil.nome, cor: CORES[i % CORES.length] }))
  const linhas: { label: string; valor: (p: (typeof comp.pessoas)[number]) => string }[] = [
    { label: ta.equipa, valor: (p) => p.equipa?.nome ?? t.comum.semEquipa },
    { label: ta.colCustoHora, valor: (p) => (p.custoHora != null ? f.euro(p.custoHora, { cent: true }) : '—') },
    { label: ta.colHoras, valor: (p) => f.horas(h1(p.minutos)) },
    { label: ta.colCustoGerado, valor: (p) => f.euro(p.custo) },
    { label: ta.colObras, valor: (p) => String(p.obraIds.length) },
    { label: ta.diasComRegistos, valor: (p) => String(p.diasTrabalhados) },
    { label: ta.mediaPorDia, valor: (p) => f.horas(p.mediaHorasDia != null ? Math.round(p.mediaHorasDia * 10) / 10 : null) },
    { label: ta.fabricacao, valor: (p) => f.pct(p.pctFabricacao) },
    { label: ta.montagem, valor: (p) => f.pct(p.pctMontagem) },
  ]
  return (
    <section className="flex flex-col gap-4">
      <SectionTitle>{ta.comparacaoPeriodo(t.rotulos.periodo[periodo])}</SectionTitle>
      <Card className="overflow-x-auto p-0 md:p-0">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">
            <tr className="border-b border-line">
              <th className="px-5 py-3 font-semibold" />
              {comp.pessoas.map((p, i) => (
                <th key={p.perfil.id} className="px-3 py-3 text-right font-semibold">
                  <span className="mr-2 inline-block h-2 w-2 align-middle" style={{ background: CORES[i % CORES.length] }} />
                  <Link href={`/admin/utilizadores/${p.perfil.id}?periodo=${periodo}`} className="hover:text-accent">
                    {p.perfil.nome}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line font-light">
            {linhas.map((l) => (
              <tr key={l.label}>
                <td className="px-5 py-2.5 text-text-mid">{l.label}</td>
                {comp.pessoas.map((p) => (
                  <td key={p.perfil.id} className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums">
                    {l.valor(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid gap-4 xl:grid-cols-2">
        <CartaoGrafico titulo={ta.horasPorEtapa}>
          {comp.porEtapa.length ? (
            <GraficoBarras dados={comp.porEtapa} x="etapa" horizontal formato="horas" series={series} />
          ) : (
            <p className="text-[13px] text-text-dim">{ta.semHorasPeriodo}</p>
          )}
        </CartaoGrafico>
        <CartaoGrafico titulo={ta.horasPorSemana}>
          {comp.porSemana.length ? (
            <GraficoArea dados={comp.porSemana} x="semana" formatoX="semana" formato="horas" series={series} />
          ) : (
            <p className="text-[13px] text-text-dim">{ta.semHorasPeriodo}</p>
          )}
        </CartaoGrafico>
      </div>
    </section>
  )
}

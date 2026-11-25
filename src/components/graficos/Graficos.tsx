'use client'
/**
 * Gráficos sobre o shadcn/ui chart (Recharts). Recebem dados simples do servidor
 * e um `formato` em texto (as funções não passam de server para client components).
 * Cores: só os tokens de design — ver CORES e docs/design.md.
 */
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Pie, PieChart, ReferenceLine, XAxis, YAxis } from 'recharts'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/shadcn/chart'
import { useI18n } from '@/i18n/client'
import type { Formatadores } from '@/i18n/formatar'
import type { Dicionario } from '@/i18n'
import { cn } from '@/lib/utils'

/** Ordem das séries: destaque, creme (escuro no tema claro), cinza, destaque escuro, verde. */
export const CORES = ['var(--accent)', 'var(--serie-2)', 'var(--text-mid)', 'var(--accent-dk)', 'var(--ok)'] as const
export const COR_PERIGO = 'var(--danger)'

export type Formato = 'euro' | 'horas' | 'pct' | 'numero'
export type FormatoX = 'texto' | 'dia' | 'semana'

export interface Serie {
  chave: string
  label: string
  cor?: string
}

const fmtValor = (fm: Formatadores, f: Formato) => (v: number) =>
  f === 'euro' ? fm.euro(v) : f === 'horas' ? fm.horas(v) : f === 'pct' ? fm.pct(v) : fm.numero(v)

const fmtEixo = (fm: Formatadores, f: Formato) => (v: number) =>
  f === 'euro' ? fm.euro(v, { compacto: true }) : f === 'horas' ? `${fm.numero(v)} h` : f === 'pct' ? `${fm.numero(v)}%` : fm.numero(v)

const fmtX = (f: FormatoX) => (v: string) => {
  if (f === 'texto') return v
  const [, m, d] = v.split('-')
  return `${d}/${m}`
}

const fmtXTooltip = (t: Dicionario, f: FormatoX) => (v: unknown) =>
  f === 'semana' ? t.graficos.semanaDe(fmtX('dia')(String(v))) : f === 'dia' ? fmtX('dia')(String(v)) : String(v)

function config(series: Serie[]): ChartConfig {
  return Object.fromEntries(series.map((s, i) => [s.chave, { label: s.label, color: s.cor ?? CORES[i % CORES.length] }]))
}

const eixo = { tickLine: false, axisLine: false, tickMargin: 8 } as const

/* ─── Área (horas por semana, custo acumulado) ─────────────────────────── */

export function GraficoArea({
  dados,
  x,
  series,
  formato = 'numero',
  formatoX = 'texto',
  empilhado = false,
  referencia,
  altura = 260,
  className,
}: {
  dados: Record<string, string | number | null>[]
  x: string
  series: Serie[]
  formato?: Formato
  formatoX?: FormatoX
  empilhado?: boolean
  /** Linha horizontal (ex.: valor contratado). */
  referencia?: { valor: number; label: string }
  altura?: number
  className?: string
}) {
  const { t, f: fm } = useI18n()
  return (
    <ChartContainer config={config(series)} className={cn('aspect-auto w-full', className)} style={{ height: altura }}>
      <AreaChart data={dados} margin={{ left: 4, right: 12, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey={x} {...eixo} minTickGap={24} tickFormatter={fmtX(formatoX)} />
        <YAxis {...eixo} width={formato === 'euro' ? 76 : 56} tickFormatter={fmtEixo(fm, formato)} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              indicator="line"
              valueFormatter={fmtValor(fm, formato)}
              labelFormatter={(_, p) => fmtXTooltip(t, formatoX)(p?.[0]?.payload?.[x])}
            />
          }
        />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {referencia && (
          <ReferenceLine
            y={referencia.valor}
            ifOverflow="extendDomain"
            stroke="var(--danger)"
            strokeDasharray="4 4"
            label={{ value: referencia.label, position: 'insideTopLeft', fill: 'var(--text-mid)', fontSize: 11 }}
          />
        )}
        {series.map((s) => (
          <Area
            key={s.chave}
            dataKey={s.chave}
            type="monotone"
            stackId={empilhado ? 'a' : undefined}
            stroke={`var(--color-${s.chave})`}
            fill={`var(--color-${s.chave})`}
            fillOpacity={0.14}
            strokeWidth={2}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  )
}

/* ─── Barras (comparações, previsto vs. real, margens) ─────────────────── */

export function GraficoBarras({
  dados,
  x,
  series,
  formato = 'numero',
  horizontal = false,
  empilhado = false,
  sinal = false,
  legenda = series.length > 1,
  altura,
  className,
}: {
  dados: Record<string, string | number | null>[]
  x: string
  series: Serie[]
  formato?: Formato
  horizontal?: boolean
  empilhado?: boolean
  /** Uma série com valores negativos: os negativos ficam a vermelho. */
  sinal?: boolean
  legenda?: boolean
  altura?: number
  className?: string
}) {
  const { f: fm } = useI18n()
  // Com `sinal`, a série divide-se em duas (positiva/negativa) para pintar os negativos a vermelho.
  const s0 = series[0]
  const efetivas: Serie[] = sinal
    ? [
        { chave: `${s0.chave}__pos`, label: s0.label, cor: s0.cor ?? CORES[0] },
        { chave: `${s0.chave}__neg`, label: s0.label, cor: COR_PERIGO },
      ]
    : series
  const linhas = sinal
    ? dados.map((d) => {
        const v = Number(d[s0.chave] ?? 0)
        return { ...d, [`${s0.chave}__pos`]: v >= 0 ? v : null, [`${s0.chave}__neg`]: v < 0 ? v : null }
      })
    : dados
  const h = altura ?? (horizontal ? Math.max(160, dados.length * (series.length > 1 && !empilhado ? 44 : 32) + 40) : 260)

  return (
    <ChartContainer config={config(efetivas)} className={cn('aspect-auto w-full', className)} style={{ height: h }}>
      <BarChart data={linhas} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ left: 4, right: 12, top: 8 }} accessibilityLayer>
        <CartesianGrid vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...eixo} tickFormatter={fmtEixo(fm, formato)} />
            <YAxis type="category" dataKey={x} {...eixo} width={132} tick={{ fontSize: 11 }} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} {...eixo} interval={0} tick={{ fontSize: 11 }} />
            <YAxis {...eixo} width={formato === 'euro' ? 76 : 56} tickFormatter={fmtEixo(fm, formato)} />
          </>
        )}
        <ChartTooltip cursor={{ fill: 'var(--dark3)' }} content={<ChartTooltipContent valueFormatter={fmtValor(fm, formato)} />} />
        {legenda && !sinal && <ChartLegend content={<ChartLegendContent />} />}
        {sinal && <ReferenceLine {...(horizontal ? { x: 0 } : { y: 0 })} stroke="var(--line)" />}
        {efetivas.map((s) => (
          <Bar
            key={s.chave}
            dataKey={s.chave}
            fill={`var(--color-${s.chave})`}
            stackId={empilhado || sinal ? 'a' : undefined}
            maxBarSize={horizontal ? 18 : 36}
          />
        ))}
      </BarChart>
    </ChartContainer>
  )
}

/* ─── Donut (custos por tipo) ──────────────────────────────────────────── */

export function GraficoDonut({
  dados,
  formato = 'euro',
  altura = 240,
}: {
  dados: { chave: string; label: string; valor: number }[]
  formato?: Formato
  altura?: number
}) {
  const { f: fm } = useI18n()
  const series = dados.map((d) => ({ chave: d.chave, label: d.label }))
  const linhas = dados.map((d) => ({ ...d, fill: `var(--color-${d.chave})` }))
  return (
    <ChartContainer config={config(series)} className="aspect-auto w-full" style={{ height: altura }}>
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="chave" valueFormatter={fmtValor(fm, formato)} />} />
        <Pie data={linhas} dataKey="valor" nameKey="chave" innerRadius="62%" outerRadius="88%" strokeWidth={2} stroke="var(--dark2)" />
        <ChartLegend content={<ChartLegendContent nameKey="chave" className="flex-wrap gap-x-4 gap-y-1" />} />
      </PieChart>
    </ChartContainer>
  )
}

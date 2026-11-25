import type { ReactNode } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import type { EstadoFinanceiro } from '@/modules/financeiro/calculos'
import { getI18n } from '@/i18n/server'

/** Indicador grande do painel (número em destaque). */
export function Kpi({ label, valor, detalhe, tom }: { label: string; valor: string; detalhe?: ReactNode; tom?: 'perigo' | 'ok' }) {
  return (
    <Card className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">{label}</p>
      <p
        className={cn(
          'text-[26px] font-bold leading-none tracking-[-1px] tabular-nums md:text-[30px]',
          tom === 'perigo' && 'text-danger',
          tom === 'ok' && 'text-ok',
        )}
      >
        {valor}
      </p>
      {detalhe && <p className="text-[12px] text-text-mid">{detalhe}</p>}
    </Card>
  )
}

/** Cartão de gráfico: título, subtítulo e o gráfico. */
export function CartaoGrafico({
  titulo,
  subtitulo,
  children,
  className,
  acoes,
}: {
  titulo: string
  subtitulo?: ReactNode
  children: ReactNode
  className?: string
  acoes?: ReactNode
}) {
  return (
    <Card className={cn('flex min-w-0 flex-col gap-4', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[12px] font-semibold uppercase tracking-[1.5px]">{titulo}</h3>
          {subtitulo && <p className="mt-1 text-[12px] text-text-dim">{subtitulo}</p>}
        </div>
        {acoes}
      </div>
      {children}
    </Card>
  )
}

const TOM: Record<EstadoFinanceiro, 'ok' | 'perigo' | 'destaque' | 'apagado'> = {
  ok: 'ok',
  risco: 'destaque',
  prejuizo: 'perigo',
  sem_valor: 'apagado',
}

export async function BadgeFinanceiro({ estado }: { estado: EstadoFinanceiro }) {
  const { t } = await getI18n()
  return <Badge tom={TOM[estado]}>{t.financeiro.estado[estado]}</Badge>
}

/** Seletor segmentado por URL (período, separadores de análise). */
export async function Segmentos({ opcoes, atual }: { opcoes: { id: string; label: string; href: string }[]; atual: string }) {
  const { t } = await getI18n()
  return (
    <nav className="flex w-full overflow-x-auto shadow-[inset_0_0_0_1px_var(--line)] sm:w-auto" aria-label={t.financeiro.periodo}>
      {opcoes.map((o) => (
        <Link
          key={o.id}
          href={o.href}
          scroll={false}
          aria-current={o.id === atual ? 'page' : undefined}
          className={cn(
            'flex-1 whitespace-nowrap px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[1.5px] transition-colors sm:flex-none',
            o.id === atual ? 'bg-accent text-[#fff]' : 'text-text-mid hover:text-white',
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  )
}

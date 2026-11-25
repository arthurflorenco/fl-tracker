import Link from 'next/link'
import { cn } from '@/lib/utils'
import { getI18n } from '@/i18n/server'

/** Separadores por URL (?tab=) — funcionam sem JavaScript e podem ser partilhados. */
export async function Tabs({
  base,
  atual,
  tabs,
}: {
  base: string
  atual: string
  tabs: { id: string; label: string; contador?: number }[]
}) {
  const { t: i18n } = await getI18n()
  return (
    <nav className="-mx-5 mb-8 flex gap-1 overflow-x-auto border-b border-line px-5 md:mx-0 md:px-0" aria-label={i18n.ui.seccoes}>
      {tabs.map((t) => {
        const on = t.id === atual
        return (
          <Link
            key={t.id}
            href={`${base}?tab=${t.id}`}
            scroll={false}
            data-guia={`tab-${t.id}`}
            aria-current={on ? 'page' : undefined}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-3 py-3 text-[11px] font-semibold uppercase tracking-[1.5px] transition-colors',
              on ? 'border-accent text-accent' : 'border-transparent text-text-mid hover:text-white',
            )}
          >
            {t.label}
            {t.contador != null && <span className="ml-1.5 text-text-dim">{t.contador}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

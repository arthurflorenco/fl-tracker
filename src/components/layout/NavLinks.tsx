'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChartColumn, ClipboardList, FolderKanban, History, LayoutGrid, Menu, Settings2, Timer, Users, UsersRound, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONES = {
  painel: LayoutGrid,
  obras: ClipboardList,
  registar: Timer,
  projetos: FolderKanban,
  analise: ChartColumn,
  utilizadores: Users,
  equipas: UsersRound,
  definicoes: Settings2,
  historico: History,
} as const

export interface Item {
  href: string
  label: string
  icone: keyof typeof ICONES
  principal?: boolean
  contador?: number
}

const ativo = (pathname: string, href: string) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href))

/** Lateral em desktop/tablet horizontal. */
export function SideNav({ itens, rotulo }: { itens: Item[]; rotulo: string }) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-1" aria-label={rotulo}>
      {itens.map((i) => {
        const Icone = ICONES[i.icone]
        const on = ativo(pathname, i.href)
        return (
          <Link
            key={i.href}
            href={i.href}
            data-guia={`nav-${i.icone}`}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 px-3 py-3 text-[12px] font-semibold uppercase tracking-[1.5px] transition-colors',
              on ? 'bg-dark3 text-accent' : 'text-text-mid hover:text-white',
            )}
          >
            <Icone size={18} strokeWidth={1.5} />
            <span className="flex-1">{i.label}</span>
            {!!i.contador && <span className="bg-accent px-1.5 text-[10px] text-[#fff]">{i.contador}</span>}
          </Link>
        )
      })}
    </nav>
  )
}

/** Barra inferior em telemóvel/tablet vertical: 4 principais + menu. */
export function BottomNav({ itens, rotulo, mais }: { itens: Item[]; rotulo: string; mais: string }) {
  const pathname = usePathname()
  const [aberto, setAberto] = useState(false)
  const principais = itens.filter((i) => i.principal).slice(0, 4)
  const resto = itens.filter((i) => !principais.includes(i))

  return (
    <>
      {aberto && resto.length > 0 && (
        <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setAberto(false)}>
          <div
            className="absolute inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] bg-dark2 p-4 card-premium"
            onClick={(e) => e.stopPropagation()}
          >
            <SideNavLista itens={resto} pathname={pathname} onNavigate={() => setAberto(false)} />
          </div>
        </div>
      )}
      <nav
        aria-label={rotulo}
        className="no-print fixed inset-x-0 bottom-0 z-50 grid border-t border-line bg-dark pb-[env(safe-area-inset-bottom)] lg:hidden"
        style={{ gridTemplateColumns: `repeat(${principais.length + (resto.length ? 1 : 0)}, minmax(0, 1fr))` }}
      >
        {principais.map((i) => {
          const Icone = ICONES[i.icone]
          const on = ativo(pathname, i.href)
          return (
            <Link
              key={i.href}
              href={i.href}
              data-guia={`nav-${i.icone}`}
              aria-current={on ? 'page' : undefined}
              className={cn(
                'flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[1px]',
                on ? 'text-accent' : 'text-text-mid',
              )}
            >
              <Icone size={20} strokeWidth={1.5} />
              {i.label}
            </Link>
          )
        })}
        {resto.length > 0 && (
          <button
            type="button"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            className={cn(
              'relative flex h-16 flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[1px]',
              aberto ? 'text-accent' : 'text-text-mid',
            )}
          >
            {aberto ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
            {mais}
            {resto.some((i) => i.contador) && <span className="absolute right-[30%] top-3 h-2 w-2 rounded-full bg-accent" />}
          </button>
        )}
      </nav>
    </>
  )
}

function SideNavLista({ itens, pathname, onNavigate }: { itens: Item[]; pathname: string; onNavigate: () => void }) {
  return (
    <div className="grid grid-cols-2 gap-1">
      {itens.map((i) => {
        const Icone = ICONES[i.icone]
        const on = ativo(pathname, i.href)
        return (
          <Link
            key={i.href}
            href={i.href}
            data-guia={`nav-${i.icone}`}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 px-3 py-4 text-[12px] font-semibold uppercase tracking-[1.5px]',
              on ? 'bg-dark3 text-accent' : 'text-text-mid',
            )}
          >
            <Icone size={18} strokeWidth={1.5} />
            {i.label}
            {!!i.contador && <span className="bg-accent px-1.5 text-[10px] text-[#fff]">{i.contador}</span>}
          </Link>
        )
      })}
    </div>
  )
}

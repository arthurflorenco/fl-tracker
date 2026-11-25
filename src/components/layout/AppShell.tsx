import Link from 'next/link'
import { LogOut } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import ThemeSwitch from '@/components/ui/ThemeSwitch'
import { IdiomaSwitch } from '@/components/ui/IdiomaSwitch'
import { getI18n } from '@/i18n/server'
import type { Dicionario } from '@/i18n'
import { podeVerArea } from '@/lib/permissions'
import { sair } from '@/app/entrar/actions'
import type { Perfil } from '@/modules/utilizadores/schema'
import { empresaPorId } from '@/modules/empresas/queries'
import { registoAtivo } from '@/modules/tempos/queries'
import { NAV } from './nav'
import { BottomNav, SideNav, type Item } from './NavLinks'
import { TrabalhoEmCurso } from './TrabalhoEmCurso'

export async function AppShell({ perfil, children }: { perfil: Perfil; children: React.ReactNode }) {
  const { t } = await getI18n()
  const empresa = empresaPorId(perfil.empresaId)
  const itens: Item[] = NAV.filter((n) => podeVerArea(perfil.papel, n.area)).map((n) => ({
    href: n.href,
    label: t.nav[n.label] as string,
    icone: n.icone as Item['icone'],
    principal: n.principal,
  }))
  const ativo = registoAtivo(perfil.id)

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="no-print sticky top-0 hidden h-dvh flex-col gap-8 border-r border-line bg-dark px-4 py-6 lg:flex">
        <Link href="/admin" className="flex items-center gap-3 px-2" aria-label={t.nav.marca}>
          <Logo crop="icon" className="h-9 w-auto" />
          <span className="min-w-0">
            <span className="block text-[12px] font-semibold uppercase tracking-[2px] text-text-mid">FL Tracker</span>
            {empresa && <span className="block truncate text-[11px] text-text-dim">{empresa.nome}</span>}
          </span>
        </Link>
        <SideNav itens={itens} rotulo={t.nav.principal} />
        <div className="mt-auto flex flex-col gap-4 px-2">
          <Utilizador perfil={perfil} t={t} />
          <div className="flex items-center justify-between gap-3">
            <ThemeSwitch />
            <IdiomaSwitch />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-line bg-dark/90 px-5 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur lg:hidden">
          <Link href="/admin" className="flex min-w-0 items-center gap-3" aria-label={t.nav.marca}>
            <Logo crop="icon" className="h-8 w-auto" />
            <span className="truncate text-[11px] font-semibold uppercase tracking-[2px] text-text-mid">
              {empresa?.nome ?? 'FL Tracker'}
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <IdiomaSwitch />
            <ThemeSwitch />
            <form action={sair}>
              <button type="submit" className="p-2 text-text-mid hover:text-accent" aria-label={t.comum.sairDe(perfil.nome)}>
                <LogOut size={18} strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </header>

        {ativo && (
          <TrabalhoEmCurso
            registo={{
              id: ativo.id,
              inicio: ativo.inicio,
              criadoEm: ativo.criadoEm,
              obraId: ativo.obraId,
              obraCodigo: ativo.obra?.codigo ?? '',
              etapa: ativo.etapa?.nome ?? '',
              atividade: ativo.atividade?.nome ?? null,
              elemento: ativo.elemento?.referencia ?? null,
            }}
          />
        )}

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 pb-28 pt-8 md:px-8 lg:pb-16 lg:pt-12">{children}</main>
      </div>

      <BottomNav itens={itens} rotulo={t.nav.principal} mais={t.nav.mais} />
    </div>
  )
}

function Utilizador({ perfil, t }: { perfil: Perfil; t: Dicionario }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-normal">{perfil.nome}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">{t.rotulos.papel[perfil.papel]}</p>
      </div>
      <form action={sair}>
        <button type="submit" className="p-2 text-text-mid hover:text-accent" aria-label={t.comum.sair}>
          <LogOut size={16} strokeWidth={1.5} />
        </button>
      </form>
    </div>
  )
}

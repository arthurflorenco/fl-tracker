import Logo from '@/components/ui/Logo'
import { getI18n, tituloDaPagina } from '@/i18n/server'
import { IdiomaSwitch } from '@/components/ui/IdiomaSwitch'
import ThemeSwitch from '@/components/ui/ThemeSwitch'
import { listarPerfis } from '@/modules/utilizadores/queries'
import { PAPEIS_FASE1 } from '@/modules/utilizadores/schema'
import { equipaPorId } from '@/modules/equipas/queries'
import { listarEmpresas } from '@/modules/empresas/queries'
import { entrar } from './actions'

export const generateMetadata = tituloDaPagina('entrar')

export default async function EntrarPage(props: PageProps<'/entrar'>) {
  const { destino } = await props.searchParams
  const { t } = await getI18n()
  const perfis = listarPerfis().filter((p) => p.ativo && (PAPEIS_FASE1 as readonly string[]).includes(p.papel))
  // Demonstração multi-empresa: as pessoas aparecem agrupadas pela empresa onde trabalham.
  const empresas = listarEmpresas().map((e) => ({ ...e, perfis: perfis.filter((p) => p.empresaId === e.id) }))

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col justify-center px-5 py-12">
      <div className="mb-10 flex items-center justify-between">
        <Logo crop="full" className="h-16 w-auto" title="FL Tracker" />
        <div className="flex items-center gap-3">
          <IdiomaSwitch />
          <ThemeSwitch />
        </div>
      </div>
      <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">FL Tracker</p>
      <h1 className="mt-2 text-[36px] font-bold uppercase leading-[0.95] tracking-[-1.5px] md:text-[44px]">{t.entrar.titulo}</h1>
      <p className="mt-4 text-[14px] text-text-mid">{t.entrar.texto}</p>

      {empresas.map((e) => (
        <section key={e.id} className="mt-8">
          <h2 className="mb-3 text-[12px] font-semibold uppercase tracking-[1.5px] text-text-dim">{e.nome}</h2>
          <ul className="flex flex-col gap-2">
            {e.perfis.map((p) => (
              <li key={p.id}>
                <form action={entrar}>
                  <input type="hidden" name="perfilId" value={p.id} />
                  <input type="hidden" name="destino" value={typeof destino === 'string' ? destino : '/admin'} />
                  <button
                    type="submit"
                    data-guia={`perfil-${p.id}`}
                    className="card-premium flex w-full items-center justify-between gap-4 bg-dark2 px-5 py-4 text-left transition-colors hover:text-accent"
                  >
                    <span>
                      <span className="block text-[15px] font-normal">{p.nome}</span>
                      <span className="block text-[11px] font-semibold uppercase tracking-[1.5px] text-text-dim">
                        {t.rotulos.papel[p.papel]}
                        {p.equipaId ? ` · ${equipaPorId(p.equipaId)?.nome}` : ''}
                      </span>
                    </span>
                    <span aria-hidden className="text-accent">
                      →
                    </span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  )
}

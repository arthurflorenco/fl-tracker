import { getI18n } from '@/i18n/server'

/** Aviso discreto no topo de todas as páginas, no modo de demonstração. */
export async function FaixaDemo() {
  const { t } = await getI18n()
  return (
    <div className="no-print border-b border-line bg-dark px-5 py-2 text-center text-[11px] font-semibold uppercase tracking-[1.5px] text-text-dim">
      <span className="text-accent">{t.demo.faixa}</span> · {t.demo.faixaTexto}
    </div>
  )
}

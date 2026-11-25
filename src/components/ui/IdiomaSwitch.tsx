'use client'
import { useTransition } from 'react'
import { definirIdioma } from '@/i18n/actions'
import { useI18n } from '@/i18n/client'
import { IDIOMAS } from '@/i18n/config'
import { cn } from '@/lib/utils'

/** EN | PT — muda o idioma da interface (cookie) sem sair da página. */
export function IdiomaSwitch({ className }: { className?: string }) {
  const { idioma, t } = useI18n()
  const [pendente, iniciar] = useTransition()
  return (
    <div role="group" aria-label={t.idioma.rotulo} className={cn('flex text-[11px] font-semibold tracking-[1.5px]', className)}>
      {IDIOMAS.map((i) => (
        <button
          key={i}
          type="button"
          lang={i}
          disabled={pendente}
          aria-pressed={i === idioma}
          aria-label={t.idioma.mudarPara(t.idioma.nomes[i])}
          onClick={() => i !== idioma && iniciar(() => definirIdioma(i))}
          className={cn(
            'px-2 py-1.5 transition-colors disabled:opacity-60',
            i === idioma ? 'text-accent shadow-[inset_0_0_0_1px_currentColor]' : 'text-text-mid hover:text-white',
          )}
        >
          {t.idioma[i]}
        </button>
      ))}
    </div>
  )
}

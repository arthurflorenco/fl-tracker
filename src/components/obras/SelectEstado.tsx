'use client'
import { useActionState } from 'react'
import type { Resultado } from '@/lib/acao'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/client'

/** Select que grava ao mudar (estado de etapa/elemento). */
export function SelectEstado({
  action,
  campoId,
  id,
  valor,
  opcoes,
  disabled,
  label,
}: {
  action: (s: Resultado | null, f: FormData) => Promise<Resultado>
  campoId: string
  id: string
  valor: string
  opcoes: Record<string, string>
  disabled?: boolean
  label: string
}) {
  const [estado, formAction, pendente] = useActionState(action, null)
  const { msg } = useI18n()
  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name={campoId} value={id} />
      <select
        name="estado"
        defaultValue={valor}
        disabled={disabled || pendente}
        aria-label={label}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className={cn(
          'bg-dark3 px-3 py-2 text-[12px] font-normal text-white shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:shadow-[inset_0_0_0_1px_var(--accent)] disabled:opacity-50',
        )}
      >
        {Object.entries(opcoes).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      {estado && !estado.ok && <span className="text-[11px] text-danger">{msg(estado.erro)}</span>}
    </form>
  )
}

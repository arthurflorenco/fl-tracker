'use client'
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ReactNode } from 'react'
import type { Resultado } from '@/lib/acao'
import { cn } from '@/lib/utils'
import { Button } from './Button'
import { useI18n } from '@/i18n/client'

type Acao = (estado: Resultado | null, formData: FormData) => Promise<Resultado>

const PendenteContext = createContext(false)
const ErrosContext = createContext<Record<string, string[] | undefined>>({})
/** Erros de validação do formulário atual, por nome de campo (lido por <Field>). */
export const useErrosForm = () => useContext(ErrosContext)

/**
 * Formulário ligado a uma server action (`modules/*\/actions.ts`).
 * Pode ser usado em server components: os erros por campo chegam aos <Field> por contexto.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = true,
  onSuccess,
}: {
  action: Acao
  children: ReactNode
  className?: string
  resetOnSuccess?: boolean
  onSuccess?: (r: Extract<Resultado, { ok: true }>) => void
}) {
  const [estado, formAction, pendente] = useActionState(async (anterior: Resultado | null, formData: FormData) => {
    const r = await action(anterior, formData)
    if (r.ok) onSuccess?.(r)
    return r
  }, null)
  const ref = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (estado?.ok && resetOnSuccess) ref.current?.reset()
  }, [estado, resetOnSuccess])

  const erros = estado && !estado.ok ? (estado.campos ?? {}) : {}
  return (
    <ErrosContext.Provider value={erros}>
      <PendenteContext.Provider value={pendente}>
        {/* onSubmit em vez de action={}: o React 19 limpa o formulário depois de qualquer
          action, o que apagaria o que a pessoa escreveu quando há erro de validação.
          Aqui só se limpa em caso de sucesso (resetOnSuccess). */}
        <form
          ref={ref}
          className={className}
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter)
            startTransition(() => formAction(fd))
          }}
        >
          {children}
          <Mensagem estado={estado} />
        </form>
      </PendenteContext.Provider>
    </ErrosContext.Provider>
  )
}

function Mensagem({ estado }: { estado: Resultado | null }) {
  const { msg } = useI18n()
  if (!estado) return null
  if (estado.ok && !estado.mensagem) return null
  return (
    <p role="status" className={cn('mt-3 text-[13px] font-normal', estado.ok ? 'text-ok' : 'text-danger')}>
      {msg((estado.ok ? estado.mensagem : estado.erro) ?? '')}
    </p>
  )
}

export function SubmitButton({ children, pendente, ...props }: React.ComponentProps<typeof Button> & { pendente?: string }) {
  const pending = useContext(PendenteContext)
  const { t } = useI18n()
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? (pendente ?? t.comum.aGuardar) : children}
    </Button>
  )
}

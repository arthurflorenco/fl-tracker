'use client'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { useErrosForm } from './ActionForm'
import { useI18n } from '@/i18n/client'

const controlo =
  'w-full bg-dark3 px-4 py-3 text-[15px] font-light text-white placeholder:text-text-dim shadow-[inset_0_0_0_1px_var(--line)] outline-none transition-shadow focus:shadow-[inset_0_0_0_1px_var(--accent)] disabled:opacity-50'

export function Label({ children, htmlFor }: { children: ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-[11px] font-semibold uppercase tracking-[1.5px] text-text-mid">
      {children}
    </label>
  )
}

export function Field({
  label,
  name,
  erro,
  children,
  className,
}: {
  label: string
  name: string
  erro?: string[]
  children: ReactNode
  className?: string
}) {
  const doForm = useErrosForm()[name]
  const { msg } = useI18n()
  erro ??= doForm
  return (
    <div className={className}>
      <Label htmlFor={name}>{label}</Label>
      {children}
      {erro?.[0] && <p className="mt-1.5 text-[12px] font-normal text-danger">{msg(erro[0])}</p>}
    </div>
  )
}

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return <input id={p.name} className={cn(controlo, className)} {...p} />
}

export function Select({ className, children, ...p }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      id={p.name}
      className={cn(controlo, 'appearance-none bg-[length:12px] bg-[right_1rem_center] bg-no-repeat pr-10', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%233CC2B0' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
      }}
      {...p}
    >
      {children}
    </select>
  )
}

export function Textarea({ className, ...p }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea id={p.name} rows={3} className={cn(controlo, 'resize-y', className)} {...p} />
}

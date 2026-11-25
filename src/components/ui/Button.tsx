import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

// Botões: retangulares, maiúsculas, tracking 1.5px, destaque.
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const base =
  'inline-flex items-center justify-center gap-2 font-sans font-semibold uppercase tracking-[1.5px] transition-colors duration-200 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-[#fff] hover:bg-accent-dk',
  secondary:
    'bg-transparent text-white shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--accent)] hover:text-accent',
  ghost: 'bg-transparent text-text-mid hover:text-accent',
  danger: 'bg-transparent text-danger shadow-[inset_0_0_0_1px_currentColor] hover:bg-danger hover:text-[#fff]',
}

const sizes: Record<Size, string> = {
  sm: 'text-[11px] px-4 py-2.5',
  md: 'text-[12px] px-6 py-3.5',
  // Modo registo (tablet com luvas): alvos grandes.
  lg: 'text-[14px] px-8 py-6 min-h-[72px] w-full',
}

export function buttonClass({ variant = 'primary', size = 'md', className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className)
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass({ variant, size, className })} {...props} />
}

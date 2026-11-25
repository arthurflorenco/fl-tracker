import { cn } from '@/lib/utils'

export type Tom = 'neutro' | 'destaque' | 'ok' | 'perigo' | 'apagado'

const tons: Record<Tom, string> = {
  neutro: 'text-white shadow-[inset_0_0_0_1px_var(--line)]',
  destaque: 'text-accent shadow-[inset_0_0_0_1px_currentColor]',
  ok: 'text-ok shadow-[inset_0_0_0_1px_currentColor]',
  perigo: 'text-danger shadow-[inset_0_0_0_1px_currentColor]',
  apagado: 'text-text-dim shadow-[inset_0_0_0_1px_var(--line)]',
}

export function Badge({ tom = 'neutro', children, className }: { tom?: Tom; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1 text-[10px] font-semibold uppercase tracking-[1.5px] whitespace-nowrap',
        tons[tom],
        className,
      )}
    >
      {children}
    </span>
  )
}

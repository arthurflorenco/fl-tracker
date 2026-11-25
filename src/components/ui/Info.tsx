import { cn } from '@/lib/utils'

/** Par rótulo/valor para cartões de resumo. */
export function Info({ label, valor, destaque }: { label: string; valor: string; destaque?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[1.5px] text-text-dim">{label}</p>
      <p className={cn('mt-1', destaque ? 'text-[18px] font-bold' : 'text-[15px] font-normal')}>{valor}</p>
    </div>
  )
}

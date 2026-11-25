import type { ReactNode } from 'react'

/** Cabeçalho de página: sobretítulo em destaque + título em maiúsculas. */
export function PageHeader({
  eyebrow,
  titulo,
  descricao,
  acoes,
}: {
  eyebrow?: ReactNode
  titulo: ReactNode
  descricao?: ReactNode
  acoes?: ReactNode
}) {
  return (
    <header className="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">{eyebrow}</p>}
        <h1 className="mt-2 text-[30px] font-bold uppercase leading-[0.95] tracking-[-1.5px] md:text-[44px]">{titulo}</h1>
        {descricao && <div className="mt-3 max-w-[60ch] text-[14px] font-extralight text-text-mid md:text-[15px]">{descricao}</div>}
      </div>
      {acoes && <div className="flex flex-wrap gap-3">{acoes}</div>}
    </header>
  )
}

export function SectionTitle({ children, acoes }: { children: ReactNode; acoes?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="text-[12px] font-semibold uppercase tracking-[1.5px] text-text-mid">{children}</h2>
      {acoes}
    </div>
  )
}

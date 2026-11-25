import Logo from './Logo'

export function EmptyState({ titulo, texto, children }: { titulo: string; texto?: string; children?: React.ReactNode }) {
  return (
    <div className="relative flex flex-col items-start gap-3 overflow-hidden bg-dark2 p-8 card-premium">
      <Logo
        mono
        crop="icon"
        className="pointer-events-none absolute -right-6 top-1/2 h-40 w-auto -translate-y-1/2 text-[rgba(60,194,176,0.12)]"
      />
      <p className="text-[18px] font-bold uppercase tracking-[-0.5px]">{titulo}</p>
      {texto && <p className="max-w-[46ch] text-[14px] text-text-mid">{texto}</p>}
      {children}
    </div>
  )
}

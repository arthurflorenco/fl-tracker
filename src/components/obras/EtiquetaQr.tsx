import Logo from '@/components/ui/Logo'

/** Etiqueta sempre clara (preto sobre branco) para impressão e leitura fiável. */
export function EtiquetaQr({
  titulo,
  subtitulo,
  svg,
  url,
  destaque,
}: {
  titulo: string
  subtitulo: string
  svg: string
  url: string
  destaque?: boolean
}) {
  return (
    <article
      className={`flex flex-col gap-4 bg-[#fff] p-6 text-[#111] print:mb-8 print:break-inside-avoid ${destaque ? 'md:col-span-2 xl:col-span-1' : ''}`}
    >
      <div className="flex items-center justify-between gap-4">
        <Logo crop="full" theme="light" className="h-10 w-auto" />
        <span className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#646464]">FL Tracker</span>
      </div>
      <div className="mx-auto w-full max-w-[280px]" dangerouslySetInnerHTML={{ __html: svg }} />
      <div>
        <p className="text-[22px] font-bold uppercase leading-none tracking-[-1px]">{titulo}</p>
        <p className="mt-1 text-[13px] font-light">{subtitulo}</p>
        <p className="mt-2 break-all text-[10px] text-[#646464]">{url}</p>
      </div>
      <div className="h-[3px] w-12 bg-accent" />
    </article>
  )
}

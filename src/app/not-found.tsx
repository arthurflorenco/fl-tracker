import Link from 'next/link'
import Logo from '@/components/ui/Logo'
import { buttonClass } from '@/components/ui/Button'
import { getI18n } from '@/i18n/server'

export default async function NotFound() {
  const { t } = await getI18n()
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[640px] flex-col justify-center overflow-hidden px-5 py-12">
      <Logo
        mono
        crop="icon"
        className="pointer-events-none absolute -right-20 top-1/2 h-[320px] w-auto -translate-y-1/2 text-[rgba(60,194,176,0.12)]"
      />
      <p className="text-[12px] font-semibold uppercase tracking-[1.5px] text-accent">404</p>
      <h1 className="mt-2 text-[36px] font-bold uppercase leading-[0.95] tracking-[-1.5px] md:text-[44px]">{t.erro404.titulo}</h1>
      <p className="mt-4 max-w-[46ch] text-[15px] text-text-mid">{t.erro404.texto}</p>
      <Link href="/admin" className={buttonClass({ className: 'mt-8 self-start' })}>
        {t.erro404.voltar}
      </Link>
    </main>
  )
}

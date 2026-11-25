import type { Metadata, Viewport } from 'next'
import './globals.css'
import { poppins } from './fonts'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/lib/theme'
import { MODO_DEMO } from '@/lib/demo'
import { getSessao } from '@/lib/session'
import { FaixaDemo } from '@/components/guia/FaixaDemo'
import { Guia } from '@/components/guia/Guia'
import { IdiomaProvider } from '@/i18n/client'
import { getI18n } from '@/i18n/server'

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n()
  return {
    title: { default: 'FL Tracker', template: '%s · FL Tracker' },
    description: t.meta.descricao,
    applicationName: 'FL Tracker',
    appleWebApp: { capable: true, title: 'FL Tracker', statusBarStyle: 'black-translucent' },
    robots: { index: false, follow: false },
  }
}

export const viewport: Viewport = {
  themeColor: '#1C1C1E',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

// Anti-flash: aplica o tema antes de o React hidratar. Escuro por defeito
// (não segue o tema do sistema); escolha manual guardada em `fl-theme`.
const themeScript = `(function(){try{var s=localStorage.getItem('fl-theme');document.documentElement.setAttribute('data-theme',s==='light'?'light':'dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})()`

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const sessao = MODO_DEMO ? await getSessao() : null
  const { idioma } = await getI18n()
  return (
    <html
      lang={idioma === 'pt' ? 'pt-PT' : 'en-GB'}
      data-theme="dark"
      className={cn('font-sans', poppins.variable)}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <IdiomaProvider idioma={idioma}>
          <ThemeProvider>
            {MODO_DEMO && <FaixaDemo />}
            {children}
            {MODO_DEMO && <Guia perfilId={sessao?.id ?? null} />}
          </ThemeProvider>
        </IdiomaProvider>
      </body>
    </html>
  )
}

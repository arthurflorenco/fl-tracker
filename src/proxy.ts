import { NextResponse, type NextRequest } from 'next/server'

/**
 * Verificação otimista: sem cookie de sessão → /entrar (guarda o destino, ex.: o URL de um
 * QR Code lido antes de entrar). A autorização real é feita no servidor (lib/session.ts) e,
 * com Supabase, pelas políticas RLS.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const protegida = pathname.startsWith('/admin') || pathname.startsWith('/q/') || pathname.startsWith('/demo')
  if (protegida && !request.cookies.has('fl-sessao')) {
    const url = new URL('/entrar', request.url)
    url.searchParams.set('destino', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // Tudo menos os ficheiros estáticos (ícones, manifesto, imagens do Next).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest).*)'],
}

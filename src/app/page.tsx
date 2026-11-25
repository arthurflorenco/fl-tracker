import { redirect } from 'next/navigation'
import { MODO_DEMO } from '@/lib/demo'

// Fase 1: só existe a área interna. Na Fase 2 esta rota passa a ser o portal do cliente
// (app.example.com) e a área interna fica em /admin.
// Na demonstração, o link abre sempre no ecrã de entrada, onde o guia começa.
export default function Home() {
  redirect(MODO_DEMO ? '/entrar' : '/admin')
}

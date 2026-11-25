import type { Area } from '@/lib/permissions'
import type { Dicionario } from '@/i18n'

/** Navegação da Fase 1. Pós-venda e portal do cliente não aparecem (Fase 2). */
export const NAV: { area: Area; href: string; label: keyof Dicionario['nav']; icone: string; principal?: boolean }[] = [
  { area: 'painel', href: '/admin', label: 'painel', icone: 'painel', principal: true },
  { area: 'obras', href: '/admin/obras', label: 'obras', icone: 'obras', principal: true },
  { area: 'registar', href: '/admin/registar', label: 'registar', icone: 'registar', principal: true },
  { area: 'projetos', href: '/admin/projetos', label: 'projetos', icone: 'projetos', principal: true },
  { area: 'analise', href: '/admin/analise', label: 'analise', icone: 'analise' },
  { area: 'utilizadores', href: '/admin/utilizadores', label: 'utilizadores', icone: 'utilizadores' },
  { area: 'equipas', href: '/admin/equipas', label: 'equipas', icone: 'equipas' },
  { area: 'definicoes', href: '/admin/definicoes/etapas', label: 'definicoes', icone: 'definicoes' },
  { area: 'historico', href: '/admin/historico', label: 'historico', icone: 'historico' },
]

import { describe, expect, it } from 'vitest'
import { existsSync } from 'node:fs'
import { criarSeed } from '@/lib/mock/seed'
import { ADMINISTRACAO, FUNCIONARIO, OBRA, PASSOS } from './passos'

const seed = criarSeed(new Date('2026-10-22T10:00:00Z'))

/** "/admin/obras/ob-1/registar" → "src/app/admin/obras/[id]/registar/page.tsx" existe? */
function rotaExiste(pagina: string) {
  const partes = pagina.split('/').filter(Boolean)
  const caminho = partes.map((p) => (p.startsWith('ob-') ? '[id]' : p)).join('/')
  return existsSync(`src/app/${caminho}${caminho ? '/' : ''}page.tsx`)
}

describe('guia da demonstração', () => {
  it('tem ids únicos', () => {
    expect(new Set(PASSOS.map((p) => p.id)).size).toBe(PASSOS.length)
  })

  it('usa pessoas e obra que existem no seed', () => {
    const tiago = seed.perfis.find((p) => p.id === FUNCIONARIO)
    expect(tiago?.papel).toBe('fabricacao')
    expect(seed.perfis.find((p) => p.id === ADMINISTRACAO)?.papel).toBe('admin')
    const equipasObra = seed.obraEquipas.filter((x) => x.obraId === OBRA).map((x) => x.equipaId)
    expect(equipasObra).toContain(tiago?.equipaId)
    for (const p of PASSOS) if (p.perfil) expect(seed.perfis.some((x) => x.id === p.perfil)).toBe(true)
  })

  it('aponta para páginas que existem', () => {
    for (const p of PASSOS) {
      if (p.pagina !== '*') expect(rotaExiste(p.pagina), p.pagina).toBe(true)
      if (p.ate && 'pagina' in p.ate) expect(rotaExiste(p.ate.pagina), p.ate.pagina).toBe(true)
      if (p.acao && 'href' in p.acao) expect(rotaExiste(p.acao.href), p.acao.href).toBe(true)
    }
  })

  it('o funcionário não tem trabalho em curso no início (o passo "Iniciar" precisa do formulário)', () => {
    expect(seed.registosTempo.some((r) => r.perfilId === FUNCIONARIO && !r.fim)).toBe(false)
  })

  it('termina com um passo visível em qualquer página', () => {
    expect(PASSOS.at(-1)?.pagina).toBe('*')
  })
})

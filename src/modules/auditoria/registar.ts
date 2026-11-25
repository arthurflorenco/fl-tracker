import 'server-only'
import { after } from 'next/server'
import { agendarGravacao, db, novoId } from '@/lib/mock/store'
import type { EntradaHistorico, Origem } from './schema'

type Nova = Omit<EntradaHistorico, 'id' | 'empresaId' | 'criadoEm' | 'origem' | 'motivo' | 'antes' | 'depois' | 'obraId'> & {
  origem?: Origem
  motivo?: string | null
  antes?: object | null
  depois?: object | null
  obraId?: string | null
}

/**
 * Regista uma alteração (quem, o quê, quando, antes, depois, motivo, origem).
 * No Supabase isto passa a ser feito por trigger em cada tabela; a chamada
 * explícita fica para o `resumo` legível e o `motivo`.
 */
export function registarHistorico(e: Nova) {
  const entrada: EntradaHistorico = {
    id: novoId(),
    // Como o trigger no Postgres: a entrada pertence à empresa de quem fez a alteração.
    empresaId: db().perfis.find((p) => p.id === e.autorId)?.empresaId ?? '',
    criadoEm: new Date().toISOString(),
    origem: e.origem ?? 'manual',
    motivo: e.motivo ?? null,
    obraId: e.obraId ?? null,
    antes: (e.antes as Record<string, unknown>) ?? null,
    depois: (e.depois as Record<string, unknown>) ?? null,
    entidade: e.entidade,
    entidadeId: e.entidadeId,
    acao: e.acao,
    resumo: e.resumo,
    autorId: e.autorId,
  }
  db().historico.unshift(entrada)
  // Toda a escrita passa por aqui: grava os dados partilhados (demonstração no Netlify) e
  // mantém o servidor vivo até a gravação acabar, mesmo depois de a resposta sair.
  const gravacao = agendarGravacao()
  try {
    if (gravacao) after(() => gravacao)
  } catch {
    // Fora de um pedido (ex.: testes): não há resposta a prolongar.
  }
  return entrada
}

/** Só os campos que mudaram, para guardar antes/depois sem ruído. */
export function diferencas<T extends object>(antes: T, depois: Partial<T>) {
  const a: Record<string, unknown> = {}
  const d: Record<string, unknown> = {}
  for (const k of Object.keys(depois) as (keyof T)[]) {
    if (antes[k] !== depois[k]) {
      a[k as string] = antes[k]
      d[k as string] = depois[k]
    }
  }
  return { antes: a, depois: d }
}

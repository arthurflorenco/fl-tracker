/**
 * Base de dados em memória para a fase de fundação (sem Supabase).
 * Vive no servidor e reinicia quando o processo reinicia. Só `modules/*\/queries.ts`
 * e `modules/*\/actions.ts` lhe tocam — ao ligar o Supabase, troca-se aqui e nesses ficheiros.
 */
import type { Empresa } from '@/modules/empresas/schema'
import type { EntradaHistorico } from '@/modules/auditoria/schema'
import type { Elemento } from '@/modules/elementos/schema'
import type { Equipa } from '@/modules/equipas/schema'
import type { Atividade, EtapaModelo, ObraEtapa } from '@/modules/etapas/schema'
import type { CustoDireto, CustoHora } from '@/modules/financeiro/schema'
import type { Fotografia } from '@/modules/fotografias/schema'
import type { Nota } from '@/modules/notas/schema'
import type { Obra, ObraEquipa, ObraResponsavel } from '@/modules/obras/schema'
import type { Cliente, Projeto } from '@/modules/projetos/schema'
import type { RegistoTempo } from '@/modules/tempos/schema'
import type { Perfil } from '@/modules/utilizadores/schema'
import { criarSeed } from './seed'

export interface Db {
  empresas: Empresa[]
  equipas: Equipa[]
  perfis: Perfil[]
  clientes: Cliente[]
  projetos: Projeto[]
  obras: Obra[]
  obraEquipas: ObraEquipa[]
  obraResponsaveis: ObraResponsavel[]
  etapasModelo: EtapaModelo[]
  atividades: Atividade[]
  obraEtapas: ObraEtapa[]
  elementos: Elemento[]
  registosTempo: RegistoTempo[]
  notas: Nota[]
  fotografias: Fotografia[]
  historico: EntradaHistorico[]
  custosHora: CustoHora[]
  custosDiretos: CustoDireto[]
}

/** Subir quando o formato dos dados fictícios muda: o servidor em dev recria a base sem reiniciar. */
const VERSAO_SEED = 7

const g = globalThis as unknown as { __flDb?: Db; __flDbVersao?: number }

export function db(): Db {
  if (!g.__flDb || g.__flDbVersao !== VERSAO_SEED) {
    g.__flDb = criarSeed(new Date())
    g.__flDbVersao = VERSAO_SEED
  }
  return g.__flDb
}

/** Volta aos dados fictícios iniciais (modo de demonstração: "Repor dados"). */
export async function reporDb() {
  g.__flDb = undefined
  db()
  agendarGravacao()
  await s.__flPendente
}

/* ─── Demonstração publicada: os mesmos dados em todas as instâncias ──────────
   No Netlify a app corre em várias instâncias que nascem e morrem; a memória de cada
   uma não chega (um registo iniciado numa "não existia" na outra). Os dados ficam então
   num blob partilhado (Netlify Blobs): cada pedido lê a versão mais recente antes de
   começar (`sincronizarDb`, chamado em getSessao) e cada escrita grava antes de a
   resposta acabar (`agendarGravacao`, chamado em registarHistorico). Sem Netlify
   (máquina local, testes) fica tudo só em memória, como antes. */

/** O que a sincronização precisa do Netlify Blobs (permite uma loja falsa nos testes). */
export interface Loja {
  getMetadata(chave: string): Promise<{ etag?: string } | null>
  get(chave: string, opcoes: { type: 'json' }): Promise<unknown>
  setJSON(chave: string, dados: unknown): Promise<{ etag?: string }>
}

const CHAVE = 'db'
const s = globalThis as unknown as {
  __flLoja?: Loja | null
  __flEtag?: string
  __flSujo?: boolean
  __flPendente?: Promise<void>
}

async function loja(): Promise<Loja | null> {
  if (s.__flLoja !== undefined) return s.__flLoja
  try {
    const { getStore } = await import('@netlify/blobs')
    const l = getStore({ name: 'fl-demo', consistency: 'strong' }) as unknown as Loja
    await l.getMetadata(CHAVE) // falha fora do Netlify (sem contexto de Blobs)
    s.__flLoja = l
  } catch {
    s.__flLoja = null
  }
  return s.__flLoja
}

/** Só para testes: usa uma loja falsa (ou nenhuma, com null). */
export function usarLoja(l: Loja | null) {
  s.__flLoja = l
  s.__flEtag = undefined
}

/** Traz para esta instância a versão mais recente dos dados (se outra instância os alterou). */
export async function sincronizarDb() {
  if (s.__flPendente) await s.__flPendente
  const l = await loja()
  if (!l) return
  const meta = await l.getMetadata(CHAVE)
  if (meta && meta.etag && meta.etag === s.__flEtag && g.__flDb) return
  const guardado = meta ? ((await l.get(CHAVE, { type: 'json' })) as { versao?: number; dados?: Db } | null) : null
  if (guardado?.dados && guardado.versao === VERSAO_SEED) {
    g.__flDb = guardado.dados
    g.__flDbVersao = VERSAO_SEED
    s.__flEtag = meta?.etag
    return
  }
  // Ainda não há dados partilhados (ou mudou o formato): começa dos fictícios e grava.
  g.__flDb = undefined
  db()
  agendarGravacao()
  await s.__flPendente
}

/** Marca os dados como alterados; a gravação corre já e é esperada antes de a resposta acabar. */
export function agendarGravacao() {
  s.__flSujo = true
  if (s.__flPendente) return
  s.__flPendente = (async () => {
    try {
      const l = await loja()
      while (l && s.__flSujo) {
        s.__flSujo = false
        const r = await l.setJSON(CHAVE, { versao: VERSAO_SEED, dados: db() })
        s.__flEtag = r?.etag
      }
    } finally {
      s.__flPendente = undefined
    }
  })()
  return s.__flPendente
}

/** Espera pela gravação em curso (se houver). */
export const gravacaoPendente = () => s.__flPendente

export const novoId = () => crypto.randomUUID()

/** Token curto e opaco para URLs de QR Code. */
export function novoToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

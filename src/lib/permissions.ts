/**
 * Regras de permissão puras (sem I/O), partilhadas entre UI, server actions e
 * testes. As políticas RLS em supabase/migrations espelham estas regras —
 * se mudar uma, mude a outra. Ver docs/permissoes.md.
 */
import type { Papel, Perfil } from '@/modules/utilizadores/schema'

/** Janela em que um funcionário ainda pode alterar o próprio registo. */
export const JANELA_EDICAO_MS = 24 * 60 * 60 * 1000

export type Area = 'painel' | 'projetos' | 'obras' | 'registar' | 'analise' | 'equipas' | 'utilizadores' | 'definicoes' | 'historico'

const AREAS: Record<Papel, Area[]> = {
  admin: ['painel', 'projetos', 'obras', 'registar', 'analise', 'equipas', 'utilizadores', 'definicoes', 'historico'],
  orcamentacao: ['painel', 'projetos', 'obras', 'registar'],
  compras: ['painel', 'obras', 'registar'],
  fabricacao: ['painel', 'obras', 'registar'],
  montagem: ['painel', 'obras', 'registar'],
  // Fase 2 — sem acesso à área interna.
  pos_venda: [],
  cliente: [],
}

export function podeVerArea(papel: Papel, area: Area) {
  return AREAS[papel].includes(area)
}

export const eAdmin = (p: Pick<Perfil, 'papel'>) => p.papel === 'admin'

/**
 * Multi-empresa: a primeira regra de todas. Ninguém (nem a administração) toca em dados
 * de outra empresa. No Postgres: política RESTRICTIVE `empresa_id = minha_empresa()`.
 */
export const mesmaEmpresa = (perfil: Pick<Perfil, 'empresaId'>, linha: { empresaId: string } | null | undefined) =>
  linha != null && linha.empresaId === perfil.empresaId

/** Custos, custo/hora, valor contratado e margens: só a administração (RLS: e_admin()). */
export const podeVerFinanceiro = (p: Pick<Perfil, 'papel'>) => eAdmin(p)

/** Papéis que veem todas as obras; os restantes só as das suas equipas. */
const VEEM_TODAS_AS_OBRAS: Papel[] = ['admin', 'orcamentacao', 'compras']

/** O que é preciso saber de uma obra para decidir o acesso (null = a obra não existe). */
export interface AcessoObra {
  empresaId: string | null
  equipas: string[]
}

export function podeVerObra(perfil: Pick<Perfil, 'papel' | 'equipaId' | 'empresaId'>, obra: AcessoObra) {
  if (obra.empresaId == null || obra.empresaId !== perfil.empresaId) return false
  if (perfil.papel === 'cliente' || perfil.papel === 'pos_venda') return false
  if (VEEM_TODAS_AS_OBRAS.includes(perfil.papel)) return true
  return perfil.equipaId != null && obra.equipas.includes(perfil.equipaId)
}

/** Só administração e orçamentação gerem projetos e os convertem em obra. */
export const podeGerirProjetos = (p: Pick<Perfil, 'papel'>) => p.papel === 'admin' || p.papel === 'orcamentacao'

/** Elementos e etapas da obra: escritório. Fabricação/montagem só mudam o estado. */
export const podeGerirObra = (p: Pick<Perfil, 'papel'>) => p.papel === 'admin' || p.papel === 'orcamentacao'

interface RegistoProprio {
  empresaId: string
  perfilId?: string
  autorId?: string
  criadoEm: string
  arquivadoEm?: string | null
}

const donoDe = (r: RegistoProprio) => r.perfilId ?? r.autorId

/**
 * Pode alterar? O autor durante 24 h, sem aprovação; depois disso o registo fica fechado
 * e só a administração o altera (com motivo, no histórico). Mais ninguém.
 */
export function podeEditarRegisto(perfil: Pick<Perfil, 'id' | 'papel' | 'empresaId'>, registo: RegistoProprio, agora = new Date()) {
  if (!mesmaEmpresa(perfil, registo)) return false
  if (registo.arquivadoEm) return eAdmin(perfil)
  if (eAdmin(perfil)) return true
  if (donoDe(registo) !== perfil.id) return false
  return agora.getTime() - new Date(registo.criadoEm).getTime() <= JANELA_EDICAO_MS
}

/** Ninguém apaga definitivamente. Só a administração arquiva. */
export const podeArquivar = (p: Pick<Perfil, 'papel'>) => eAdmin(p)

/* ─── Portal do cliente (Fase 2) ───────────────────────────────────────────
   Preparado e testado já, para que a regra "o cliente só vê informação
   autorizada" exista antes de existir o portal. */

export interface VistaInternaObra {
  codigo: string
  titulo: string
  estado: string
  etapas: { nome: string; estado: string; visivelCliente: boolean; dataPrevista: string | null }[]
  elementos: { referencia: string; tipo: string; estado: string }[]
  fotografias: { caminho: string; legenda: string | null; aprovadaCliente: boolean }[]
  notas: { texto: string; interna: boolean; tipo: string }[]
  registosTempo: unknown[]
  custos?: unknown
  margens?: unknown
  fornecedores?: unknown
}

export interface VistaClienteObra {
  codigo: string
  titulo: string
  estado: string
  etapas: { nome: string; estado: string; dataPrevista: string | null }[]
  elementos: { referencia: string; tipo: string; estado: string }[]
  fotografias: { caminho: string; legenda: string | null }[]
  atualizacoes: { texto: string }[]
}

/** Lista branca: tudo o que não está aqui (horas, custos, margens, fornecedores, notas internas) não sai. */
export function vistaCliente(o: VistaInternaObra): VistaClienteObra {
  return {
    codigo: o.codigo,
    titulo: o.titulo,
    estado: o.estado,
    etapas: o.etapas.filter((e) => e.visivelCliente).map(({ nome, estado, dataPrevista }) => ({ nome, estado, dataPrevista })),
    elementos: o.elementos.map(({ referencia, tipo, estado }) => ({ referencia, tipo, estado })),
    fotografias: o.fotografias.filter((f) => f.aprovadaCliente).map(({ caminho, legenda }) => ({ caminho, legenda })),
    atualizacoes: o.notas.filter((n) => !n.interna).map(({ texto }) => ({ texto })),
  }
}

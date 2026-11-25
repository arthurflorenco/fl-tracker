import 'server-only'
import { db } from '@/lib/mock/store'
import { getSessao } from '@/lib/session'
import type { Perfil } from '@/modules/utilizadores/schema'
import { eAdmin } from '@/lib/permissions'
import { chaveDia } from '@/lib/format'
import { getI18n } from '@/i18n/server'
import type { Dicionario } from '@/i18n'
import type { Formatadores } from '@/i18n/formatar'
import { paraCsv, respostaCsv, slug, type Celula } from '@/lib/csv'
import { custoHoraEm } from './calculos'
import { financeiroDasObras, porFuncionario } from './queries'
import { PERIODOS, type Periodo } from './schema'

/* Exportações CSV — só administração (têm horas individuais e €). Usadas pelos route handlers `exportar/route.ts`. */

/** Textos e formatadores do idioma de quem exporta. */
type I18n = { t: Dicionario; f: Formatadores }
const hoje = () => chaveDia(new Date())
const h2 = (min: number | null | undefined) => (min == null ? null : Math.round((min / 60) * 100) / 100)

/** Corre `gerar` só para a administração; caso contrário 404 (não revela que a rota existe). */
export async function soAdmin(gerar: (eu: Perfil, i18n: I18n) => Response | null) {
  const eu = await getSessao()
  const i18n = await getI18n()
  const naoEncontrado = () => new Response(i18n.t.csv.naoEncontrado, { status: 404 })
  if (!eu || !eAdmin(eu)) return naoEncontrado()
  return gerar(eu, i18n) ?? naoEncontrado()
}

export const lerPeriodo = (url: string): Periodo => {
  const p = new URL(url).searchParams.get('periodo')
  return (PERIODOS as readonly string[]).includes(String(p)) ? (p as Periodo) : 'tudo'
}

export function csvObras(empresaId: string, { t, f }: I18n) {
  const d = db()
  const linhas: Celula[][] = financeiroDasObras(empresaId).map((r) => [
    r.obra.codigo,
    r.obra.titulo,
    d.clientes.find((c) => c.id === r.obra.clienteId)?.nome,
    t.rotulos.estadoObra[r.obra.estado],
    f.data(r.obra.dataInicio),
    r.obra.dataPrevistaFim ? f.data(r.obra.dataPrevistaFim) : null,
    d.obraEquipas
      .filter((oe) => oe.obraId === r.obra.id)
      .map((oe) => d.equipas.find((e) => e.id === oe.equipaId)?.nome)
      .filter(Boolean)
      .join(', '),
    r.elementos,
    h2(r.minutos),
    r.horasPrevistas,
    r.valorContratado,
    r.custoMaoObra,
    r.custosDiretos,
    r.custoTotal,
    r.margem,
    r.margemPct,
    r.obra.estado === 'ativa' ? r.margemProjetada : null,
  ])
  const csv = paraCsv(t.csv.obras, linhas)
  return respostaCsv(`fl-tracker-obras-${hoje()}.csv`, csv)
}

/** Linhas de registos de tempo terminados (ou em curso), com custo à data. */
function linhasRegistos(filtro: (r: { obraId: string; perfilId: string }) => boolean, coluna: 'pessoa' | 'obra', { t, f }: I18n) {
  const d = db()
  return d.registosTempo
    .filter((r) => !r.arquivadoEm && filtro(r))
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
    .map((r): Celula[] => {
      const ch = custoHoraEm(d.custosHora, r.perfilId, r.inicio)
      const horas = h2(r.duracaoMin)
      const obra = d.obras.find((o) => o.id === r.obraId)
      const quem =
        coluna === 'pessoa' ? (d.perfis.find((p) => p.id === r.perfilId)?.nome ?? '—') : obra ? `${obra.codigo} · ${obra.titulo}` : '—'
      return [
        f.data(r.inicio),
        f.hora(r.inicio),
        r.fim ? f.hora(r.fim) : t.csv.emCurso,
        horas,
        quem,
        d.equipas.find((e) => e.id === r.equipaId)?.nome,
        d.obraEtapas.find((e) => e.id === r.obraEtapaId)?.nome,
        d.atividades.find((a) => a.id === r.atividadeId)?.nome,
        d.elementos.find((e) => e.id === r.elementoId)?.referencia,
        ch,
        horas != null && ch != null ? horas * ch : null,
        r.nota,
      ]
    })
}

export function csvRegistosObra(empresaId: string, obraId: string, i18n: I18n) {
  const obra = db().obras.find((o) => o.id === obraId && o.empresaId === empresaId)
  if (!obra) return null
  const csv = paraCsv(
    i18n.t.csv.registos('pessoa'),
    linhasRegistos((r) => r.obraId === obraId, 'pessoa', i18n),
  )
  return respostaCsv(`obra-${obra.codigo}-registos.csv`, csv)
}

export function csvUtilizadores(empresaId: string, periodo: Periodo, { t }: I18n) {
  const d = db()
  const stats = new Map(porFuncionario(empresaId, periodo).map((p) => [p.perfil.id, p]))
  const linhas: Celula[][] = d.perfis
    .filter((p) => p.empresaId === empresaId && p.papel !== 'cliente')
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt'))
    .map((p) => {
      const s = stats.get(p.id)
      return [
        p.nome,
        p.email,
        t.rotulos.papel[p.papel],
        d.equipas.find((e) => e.id === p.equipaId)?.nome ?? t.csv.semEquipa,
        p.ativo ? t.csv.sim : t.csv.nao,
        s?.custoHora ?? custoHoraEm(d.custosHora, p.id, new Date().toISOString()),
        s ? h2(s.minutos) : 0,
        s ? s.custo : 0,
        s ? s.obras.map((o) => o.codigo).join(', ') : '',
      ]
    })
  const csv = paraCsv(t.csv.utilizadores(t.rotulos.periodo[periodo]), linhas)
  return respostaCsv(`utilizadores-${hoje()}.csv`, csv)
}

export function csvRegistosPessoa(empresaId: string, perfilId: string, i18n: I18n) {
  const perfil = db().perfis.find((p) => p.id === perfilId && p.empresaId === empresaId)
  if (!perfil) return null
  const csv = paraCsv(
    i18n.t.csv.registos('obra'),
    linhasRegistos((r) => r.perfilId === perfilId, 'obra', i18n),
  )
  return respostaCsv(`${slug(perfil.nome)}-registos.csv`, csv)
}

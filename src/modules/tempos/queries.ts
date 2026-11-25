import 'server-only'
import { db } from '@/lib/mock/store'
import { chaveDia } from '@/lib/format'
import { arredondarFim, diasPermitidos, fimSugerido, horaDe, inicioSugerido } from '@/lib/quartos'

function enriquecer<
  T extends { perfilId: string; atividadeId: string | null; elementoId: string | null; obraEtapaId: string; obraId: string },
>(r: T) {
  const d = db()
  return {
    ...r,
    perfil: d.perfis.find((p) => p.id === r.perfilId) ?? null,
    atividade: d.atividades.find((a) => a.id === r.atividadeId) ?? null,
    elemento: d.elementos.find((e) => e.id === r.elementoId) ?? null,
    etapa: d.obraEtapas.find((e) => e.id === r.obraEtapaId) ?? null,
    obra: d.obras.find((o) => o.id === r.obraId) ?? null,
  }
}
export type RegistoEnriquecido = ReturnType<typeof enriquecer>

const naoArquivados = () => db().registosTempo.filter((r) => !r.arquivadoEm)

export const registosDaObra = (obraId: string) =>
  naoArquivados()
    .filter((r) => r.obraId === obraId)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
    .map(enriquecer)

export function registoAtivo(perfilId: string) {
  const r = naoArquivados().find((x) => x.perfilId === perfilId && x.fim == null)
  return r ? enriquecer(r) : null
}

export const registosEmCurso = (obraIds: string[]) =>
  naoArquivados()
    .filter((r) => r.fim == null && obraIds.includes(r.obraId))
    .map(enriquecer)

export function registosDoPerfil(perfilId: string, limite = 30) {
  return naoArquivados()
    .filter((r) => r.perfilId === perfilId)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
    .slice(0, limite)
    .map(enriquecer)
}

export function registoPorId(id: string) {
  const r = db().registosTempo.find((x) => x.id === id)
  return r ? enriquecer(r) : null
}

/** Minutos registados hoje (registos terminados) nas obras indicadas. */
export function minutosHoje(obraIds: string[]) {
  const hoje = chaveDia(new Date())
  return naoArquivados()
    .filter((r) => r.duracaoMin != null && chaveDia(r.inicio) === hoje && obraIds.includes(r.obraId))
    .reduce((s, r) => s + (r.duracaoMin ?? 0), 0)
}

/** Total por etapa da obra — base para comparar previsto vs. real (Fase 5). */
export function minutosPorEtapa(obraId: string) {
  const out: Record<string, number> = {}
  for (const r of naoArquivados()) if (r.obraId === obraId && r.duracaoMin) out[r.obraEtapaId] = (out[r.obraEtapaId] ?? 0) + r.duracaoMin
  return out
}

const diaSemana = new Intl.DateTimeFormat('pt-PT', { timeZone: 'Europe/Lisbon', weekday: 'short', day: '2-digit', month: '2-digit' })

/** Horas sugeridas para o modo registo da pessoa (quartos de hora, hora de Lisboa). */
export function relogioDoPerfil(perfilId: string, agora = new Date()) {
  const hoje = chaveDia(agora)
  const meus = naoArquivados().filter((r) => r.perfilId === perfilId)
  const ultimoFim = meus.reduce((m, r) => (r.fim && r.fim > m ? r.fim : m), '')
  const ultimoFimHoje = ultimoFim && chaveDia(ultimoFim) === hoje ? ultimoFim : null
  const ativo = meus.find((r) => r.fim == null) ?? null

  const inicio = inicioSugerido(agora, ultimoFimHoje)
  const fim = ativo ? fimSugerido(agora, ativo.inicio) : arredondarFim(agora)
  const hora = (iso: string) => (chaveDia(iso) === hoje ? horaDe(iso) : '24:00')
  const inicioMin = ultimoFimHoje ? horaDe(ultimoFimHoje) : horaDe(inicio) < '05:00' ? '00:00' : '05:00'

  return {
    inicioPadrao: hora(inicio),
    inicioMin,
    fimPadrao: hora(fim),
    fimMin:
      ativo && chaveDia(ativo.inicio) === hoje ? horaDe(new Date(new Date(ativo.inicio).getTime() + 15 * 60_000).toISOString()) : '00:15',
    dias: diasPermitidos(agora).map((valor, i) => ({
      valor,
      label: i === 0 ? 'Hoje' : i === 1 ? 'Ontem' : diaSemana.format(new Date(`${valor}T12:00:00Z`)),
    })),
  }
}

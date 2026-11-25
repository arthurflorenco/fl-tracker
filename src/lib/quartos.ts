/**
 * Tempo em quartos de hora (15 min). Regra do negócio, a favor do funcionário:
 * o início arredonda para baixo e o fim para cima; mínimo de 15 min.
 * Os limites de quarto são iguais em UTC e em Lisboa (o fuso difere em horas
 * inteiras), por isso arredonda-se diretamente em milissegundos.
 */
import { chaveDia, fmtHora, inputLisboaParaIso } from './format'

export const QUARTO_MIN = 15
const Q = QUARTO_MIN * 60_000
/** Quantos dias atrás o funcionário pode lançar horas à mão. */
export const DIAS_LANCAR_HORAS = 7

const ms = (d: Date | string) => new Date(d).getTime()

export const arredondarInicio = (d: Date | string) => new Date(Math.floor(ms(d) / Q) * Q).toISOString()
export const arredondarFim = (d: Date | string) => new Date(Math.ceil(ms(d) / Q) * Q).toISOString()
export const eQuarto = (d: Date | string) => ms(d) % Q === 0

/**
 * Início de um trabalho começado agora: o quarto atual (para baixo), mas nunca antes do fim do
 * último registo — os registos seguidos encadeiam (17:00–17:15 → 17:15–17:30), mesmo que esse fim
 * ainda esteja à frente do relógio por ter arredondado para cima.
 */
export function inicioSugerido(agora: Date | string, ultimoFim?: string | null) {
  const inicio = arredondarInicio(agora)
  return ultimoFim && ultimoFim > inicio ? ultimoFim : inicio
}

/** Fim de um trabalho terminado agora: o quarto seguinte (para cima) e, no mínimo, início + 15 min. */
export function fimSugerido(agora: Date | string, inicio: string) {
  const fim = arredondarFim(agora)
  const minimo = new Date(ms(inicio) + Q).toISOString()
  return fim > minimo ? fim : minimo
}

/** "08:00" (hora de Lisboa). */
export const horaDe = (iso: string) => fmtHora(iso)

/** Dia (Lisboa, "AAAA-MM-DD") + "HH:MM" → ISO. "24:00" é o fim do dia. */
export const isoDe = (dia: string, hhmm: string) => inputLisboaParaIso(`${dia}T${hhmm}`)

const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
const minutos = (h: string) => {
  const [a, b] = h.split(':').map(Number)
  return a * 60 + b
}

/** Horas de 15 em 15 min entre `de` e `ate` (inclusive), ex.: opcoesHoras('07:00', '09:00'). */
export function opcoesHoras(de = '00:00', ate = '23:45') {
  const out: string[] = []
  for (let m = minutos(de); m <= minutos(ate); m += QUARTO_MIN) out.push(hhmm(m))
  return out
}

/** Duração em minutos entre dois quartos (sempre múltiplo de 15). */
export const duracaoMin = (inicio: string, fim: string) => Math.round((ms(fim) - ms(inicio)) / 60_000)

/** Há sobreposição com outro registo da mesma pessoa? Registos em curso ocupam até ao infinito. */
export function sobrepoe(novo: { inicio: string; fim: string | null }, outros: { inicio: string; fim: string | null }[]) {
  const a0 = ms(novo.inicio)
  const a1 = novo.fim ? ms(novo.fim) : Infinity
  return outros.some((o) => {
    const b0 = ms(o.inicio)
    const b1 = o.fim ? ms(o.fim) : Infinity
    return a0 < b1 && b0 < a1
  })
}

/** Dias em que se pode lançar horas: hoje e os 7 anteriores ("AAAA-MM-DD", mais recente primeiro). */
export function diasPermitidos(agora = new Date()) {
  return Array.from({ length: DIAS_LANCAR_HORAS + 1 }, (_, i) => chaveDia(new Date(agora.getTime() - i * 864e5)))
}

/**
 * Formatadores de datas, horas, durações e números no idioma da interface.
 * Sempre na hora de Lisboa (o negócio é em Portugal). Uso: `const { f } = await getI18n()` ou `useI18n()`.
 */
import { LOCALE, type Idioma } from './config'

const TZ = 'Europe/Lisbon'
const cache = new Map<Idioma, ReturnType<typeof criar>>()

function criar(idioma: Idioma) {
  const loc = LOCALE[idioma]
  const data = new Intl.DateTimeFormat(loc, { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
  const dataHora = new Intl.DateTimeFormat(loc, {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  const hora = new Intl.DateTimeFormat(loc, { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
  const diaSemana = new Intl.DateTimeFormat(loc, { timeZone: TZ, weekday: 'short', day: '2-digit', month: '2-digit' })
  const diaMes = new Intl.DateTimeFormat(loc, { timeZone: TZ, day: '2-digit', month: 'short' })
  const euro = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
  const euroCent = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const euroCompacto = new Intl.NumberFormat(loc, { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 })
  const decimal1 = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 })
  const pct = new Intl.NumberFormat(loc, { maximumFractionDigits: 1 })
  const pctSinal = new Intl.NumberFormat(loc, { maximumFractionDigits: 1, signDisplay: 'exceptZero' })
  const vazio = '—'
  const quando = (iso: string | null | undefined, fmt: Intl.DateTimeFormat) => (iso ? fmt.format(new Date(iso)) : vazio)
  const finito = (v: number | null | undefined): v is number => v != null && Number.isFinite(v)

  return {
    /** "14/10/2026" */
    data: (iso: string | null | undefined) => quando(iso, data),
    /** "14/10/2026, 10:00" */
    dataHora: (iso: string | null | undefined) => quando(iso, dataHora),
    /** "10:00" */
    hora: (iso: string | null | undefined) => quando(iso, hora),
    /** "Wed 14/10" / "qua., 14/10" */
    diaSemana: (iso: string) => diaSemana.format(new Date(iso)),
    /** "14 Oct" / "14/out." (eixos dos gráficos) */
    diaMes: (iso: string) => diaMes.format(new Date(iso)),
    /** 135 → "2 h 15 min" (igual nos dois idiomas) */
    duracao: (minutos: number | null | undefined) => {
      if (minutos == null) return vazio
      const m = Math.max(0, Math.round(minutos))
      const h = Math.floor(m / 60)
      const r = m % 60
      if (h === 0) return `${r} min`
      return r === 0 ? `${h} h` : `${h} h ${r} min`
    },
    /** 12345 → "€12,345" / "12 345 €"; `cent` com cêntimos; `compacto` → "€18.4K" (eixos). */
    euro: (v: number | null | undefined, { cent = false, compacto = false } = {}) =>
      finito(v) ? (compacto ? euroCompacto : cent ? euroCent : euro).format(v) : vazio,
    /** 12.345 → "12.3%" / "12,3%"; `sinal` → "+12.3%". */
    pct: (v: number | null | undefined, { sinal = false } = {}) => (finito(v) ? `${(sinal ? pctSinal : pct).format(v)}%` : vazio),
    /** 12.5 → "12.5 h" / "12,5 h" */
    horas: (h: number | null | undefined) => (finito(h) ? `${decimal1.format(h)} h` : vazio),
    /** Número com no máximo 1 casa decimal. */
    numero: (v: number | null | undefined) => (finito(v) ? decimal1.format(v) : vazio),
  }
}

export type Formatadores = ReturnType<typeof criar>

export function formatadores(idioma: Idioma): Formatadores {
  let f = cache.get(idioma)
  if (!f) cache.set(idioma, (f = criar(idioma)))
  return f
}

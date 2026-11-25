// Formatação pt-PT (hora de Lisboa).
const TZ = 'Europe/Lisbon'

const data = new Intl.DateTimeFormat('pt-PT', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
const dataHora = new Intl.DateTimeFormat('pt-PT', {
  timeZone: TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const hora = new Intl.DateTimeFormat('pt-PT', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
const diaChave = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })

export const fmtData = (iso: string | null | undefined) => (iso ? data.format(new Date(iso)) : '—')
export const fmtDataHora = (iso: string | null | undefined) => (iso ? dataHora.format(new Date(iso)) : '—')
export const fmtHora = (iso: string | null | undefined) => (iso ? hora.format(new Date(iso)) : '—')

/** "AAAA-MM-DD" do dia em Lisboa — para agrupar registos por dia. */
export const chaveDia = (d: Date | string) => diaChave.format(new Date(d))

/** 135 → "2 h 15 min" */
export function fmtDuracao(minutos: number | null | undefined) {
  if (minutos == null) return '—'
  const m = Math.max(0, Math.round(minutos))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r} min`
  return r === 0 ? `${h} h` : `${h} h ${r} min`
}

export function minutosEntre(inicio: string, fim: string) {
  return Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 60000)
}

const partes = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function partesLisboa(ms: number) {
  const p = Object.fromEntries(partes.formatToParts(new Date(ms)).map((x) => [x.type, x.value]))
  return { y: +p.year, mo: +p.month, d: +p.day, h: +p.hour, mi: +p.minute }
}

/** ISO (UTC) → valor de <input type="datetime-local"> na hora de Lisboa. */
export function isoParaInputLisboa(iso: string) {
  const p = partesLisboa(new Date(iso).getTime())
  const z = (n: number) => String(n).padStart(2, '0')
  return `${p.y}-${z(p.mo)}-${z(p.d)}T${z(p.h)}:${z(p.mi)}`
}

/** "AAAA-MM-DDTHH:MM" em hora de Lisboa → ISO (UTC). Independente do fuso do servidor. */
export function inputLisboaParaIso(local: string) {
  const [d, t] = local.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [h, mi] = t.split(':').map(Number)
  const alvo = Date.UTC(y, mo - 1, da, h, mi)
  const desvio = (ms: number) => {
    const p = partesLisboa(ms)
    return Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi) - ms
  }
  let ts = alvo - desvio(alvo)
  ts = alvo - desvio(ts)
  return new Date(ts).toISOString()
}

const euro = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
const euroCent = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const euroCompacto = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', notation: 'compact', maximumFractionDigits: 1 })

/** 12345 → "12 345 €"; com `cent` → "15,50 €"; com `compacto` → "12,3 mil €" (eixos dos gráficos). */
export function fmtEuro(v: number | null | undefined, { cent = false, compacto = false } = {}) {
  if (v == null || !Number.isFinite(v)) return '—'
  return (compacto ? euroCompacto : cent ? euroCent : euro).format(v)
}

/** 12.345 → "12,3%"; com `sinal` → "+12,3%". */
export function fmtPct(v: number | null | undefined, { sinal = false } = {}) {
  if (v == null || !Number.isFinite(v)) return '—'
  const s = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1, signDisplay: sinal ? 'exceptZero' : 'auto' }).format(v)
  return `${s}%`
}

/** Horas decimais curtas para gráficos: 12.5 → "12,5 h". */
export const fmtHoras = (h: number | null | undefined) =>
  h == null ? '—' : `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(h)} h`

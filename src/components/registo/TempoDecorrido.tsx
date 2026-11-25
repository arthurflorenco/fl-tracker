'use client'
import { useEffect, useState } from 'react'
import { useI18n } from '@/i18n/client'
import { duracaoMin, fimSugerido, horaDe } from '@/lib/quartos'

/** Data atual, atualizada a cada `ms` (null até montar no browser — evita diferenças de hidratação). */
function useAgora(ms: number) {
  const [agora, setAgora] = useState<Date | null>(null)
  useEffect(() => {
    const tick = () => setAgora(new Date())
    tick()
    const t = setInterval(tick, ms)
    return () => clearInterval(t)
  }, [ms])
  return agora
}

const dois = (n: number) => String(n).padStart(2, '0')

/** "12:05" ou, a partir de uma hora, "1:02:05". */
function cronometro(segundos: number) {
  const h = Math.floor(segundos / 3600)
  const m = Math.floor((segundos % 3600) / 60)
  const s = segundos % 60
  return h ? `${h}:${dois(m)}:${dois(s)}` : `${dois(m)}:${dois(s)}`
}

/**
 * Cronómetro de um trabalho em curso, a contar desde que a pessoa carregou em Iniciar
 * (`comecou`). Só para o ecrã não parecer parado: o registo é sempre em quartos de hora
 * (ver `PrevisaoRegisto`). Com `desde`: "Desde 08:00 · 12:05".
 */
export function TempoDecorrido({ comecou, desde, className }: { comecou: string; desde?: string; className?: string }) {
  const agora = useAgora(1000)
  const { t } = useI18n()
  const texto = agora ? cronometro(Math.max(0, Math.floor((agora.getTime() - new Date(comecou).getTime()) / 1000))) : '—'
  return (
    <span className={className} suppressHydrationWarning>
      {desde ? t.cronometro.desde(horaDe(desde), texto) : texto}
    </span>
  )
}

/** O que fica gravado se terminar agora: "17:00 → 17:15 (15 min)" — fim no quarto seguinte. */
export function PrevisaoRegisto({ inicio, className }: { inicio: string; className?: string }) {
  const agora = useAgora(15_000)
  const { t, f } = useI18n()
  const fim = agora ? fimSugerido(agora, inicio) : null
  return (
    <span className={className} suppressHydrationWarning>
      {fim ? t.cronometro.seTerminarAgora(horaDe(inicio), horaDe(fim), f.duracao(duracaoMin(inicio, fim))) : '—'}
    </span>
  )
}

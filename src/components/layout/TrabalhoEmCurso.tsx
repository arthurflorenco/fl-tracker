'use client'
import Link from 'next/link'
import { TempoDecorrido } from '@/components/registo/TempoDecorrido'
import { useI18n } from '@/i18n/client'

/** Faixa fixa quando a pessoa tem um trabalho a decorrer — para nunca ficar esquecido. */
export function TrabalhoEmCurso({
  registo,
}: {
  registo: {
    id: string
    inicio: string
    criadoEm: string
    obraId: string
    obraCodigo: string
    etapa: string
    atividade: string | null
    elemento: string | null
  }
}) {
  const { t } = useI18n()
  return (
    <Link
      href={`/admin/obras/${registo.obraId}/registar`}
      className="no-print flex items-center justify-between gap-4 bg-accent px-5 py-3 text-[#fff] md:px-8"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="h-2 w-2 shrink-0 rounded-full bg-[#fff] [animation:hs-pulse_1.6s_ease-in-out_infinite]" />
        <span className="truncate text-[12px] font-semibold uppercase tracking-[1.5px]">
          {t.comum.obraCodigo(registo.obraCodigo)} · {registo.etapa}
          {registo.atividade ? ` · ${registo.atividade}` : ''}
          {registo.elemento ? ` · ${registo.elemento}` : ''}
        </span>
      </span>
      <TempoDecorrido comecou={registo.criadoEm} desde={registo.inicio} className="shrink-0 text-[13px] font-bold tabular-nums" />
    </Link>
  )
}

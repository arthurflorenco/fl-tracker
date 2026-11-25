import { getI18n } from '@/i18n/server'

export async function ProgressBar({ valor, label }: { valor: number; label?: string }) {
  const { t } = await getI18n()
  const v = Math.max(0, Math.min(100, valor))
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? t.ui.progresso}
      className="h-[3px] w-full bg-dark3"
    >
      <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${v}%` }} />
    </div>
  )
}

'use client'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n/client'

const star = 'absolute bg-[#fff] rounded-full pointer-events-none transition-opacity duration-400'
const cloud = 'absolute bg-[#fff] rounded-full pointer-events-none transition-opacity duration-400'

export default function ThemeSwitch() {
  const { theme, toggle } = useTheme()
  const light = theme === 'light'
  const { t } = useI18n()

  return (
    <label
      className="relative inline-block w-18 h-9 flex-shrink-0 cursor-pointer rounded-[36px]"
      title={light ? t.tema.escuro : t.tema.claro}
    >
      <input
        type="checkbox"
        checked={light}
        onChange={toggle}
        aria-label={light ? t.tema.mudarParaEscuro : t.tema.mudarParaClaro}
        className="absolute opacity-0 w-0 h-0"
      />
      <span
        className={cn(
          'absolute inset-0 rounded-[36px] overflow-hidden transition-colors duration-400 ease-in-out',
          light ? 'bg-[#54c5f8]' : 'bg-[#2b2b2b]',
        )}
      >
        <span
          className={cn(
            'absolute top-1 left-1 w-7 h-7 rounded-full z-2 [transition:transform_0.4s_cubic-bezier(0.81,-0.04,0.38,1.5),background-color_0.3s,box-shadow_0.3s]',
            light ? 'bg-[#f5c500] shadow-none translate-x-9' : 'bg-[#fff] shadow-[inset_-8px_2px_0_0_#2b2b2b] translate-x-0',
          )}
        />
        <span className={cn(star, 'w-[5px] h-[5px] top-[7px] right-[11px]', light ? 'opacity-0' : 'opacity-100')} />
        <span className={cn(star, 'w-1 h-1 top-[17px] right-[17px]', light ? 'opacity-0' : 'opacity-100')} />
        <span className={cn(star, 'w-[3px] h-[3px] top-6 right-[10px]', light ? 'opacity-0' : 'opacity-100')} />
        <span className={cn(cloud, 'w-6 h-6 bottom-[-4px] left-[9px]', light ? 'opacity-100' : 'opacity-0')} />
        <span className={cn(cloud, 'w-[15px] h-[15px] bottom-1 left-[3px]', light ? 'opacity-100' : 'opacity-0')} />
      </span>
    </label>
  )
}

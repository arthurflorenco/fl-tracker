/**
 * Logótipo do FL Tracker: um caixilho (moldura quadrada) com as letras F e L em barras.
 * Só retângulos, numa grelha de 100×100 — fácil de reproduzir no ícone (src/app/icon.svg)
 * e no PNG para iOS (src/app/apple-icon.png, gerado por scripts/gerar-icone.py).
 */

/** Moldura (caixilho) e letra F, na cor base. */
const BASE_PATHS = [
  // Moldura: quadrado exterior menos o interior (evenodd).
  'M0 0H100V100H0Z M12 12V88H88V12Z',
  // F
  'M26 26H58V36H36V45H52V54H36V74H26Z',
]
/** Letra L, na cor de destaque. */
const ACCENT_PATHS = ['M62 26H72V64H80V74H62Z']

const ICON_VIEWBOX = '0 0 100 100'
const FULL_VIEWBOX = '0 0 360 100'

const THEME_FILLS = {
  dark: { base: '#FFFFFF', accent: '#3CC2B0' }, // data-theme="dark"
  light: { base: '#2B2B2B', accent: '#12806F' }, // data-theme="light"
} as const

function Marca({ base, accent, crop }: { base: string; accent: string; crop: 'icon' | 'full' }) {
  return (
    <>
      {BASE_PATHS.map((d, i) => (
        <path key={i} fill={base} fillRule="evenodd" d={d} />
      ))}
      {ACCENT_PATHS.map((d, i) => (
        <path key={`a${i}`} fill={accent} d={d} />
      ))}
      {crop === 'full' && (
        <text x="122" y="64" fill={base} style={{ font: '700 34px var(--font-sans), system-ui, sans-serif', letterSpacing: '1.5px' }}>
          FL TRACKER
        </text>
      )}
    </>
  )
}

export interface LogoProps {
  /** Só o ícone, ou o ícone com o nome "FL TRACKER". */
  crop?: 'icon' | 'full'
  /** 'auto' (padrão) segue o [data-theme] do <html>; 'dark'/'light' fixam a variante (ex.: etiqueta impressa). */
  theme?: 'auto' | 'dark' | 'light'
  /** Tudo numa só cor (`currentColor`) — para marcas de água. */
  mono?: boolean
  className?: string
  style?: React.CSSProperties
  /** Nome acessível. Sem título, o logótipo é decorativo (aria-hidden). */
  title?: string
}

export default function Logo({ crop = 'full', theme = 'auto', mono = false, className, style, title }: LogoProps) {
  return (
    <svg
      viewBox={crop === 'full' ? FULL_VIEWBOX : ICON_VIEWBOX}
      className={className}
      style={style}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {mono ? (
        <Marca base="currentColor" accent="currentColor" crop={crop} />
      ) : theme === 'auto' ? (
        <>
          <g className="logo-theme-dark">
            <Marca {...THEME_FILLS.dark} crop={crop} />
          </g>
          <g className="logo-theme-light">
            <Marca {...THEME_FILLS.light} crop={crop} />
          </g>
        </>
      ) : (
        <Marca {...THEME_FILLS[theme]} crop={crop} />
      )}
    </svg>
  )
}

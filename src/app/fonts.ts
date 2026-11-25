import localFont from 'next/font/local'

// `preload: false` — não pré-carregamos as 7 faces (~1 MB de .otf a competir
// com o LCP no mobile). Com `display: 'swap'` o texto pinta já na fonte de
// sistema e troca para Poppins quando esta carrega; o `adjustFontFallback`
// (ligado por omissão em localFont) ajusta as métricas do fallback para o
// swap não provocar CLS.
export const poppins = localFont({
  src: [
    { path: './fonts/Poppins-ExtraLight.otf', weight: '200', style: 'normal' },
    { path: './fonts/Poppins-ExtraLightItalic.otf', weight: '200', style: 'italic' },
    { path: './fonts/Poppins-Light.otf', weight: '300', style: 'normal' },
    { path: './fonts/Poppins-LightItalic.otf', weight: '300', style: 'italic' },
    { path: './fonts/Poppins-Regular.otf', weight: '400', style: 'normal' },
    { path: './fonts/Poppins-Bold.otf', weight: '700', style: 'normal' },
    { path: './fonts/Poppins-BoldItalic.otf', weight: '700', style: 'italic' },
  ],
  variable: '--font-sans',
  display: 'swap',
  preload: false,
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
})

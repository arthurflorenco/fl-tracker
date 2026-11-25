import type { MetadataRoute } from 'next'

// PWA instalável (Fase 1). Service worker e modo offline ficam para a fase de campo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FL Tracker',
    short_name: 'FL Tracker',
    description: 'Acompanhamento de obras para empresas de caixilharia: tempo, etapas, notas e fotografias.',
    start_url: '/admin',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#1C1C1E',
    theme_color: '#1C1C1E',
    lang: 'pt-PT',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}

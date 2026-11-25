/** Idiomas da interface. O inglês é o padrão; a escolha fica num cookie (1 ano). */
export const IDIOMAS = ['en', 'pt'] as const
export type Idioma = (typeof IDIOMAS)[number]
export const IDIOMA_PADRAO: Idioma = 'en'
export const COOKIE_IDIOMA = 'fl-idioma'

export const eIdioma = (v: unknown): v is Idioma => (IDIOMAS as readonly unknown[]).includes(v)

/** Locale do Intl para datas e números: inglês europeu (dd/mm/aaaa, €) e português de Portugal. */
export const LOCALE: Record<Idioma, string> = { en: 'en-GB', pt: 'pt-PT' }

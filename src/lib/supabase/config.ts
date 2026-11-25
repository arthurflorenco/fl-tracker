/** Supabase só fica ativo quando as variáveis existem (.env.local). Até lá, a app usa src/lib/mock. */
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
export const supabaseAtivo = Boolean(supabaseUrl && supabaseAnonKey)

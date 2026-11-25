/**
 * Modo de demonstração (proposta ao cliente): guia interativo na primeira visita, faixa
 * "dados fictícios" e "Repor dados". No site publicado (build de produção) está SEMPRE ligado,
 * independentemente das variáveis do alojamento. Só em desenvolvimento se desliga, com
 * NEXT_PUBLIC_MODO_DEMO=0 no .env.local. Para lançar a versão real, mudar esta linha.
 */
export const MODO_DEMO = process.env.NODE_ENV !== 'development' || process.env.NEXT_PUBLIC_MODO_DEMO !== '0'

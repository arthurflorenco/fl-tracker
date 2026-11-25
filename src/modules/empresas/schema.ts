/**
 * Empresa (tenant). A plataforma serve várias empresas na mesma base de dados;
 * cada linha de cada tabela tem `empresaId` e ninguém vê dados de outra empresa
 * (na app: `mesmaEmpresa`/`podeVerObra` em src/lib/permissions.ts; no Postgres: RLS
 * restritiva `empresa_id = minha_empresa()` em supabase/migrations/0005_empresas.sql).
 */
export interface Empresa {
  id: string
  nome: string
  criadoEm: string
}

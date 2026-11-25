// Aplica supabase/migrations num Postgres em WASM (PGlite) e testa as regras RLS principais.
// Cada verificação é uma asserção: se uma regra falhar, o processo termina com código 1 (a CI fica vermelha).
// Uso: npm run db:verificar. Não substitui testar num projeto Supabase real.
import { PGlite } from '@electric-sql/pglite'
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto'
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist'
import { readdirSync, readFileSync } from 'node:fs'

const db = new PGlite({ extensions: { pgcrypto, btree_gist } })
let falhas = 0
const ok = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`)
  if (!cond) falhas++
}
const linhas = async (sql) => (await db.query(sql)).rows
const n = async (sql) => (await db.query(sql)).rows[0].n
/** Espera um erro (ex.: violação de regra). Devolve true se o SQL falhou. */
const falha = async (sql) => {
  try {
    await db.exec(sql)
    return false
  } catch {
    return true
  }
}

// ─── Ambiente mínimo do Supabase: auth.uid(), storage ──────────────────────
await db.exec(`
  create schema extensions; create schema auth; create schema storage;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
`)
const migracoes = readdirSync(new URL('../supabase/migrations/', import.meta.url)).sort()
for (const f of migracoes) await db.exec(readFileSync(new URL('../supabase/migrations/' + f, import.meta.url), 'utf8'))
ok(true, `migrações aplicadas: ${migracoes.join(', ')}`)

await db.exec(`create role autenticado; grant usage on schema public, auth, extensions to autenticado;
  grant all on all tables in schema public to autenticado; grant execute on all functions in schema public, auth to autenticado;`)

/** Pedido de um utilizador (RLS ativa). */
const como = (uid) => db.exec(`set role autenticado; select set_config('test.uid', '${uid}', false);`)
/** Tarefa do servidor (sem RLS, sem utilizador). */
const servidor = () => db.exec(`reset role; select set_config('test.uid', '', false);`)

// ─── Dados: duas empresas ──────────────────────────────────────────────────
const A = '0000000a-0000-0000-0000-000000000000'
const B = '0000000b-0000-0000-0000-000000000000'
const adminA = '0000000a-0000-0000-0000-000000000001'
const montA = '0000000a-0000-0000-0000-000000000002'
const adminB = '0000000b-0000-0000-0000-000000000001'
const eqA = '0000000a-0000-0000-0000-0000000000e1'
const eqA2 = '0000000a-0000-0000-0000-0000000000e2'
const eqB = '0000000b-0000-0000-0000-0000000000e1'
const obraA = '0000000a-0000-0000-0000-0000000000b1'
const obraA2 = '0000000a-0000-0000-0000-0000000000b2'
const obraB = '0000000b-0000-0000-0000-0000000000b1'
const etapaA = '0000000a-0000-0000-0000-0000000000c1'

await servidor()
await db.exec(`
  insert into empresas (id, nome) values ('${A}', 'Empresa A'), ('${B}', 'Empresa B');
  insert into auth.users values ('${adminA}'), ('${montA}'), ('${adminB}');
  insert into equipas (id, empresa_id, nome, tipo) values
    ('${eqA}', '${A}', 'Montagem A', 'montagem'), ('${eqA2}', '${A}', 'Montagem A2', 'montagem'), ('${eqB}', '${B}', 'Montagem B', 'montagem');
  insert into perfis (id, empresa_id, nome, email, papel, equipa_id) values
    ('${adminA}', '${A}', 'Ana', 'ana@a.example', 'admin', null),
    ('${montA}', '${A}', 'João', 'joao@a.example', 'montagem', '${eqA}'),
    ('${adminB}', '${B}', 'Beatriz', 'beatriz@b.example', 'admin', null);
  insert into clientes (id, empresa_id, nome) values ('0000000a-0000-0000-0000-0000000000f1', '${A}', 'Cliente A'), ('0000000b-0000-0000-0000-0000000000f1', '${B}', 'Cliente B');
  insert into projetos (id, empresa_id, referencia, titulo, cliente_id, responsavel_id, estado) values
    ('0000000a-0000-0000-0000-0000000000d1', '${A}', 'P-1', 'T', '0000000a-0000-0000-0000-0000000000f1', '${adminA}', 'aprovado'),
    ('0000000a-0000-0000-0000-0000000000d2', '${A}', 'P-2', 'T', '0000000a-0000-0000-0000-0000000000f1', '${adminA}', 'aprovado'),
    ('0000000b-0000-0000-0000-0000000000d1', '${B}', 'P-1', 'T', '0000000b-0000-0000-0000-0000000000f1', '${adminB}', 'aprovado');
  insert into obras (id, empresa_id, codigo, projeto_id, cliente_id, titulo) values
    ('${obraA}', '${A}', '2026-001', '0000000a-0000-0000-0000-0000000000d1', '0000000a-0000-0000-0000-0000000000f1', 'Obra A'),
    ('${obraA2}', '${A}', '2026-002', '0000000a-0000-0000-0000-0000000000d2', '0000000a-0000-0000-0000-0000000000f1', 'Obra A2 (outra equipa)'),
    ('${obraB}', '${B}', '2026-001', '0000000b-0000-0000-0000-0000000000d1', '0000000b-0000-0000-0000-0000000000f1', 'Obra B');
  insert into obra_equipas (empresa_id, obra_id, equipa_id) values ('${A}', '${obraA}', '${eqA}'), ('${A}', '${obraA2}', '${eqA2}'), ('${B}', '${obraB}', '${eqB}');
  insert into obra_etapas (id, empresa_id, obra_id, etapa_modelo_id, nome, ordem)
    select '${etapaA}', '${A}', '${obraA}', id, nome, ordem from etapas_modelo where empresa_id = '${A}' and ordem = 8;
  insert into custos_hora (empresa_id, perfil_id, valor, desde, autor_id) values ('${A}', '${montA}', 14, '2026-01-01', '${adminA}');
  insert into custos_diretos (empresa_id, obra_id, tipo, descricao, valor, autor_id) values ('${A}', '${obraA}', 'materiais', 'Perfis', 1200, '${adminA}');
  insert into obra_financeiro (empresa_id, obra_id, valor_contratado) values ('${A}', '${obraA}', 12345);
`)
ok((await n(`select count(*)::int n from etapas_modelo where empresa_id = '${A}'`)) === 10, 'empresa nova nasce com as 10 etapas sugeridas')
ok((await n(`select count(*)::int n from obras where codigo = '2026-001'`)) === 2, 'o mesmo código de obra pode existir em duas empresas')

const registo = (inicio, fim) =>
  `insert into registos_tempo (client_id, obra_id, obra_etapa_id, perfil_id, inicio, fim)
   values (gen_random_uuid(), '${obraA}', '${etapaA}', '${montA}', ${inicio}, ${fim})`

// ─── Multi-empresa ─────────────────────────────────────────────────────────
console.log('\nMulti-empresa')
await como(adminB)
ok((await n(`select count(*)::int n from obras`)) === 1, 'admin da empresa B só vê a obra da sua empresa')
ok((await n(`select count(*)::int n from obras where id = '${obraA}'`)) === 0, 'admin B não lê a obra A, nem pedindo pelo id')
ok((await n(`select count(*)::int n from perfis`)) === 1, 'admin B só vê as pessoas da sua empresa')
ok((await n(`select count(*)::int n from historico where empresa_id = '${A}'`)) === 0, 'admin B não vê o histórico da empresa A')
ok((await n(`select count(*)::int n from custos_diretos`)) === 0, 'admin B não vê custos da empresa A')
ok(
  await falha(`insert into equipas (empresa_id, nome, tipo) values ('${A}', 'Intrusa', 'montagem')`),
  'admin B não cria linhas na empresa A',
)
ok((await linhas(`update obras set titulo = 'x' where id = '${obraA}' returning id`)).length === 0, 'admin B não altera a obra A')
await servidor()
ok(
  await falha(`insert into obra_equipas (empresa_id, obra_id, equipa_id) values ('${A}', '${obraA}', '${eqB}')`),
  'chave composta: obra da empresa A não liga a equipa da empresa B (nem pelo servidor)',
)
await db.exec(`insert into clientes (id, empresa_id, nome) values ('0000000a-0000-0000-0000-0000000000f9', '${A}', 'Cliente solto')`)
ok(
  await falha(`update clientes set empresa_id = '${B}' where id = '0000000a-0000-0000-0000-0000000000f9'`),
  'a empresa de uma linha não muda (nem pelo servidor)',
)

// ─── Equipas de campo ──────────────────────────────────────────────────────
console.log('\nCampo (montador da empresa A)')
await como(montA)
ok((await n(`select count(*)::int n from obras`)) === 1, 'montador só vê a obra da sua equipa (não a de outra equipa)')
ok(
  (await n(`select count(*)::int n from custos_hora`)) + (await n(`select count(*)::int n from custos_diretos`)) === 0,
  'montador não vê custos',
)
ok((await n(`select count(*)::int n from obra_financeiro`)) === 0, 'montador não vê o valor contratado')
ok(
  (await n(`select count(*)::int n from historico where entidade in ('custos_hora', 'custos_diretos', 'obra_financeiro')`)) === 0,
  'montador não vê o histórico de custos',
)
ok(await falha(`update obra_etapas set nome = 'Renomeada' where id = '${etapaA}'`), 'montador não muda o nome da etapa')
await db.exec(`update obra_etapas set estado = 'em_curso' where id = '${etapaA}'`)
ok((await n(`select count(*)::int n from obra_etapas where estado = 'em_curso'`)) === 1, 'montador muda o estado da etapa')
ok(await falha(`update obra_etapas set horas_previstas = 99`), 'montador não muda as horas previstas')

// ─── Registos de tempo ─────────────────────────────────────────────────────
console.log('\nRegistos de tempo')
await db.exec(registo(`date_trunc('hour', now()) - interval '3 hours'`, `date_trunc('hour', now()) - interval '2 hours'`))
await db.exec(`insert into registos_tempo (client_id, obra_id, obra_etapa_id, perfil_id, inicio, fim, criado_em)
  values (gen_random_uuid(), '${obraA}', '${etapaA}', '${montA}', date_trunc('hour', now()) - interval '2 hours', date_trunc('hour', now()) - interval '1 hour', now() + interval '1 year')`)
ok(
  (await n(`select count(*)::int n from registos_tempo where criado_em > now() + interval '1 minute'`)) === 0,
  'criado_em no futuro é ignorado (fica a hora do servidor)',
)
ok(await falha(`update registos_tempo set criado_em = now() + interval '1 year'`), 'criado_em não pode ser reescrito')
ok(await falha(`update registos_tempo set perfil_id = '${adminA}'`), 'o dono do registo não muda')
const u1 = await linhas(`update registos_tempo set nota = 'ok' returning id`)
ok(u1.length === 2, 'montador edita os seus registos recentes')
ok(
  await falha(registo(`date_trunc('hour', now()) - interval '150 minutes'`, `date_trunc('hour', now()) - interval '90 minutes'`)),
  'registos sobrepostos da mesma pessoa são rejeitados',
)
ok(await falha(registo(`'2026-10-01 08:07+00'`, `'2026-10-01 09:00+00'`)), 'horas fora do quarto de hora (8:07) são rejeitadas')
ok((await linhas(`delete from registos_tempo returning id`)).length === 0, 'ninguém apaga registos (sem política de DELETE)')
await servidor()
await db.exec(`update registos_tempo set criado_em = now() - interval '25 hours'`)
await como(montA)
ok(
  (await linhas(`update registos_tempo set nota = 'tarde' returning id`)).length === 0,
  'depois de 24 h o registo fica fechado para o autor',
)
await como(adminA)
ok(
  (await linhas(`update registos_tempo set nota = 'corrigido' returning id`)).length === 2,
  'a administração da mesma empresa ainda corrige',
)

// ─── Notas ─────────────────────────────────────────────────────────────────
console.log('\nNotas')
await servidor()
await db.exec(`insert into notas (empresa_id, client_id, obra_id, tipo, texto, autor_id, criado_em)
  values ('${A}', gen_random_uuid(), '${obraA}', 'problema', 'x', '${montA}', now() - interval '2 days')`)
await como(montA)
ok(await falha(`update notas set texto = 'y'`), 'nota com mais de 24 h não pode ser reescrita pelo autor')

// ─── Responsáveis por obra ─────────────────────────────────────────────────
console.log('\nResponsáveis por obra')
await como(adminA)
await db.exec(`insert into obra_responsaveis (obra_id, perfil_id) values ('${obraA}', '${adminA}'), ('${obraA}', '${montA}')`)
ok((await n(`select count(*)::int n from obra_responsaveis where obra_id = '${obraA}'`)) === 2, 'uma obra pode ter vários responsáveis')
ok(
  await falha(`insert into obra_responsaveis (obra_id, perfil_id) values ('${obraA}', '${adminA}')`),
  'a mesma pessoa não fica duas vezes como responsável ativo',
)
await db.exec(`update obra_responsaveis set removido_em = now() where perfil_id = '${montA}'`)
await db.exec(`insert into obra_responsaveis (obra_id, perfil_id) values ('${obraA}', '${montA}')`)
ok(true, 'remover marca removido_em; a pessoa pode voltar a ser responsável')
ok(
  await falha(`insert into obra_responsaveis (obra_id, perfil_id) values ('${obraA}', '${adminB}')`),
  'responsável de outra empresa é rejeitado',
)
await como(montA)
ok(
  await falha(`insert into obra_responsaveis (obra_id, perfil_id) values ('${obraA}', '${montA}')`),
  'equipas de campo não definem responsáveis',
)

await servidor()
console.log(falhas ? `\n${falhas} verificação(ões) falharam.` : '\nTodas as verificações passaram.')
process.exit(falhas ? 1 : 0)

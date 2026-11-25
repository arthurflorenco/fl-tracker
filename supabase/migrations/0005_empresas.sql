-- ═══════════════════════════════════════════════════════════════════════════
-- 0005 — Multi-empresa (multi-tenant)
--
-- Várias empresas partilham a mesma base de dados. Cada tabela ganha `empresa_id`
-- e há três camadas de proteção:
--   1. RLS RESTRITIVA em todas as tabelas: `empresa_id = minha_empresa()`.
--      Políticas restritivas juntam-se às outras com AND: mesmo que uma política
--      de papel deixe passar (ex.: e_admin()), a linha de outra empresa fica de fora.
--   2. Chaves estrangeiras COMPOSTAS (coluna, empresa_id): uma obra da empresa A
--      não pode apontar para um cliente, equipa ou pessoa da empresa B, nem por
--      engano de uma tarefa do servidor que ignora a RLS.
--   3. `empresa_id` tem DEFAULT minha_empresa(): a app não precisa de o enviar.
--
-- Espelha `mesmaEmpresa`/`podeVerObra` em src/lib/permissions.ts.
-- ═══════════════════════════════════════════════════════════════════════════

create table empresas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  criado_em timestamptz not null default now()
);

-- Dados que já existam (antes da 0005) passam para uma empresa inicial ("backfill").
insert into empresas (id, nome) values ('00000000-0000-0000-0000-0000000000e1', 'Empresa inicial');

-- ─── 1. Coluna empresa_id em todas as tabelas ──────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'equipas', 'perfis', 'clientes', 'projetos', 'obras', 'obra_equipas', 'etapas_modelo', 'atividades',
    'obra_etapas', 'elementos', 'registos_tempo', 'notas', 'fotografias', 'historico', 'ids_externos',
    'sincronizacoes', 'custos_hora', 'custos_diretos', 'obra_financeiro'
  ] loop
    execute format('alter table %I add column empresa_id uuid references empresas (id)', t);
    execute format('update %I set empresa_id = %L', t, '00000000-0000-0000-0000-0000000000e1');
    execute format('alter table %I alter column empresa_id set not null', t);
    execute format('create index on %I (empresa_id)', t);
  end loop;
end $$;

-- A empresa de quem está a fazer o pedido (null para anónimos e tarefas do servidor).
create function public.minha_empresa() returns uuid
language sql stable security definer set search_path = public as $$
  select empresa_id from perfis where id = auth.uid() and ativo
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'equipas', 'perfis', 'clientes', 'projetos', 'obras', 'obra_equipas', 'etapas_modelo', 'atividades',
    'obra_etapas', 'elementos', 'registos_tempo', 'notas', 'fotografias', 'ids_externos',
    'sincronizacoes', 'custos_hora', 'custos_diretos', 'obra_financeiro'
  ] loop
    execute format('alter table %I alter column empresa_id set default minha_empresa()', t);
  end loop;
end $$;

-- ─── 2. Únicos por empresa ─────────────────────────────────────────────────
-- Duas empresas podem ter a obra "2026-014" e o projeto "P-2026-009".
alter table projetos drop constraint projetos_referencia_key, add unique (empresa_id, referencia);
alter table obras drop constraint obras_codigo_key, add unique (empresa_id, codigo);

-- ─── 3. Chaves estrangeiras compostas ──────────────────────────────────────
-- Cada tabela "pai" ganha unique (id, empresa_id) para poder ser referenciada pelo par.
do $$
declare t text;
begin
  foreach t in array array['equipas', 'perfis', 'clientes', 'projetos', 'obras', 'etapas_modelo', 'atividades', 'obra_etapas', 'elementos', 'notas']
  loop
    execute format('alter table %I add constraint %I unique (id, empresa_id)', t, t || '_id_empresa');
  end loop;
end $$;

-- "filho.coluna > pai": filho(coluna, empresa_id) references pai(id, empresa_id).
-- Colunas opcionais (null) não são verificadas (MATCH SIMPLE), como antes.
do $$
declare
  r text;
  filho text; coluna text; pai text;
begin
  foreach r in array array[
    'perfis.equipa_id>equipas',
    'clientes.perfil_id>perfis',
    'projetos.cliente_id>clientes', 'projetos.responsavel_id>perfis',
    'obras.projeto_id>projetos', 'obras.cliente_id>clientes',
    'obra_equipas.obra_id>obras', 'obra_equipas.equipa_id>equipas',
    'atividades.etapa_modelo_id>etapas_modelo',
    'obra_etapas.obra_id>obras', 'obra_etapas.etapa_modelo_id>etapas_modelo',
    'elementos.obra_id>obras',
    'registos_tempo.obra_id>obras', 'registos_tempo.obra_etapa_id>obra_etapas', 'registos_tempo.perfil_id>perfis',
    'registos_tempo.elemento_id>elementos', 'registos_tempo.atividade_id>atividades', 'registos_tempo.equipa_id>equipas',
    'notas.obra_id>obras', 'notas.autor_id>perfis', 'notas.elemento_id>elementos', 'notas.obra_etapa_id>obra_etapas',
    'fotografias.obra_id>obras', 'fotografias.autor_id>perfis', 'fotografias.nota_id>notas',
    'fotografias.elemento_id>elementos', 'fotografias.obra_etapa_id>obra_etapas',
    'custos_hora.perfil_id>perfis',
    'custos_diretos.obra_id>obras',
    'obra_financeiro.obra_id>obras'
  ] loop
    filho := split_part(split_part(r, '>', 1), '.', 1);
    coluna := split_part(split_part(r, '>', 1), '.', 2);
    pai := split_part(r, '>', 2);
    execute format('alter table %I add constraint %I foreign key (%I, empresa_id) references %I (id, empresa_id)',
      filho, filho || '_' || coluna || '_mesma_empresa', coluna, pai);
  end loop;
end $$;

-- ─── 4. RLS restritiva: só a minha empresa ─────────────────────────────────
-- `(select minha_empresa())` é calculado uma vez por consulta, não uma vez por linha.
do $$
declare t text;
begin
  foreach t in array array[
    'equipas', 'perfis', 'clientes', 'projetos', 'obras', 'obra_equipas', 'etapas_modelo', 'atividades',
    'obra_etapas', 'elementos', 'registos_tempo', 'notas', 'fotografias', 'historico', 'ids_externos',
    'sincronizacoes', 'custos_hora', 'custos_diretos', 'obra_financeiro'
  ] loop
    execute format(
      'create policy mesma_empresa on %I as restrictive for all
         using (empresa_id = (select minha_empresa())) with check (empresa_id = (select minha_empresa()))', t);
  end loop;
end $$;

alter table empresas enable row level security;
create policy ler on empresas for select using (id = (select minha_empresa()));

-- ─── 5. Funções existentes passam a conhecer a empresa ─────────────────────
-- Storage (fotografias) não tem empresa_id: depende de pode_ver_obra, que agora a verifica.
create or replace function public.pode_ver_obra(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from obras where id = p_obra and empresa_id = minha_empresa())
    and case
      when meu_papel() in ('admin', 'orcamentacao', 'compras') then true
      when meu_papel() in ('fabricacao', 'montagem') then exists (
        select 1 from obra_equipas oe join perfis p on p.equipa_id = oe.equipa_id
        where oe.obra_id = p_obra and p.id = auth.uid())
      else false
    end
$$;

-- O histórico fica na empresa da linha alterada.
create or replace function public.registar_historico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_obra uuid;
  v_id text;
begin
  v_id := coalesce(to_jsonb(new) ->> 'id', concat_ws(':', to_jsonb(new) ->> 'obra_id', to_jsonb(new) ->> 'equipa_id'));
  v_obra := coalesce((to_jsonb(new) ->> 'obra_id'), (to_jsonb(old) ->> 'obra_id'))::uuid;
  if tg_table_name = 'obras' then v_obra := v_id::uuid; end if;

  insert into historico (empresa_id, entidade, entidade_id, obra_id, acao, antes, depois, autor_id, motivo, origem)
  values (
    (to_jsonb(new) ->> 'empresa_id')::uuid,
    tg_table_name,
    v_id,
    v_obra,
    case tg_op when 'INSERT' then 'criar' else 'alterar' end,
    case when tg_op = 'UPDATE' then to_jsonb(old) end,
    to_jsonb(new),
    auth.uid(),
    nullif(current_setting('app.motivo', true), ''),
    coalesce(nullif(current_setting('app.origem', true), '')::origem, 'manual')
  );
  return new;
end $$;

-- A empresa de uma linha nunca muda.
create function public.empresa_imutavel() returns trigger
language plpgsql as $$
begin
  if new.empresa_id is distinct from old.empresa_id then
    raise exception 'A empresa de um registo não pode ser alterada.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'equipas', 'perfis', 'clientes', 'projetos', 'obras', 'obra_equipas', 'etapas_modelo', 'atividades',
    'obra_etapas', 'elementos', 'registos_tempo', 'notas', 'fotografias', 'custos_hora', 'custos_diretos', 'obra_financeiro'
  ] loop
    execute format('create trigger empresa_imutavel before update on %I for each row execute function empresa_imutavel()', t);
  end loop;
end $$;

-- ─── 6. Empresa nova já nasce com as etapas sugeridas ─────────────────────
create function public.etapas_iniciais() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into etapas_modelo (empresa_id, nome, ordem, ativa, visivel_cliente)
  select new.id, nome, ordem, ativa, visivel_cliente from (values
    ('Orçamentação', 1, true, true), ('Medição', 2, true, true), ('Projeto e especificação', 3, true, true),
    ('Pedidos a fornecedores', 4, true, false), ('Receção de materiais', 5, true, false), ('Fabricação', 6, true, true),
    ('Preparação e expedição', 7, true, true), ('Montagem', 8, true, true), ('Verificação final', 9, true, true),
    ('Pós-venda', 10, false, true)
  ) as e (nome, ordem, ativa, visivel_cliente);
  return new;
end $$;
create trigger etapas_iniciais after insert on empresas for each row execute function etapas_iniciais();

revoke execute on function public.minha_empresa() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.minha_empresa() to authenticated;
  end if;
end $$;

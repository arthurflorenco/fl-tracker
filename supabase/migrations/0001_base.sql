-- ═══════════════════════════════════════════════════════════════════════════
-- FL Tracker — esquema base (Fase 1, preparado para as fases seguintes)
-- Ainda NÃO aplicado. Aplicar com `supabase db push` quando o projeto existir.
-- Espelha os tipos em src/modules/*/schema.ts e as regras em src/lib/permissions.ts.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto with schema extensions;

-- ─── Tipos ─────────────────────────────────────────────────────────────────
create type papel as enum ('admin', 'orcamentacao', 'compras', 'fabricacao', 'montagem', 'pos_venda', 'cliente');
create type tipo_equipa as enum ('escritorio', 'fabricacao', 'montagem');
create type estado_projeto as enum ('pedido', 'medicao', 'proposta', 'em_revisao', 'aprovado', 'recusado');
create type estado_obra as enum ('ativa', 'suspensa', 'concluida', 'arquivada');
create type estado_etapa as enum ('por_iniciar', 'em_curso', 'bloqueada', 'concluida');
create type tipo_elemento as enum ('janela', 'porta', 'porta_correr', 'vidro', 'estore', 'pergola', 'outro');
create type estado_elemento as enum ('por_fabricar', 'em_fabricacao', 'fabricado', 'expedido', 'montado', 'verificado');
create type tipo_nota as enum ('observacao', 'problema', 'atraso', 'material_em_falta', 'alteracao_solicitada', 'nao_conformidade', 'conclusao_etapa');
create type estado_sync as enum ('sincronizado', 'pendente', 'erro');
create type origem as enum ('manual', 'ia', 'sync', 'importacao');

-- ─── Pessoas e equipas ─────────────────────────────────────────────────────
create table equipas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  tipo tipo_equipa not null,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- Um perfil por utilizador do Supabase Auth. Nunca contas partilhadas.
create table perfis (
  id uuid primary key references auth.users (id) on delete restrict,
  nome text not null,
  email text not null unique,
  papel papel not null,
  equipa_id uuid references equipas (id),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ─── Clientes, projetos e obras ────────────────────────────────────────────
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  nif text,
  -- Fase 2 (portal): conta do cliente, criada por convite.
  perfil_id uuid references perfis (id),
  criado_em timestamptz not null default now()
);

create table projetos (
  id uuid primary key default gen_random_uuid(),
  referencia text not null unique,
  titulo text not null,
  cliente_id uuid not null references clientes (id),
  morada text,
  estado estado_projeto not null default 'pedido',
  valor_proposta numeric(12, 2),
  responsavel_id uuid not null references perfis (id),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table obras (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,                     -- "2026-014"
  projeto_id uuid not null unique references projetos (id),
  cliente_id uuid not null references clientes (id),
  titulo text not null,
  morada text,
  estado estado_obra not null default 'ativa',
  qr_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  data_inicio timestamptz not null default now(),
  data_prevista_fim timestamptz,
  criado_em timestamptz not null default now()
);

create table obra_equipas (
  obra_id uuid not null references obras (id),
  equipa_id uuid not null references equipas (id),
  primary key (obra_id, equipa_id)
);

-- ─── Etapas (configuráveis) e atividades ───────────────────────────────────
create table etapas_modelo (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ordem int not null,
  ativa boolean not null default true,
  visivel_cliente boolean not null default true
);

create table atividades (
  id uuid primary key default gen_random_uuid(),
  etapa_modelo_id uuid not null references etapas_modelo (id),
  nome text not null,
  ativa boolean not null default true
);

-- Cópia das etapas para cada obra (o modelo pode mudar sem afetar obras antigas).
create table obra_etapas (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras (id),
  etapa_modelo_id uuid not null references etapas_modelo (id),
  nome text not null,
  ordem int not null,
  estado estado_etapa not null default 'por_iniciar',
  visivel_cliente boolean not null default true,
  data_prevista timestamptz,
  iniciada_em timestamptz,
  concluida_em timestamptz
);
create index on obra_etapas (obra_id);

-- ─── Elementos ─────────────────────────────────────────────────────────────
create table elementos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras (id),
  referencia text not null,                         -- "J01"
  tipo tipo_elemento not null,
  descricao text not null,
  divisao text,
  estado estado_elemento not null default 'por_fabricar',
  qr_ativo boolean not null default false,          -- QR secundário só quando necessário
  qr_token text not null unique default encode(extensions.gen_random_bytes(12), 'hex'),
  unique (obra_id, referencia)
);

-- ─── Execução: tempos, notas, fotografias ──────────────────────────────────
create table registos_tempo (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique,                   -- gerado no dispositivo (idempotência offline)
  obra_id uuid not null references obras (id),
  obra_etapa_id uuid not null references obra_etapas (id),
  atividade_id uuid references atividades (id),
  elemento_id uuid references elementos (id),
  perfil_id uuid not null references perfis (id),
  equipa_id uuid references equipas (id),
  inicio timestamptz not null,
  fim timestamptz,
  duracao_min int generated always as (
    case when fim is null then null else (extract(epoch from (fim - inicio)) / 60)::int end
  ) stored,
  nota text,
  origem origem not null default 'manual',
  estado_sync estado_sync not null default 'sincronizado',
  criado_em timestamptz not null default now(),
  arquivado_em timestamptz,
  check (fim is null or fim > inicio)
);
create index on registos_tempo (obra_id);
create index on registos_tempo (perfil_id, inicio desc);
-- Só um trabalho em curso por pessoa.
create unique index um_registo_em_curso on registos_tempo (perfil_id) where fim is null and arquivado_em is null;

create table notas (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique,
  obra_id uuid not null references obras (id),
  obra_etapa_id uuid references obra_etapas (id),
  elemento_id uuid references elementos (id),
  tipo tipo_nota not null,
  texto text not null,
  interna boolean not null default true,            -- notas internas nunca vão para o portal
  resolvida boolean not null default false,
  autor_id uuid not null references perfis (id),
  origem origem not null default 'manual',
  criado_em timestamptz not null default now(),
  arquivado_em timestamptz
);
create index on notas (obra_id);

create table fotografias (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique,
  obra_id uuid not null references obras (id),
  obra_etapa_id uuid references obra_etapas (id),
  elemento_id uuid references elementos (id),
  nota_id uuid references notas (id),
  caminho text not null,                            -- bucket "fotografias": <obra_id>/<id>.jpg
  legenda text,
  aprovada_cliente boolean not null default false,  -- Fase 2: só aprovadas aparecem no portal
  autor_id uuid not null references perfis (id),
  estado_sync estado_sync not null default 'sincronizado',
  criado_em timestamptz not null default now(),
  arquivado_em timestamptz
);
create index on fotografias (obra_id);

-- ─── Histórico ─────────────────────────────────────────────────────────────
create table historico (
  id bigint generated always as identity primary key,
  entidade text not null,
  entidade_id text not null,
  obra_id uuid,
  acao text not null,                               -- criar | alterar | arquivar
  resumo text,
  antes jsonb,
  depois jsonb,
  autor_id uuid references perfis (id),
  motivo text,
  origem origem not null default 'manual',
  criado_em timestamptz not null default now()
);
create index on historico (obra_id, criado_em desc);
create index on historico (entidade, entidade_id);

-- ─── Integrações (software de orçamentação e outros) ───────────────────────
create table ids_externos (
  entidade text not null,                           -- 'obras', 'clientes', 'elementos', ...
  entidade_id uuid not null,
  sistema text not null,                            -- ex.: 'orcamentacao'
  id_externo text not null,
  primary key (sistema, entidade, id_externo),
  unique (entidade, entidade_id, sistema)
);

create table sincronizacoes (
  id bigint generated always as identity primary key,
  sistema text not null,
  direcao text not null check (direcao in ('entrada', 'saida')),
  iniciado_em timestamptz not null default now(),
  terminado_em timestamptz,
  registos int,
  erros jsonb
);

-- ═══ Funções de apoio às permissões ════════════════════════════════════════
create function public.meu_papel() returns papel
language sql stable security definer set search_path = public as $$
  select papel from perfis where id = auth.uid() and ativo
$$;

create function public.e_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_papel() = 'admin', false)
$$;

create function public.e_interno() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_papel() in ('admin', 'orcamentacao', 'compras', 'fabricacao', 'montagem'), false)
$$;

-- Escritório vê todas as obras; fabricação/montagem só as das suas equipas. (= podeVerObra)
create function public.pode_ver_obra(p_obra uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when meu_papel() in ('admin', 'orcamentacao', 'compras') then true
    when meu_papel() in ('fabricacao', 'montagem') then exists (
      select 1 from obra_equipas oe join perfis p on p.equipa_id = oe.equipa_id
      where oe.obra_id = p_obra and p.id = auth.uid())
    else false
  end
$$;

create function public.pode_gerir_projetos() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_papel() in ('admin', 'orcamentacao'), false)
$$;

-- ═══ Histórico automático ══════════════════════════════════════════════════
-- O motivo e a origem passam por variáveis de sessão definidas pela ação:
--   select set_config('app.motivo', 'esqueci-me de terminar', true);
--   select set_config('app.origem', 'ia', true);
create function public.registar_historico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_obra uuid;
  v_id text;
begin
  -- Tabelas sem `id` (ex.: obra_equipas) usam a chave composta.
  v_id := coalesce(to_jsonb(new) ->> 'id', concat_ws(':', to_jsonb(new) ->> 'obra_id', to_jsonb(new) ->> 'equipa_id'));
  v_obra := coalesce((to_jsonb(new) ->> 'obra_id'), (to_jsonb(old) ->> 'obra_id'))::uuid;
  if tg_table_name = 'obras' then v_obra := v_id::uuid; end if;

  insert into historico (entidade, entidade_id, obra_id, acao, antes, depois, autor_id, motivo, origem)
  values (
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

do $$
declare t text;
begin
  foreach t in array array['projetos', 'obras', 'obra_equipas', 'obra_etapas', 'elementos', 'registos_tempo', 'notas', 'fotografias', 'perfis', 'equipas', 'etapas_modelo', 'atividades']
  loop
    execute format('create trigger historico_%1$s after insert or update on %1$I for each row execute function registar_historico()', t);
  end loop;
end $$;

-- ═══ Row Level Security ════════════════════════════════════════════════════
-- Regra geral: não há políticas de DELETE (ninguém apaga; a administração arquiva).
alter table equipas enable row level security;
alter table perfis enable row level security;
alter table clientes enable row level security;
alter table projetos enable row level security;
alter table obras enable row level security;
alter table obra_equipas enable row level security;
alter table etapas_modelo enable row level security;
alter table atividades enable row level security;
alter table obra_etapas enable row level security;
alter table elementos enable row level security;
alter table registos_tempo enable row level security;
alter table notas enable row level security;
alter table fotografias enable row level security;
alter table historico enable row level security;
alter table ids_externos enable row level security;
alter table sincronizacoes enable row level security;

-- Pessoas, equipas, definições: leitura interna, escrita admin.
create policy ler on equipas for select using (e_interno());
create policy gerir on equipas for all using (e_admin()) with check (e_admin());
create policy ler on perfis for select using (e_interno() or id = auth.uid());
create policy gerir on perfis for all using (e_admin()) with check (e_admin());
create policy ler on etapas_modelo for select using (e_interno());
create policy gerir on etapas_modelo for all using (e_admin()) with check (e_admin());
create policy ler on atividades for select using (e_interno());
create policy gerir on atividades for all using (e_admin()) with check (e_admin());

-- Clientes e projetos: escritório.
create policy ler on clientes for select using (e_interno());
create policy gerir on clientes for insert with check (pode_gerir_projetos());
create policy editar on clientes for update using (pode_gerir_projetos());
create policy ler on projetos for select using (pode_gerir_projetos());
create policy criar on projetos for insert with check (pode_gerir_projetos());
create policy editar on projetos for update using (pode_gerir_projetos());

-- Obras e tudo o que pende delas: quem pode ver a obra.
create policy ler on obras for select using (pode_ver_obra(id));
create policy criar on obras for insert with check (pode_gerir_projetos());
create policy editar on obras for update using (pode_gerir_projetos());
create policy ler on obra_equipas for select using (pode_ver_obra(obra_id));
create policy gerir on obra_equipas for insert with check (pode_gerir_projetos());

create policy ler on obra_etapas for select using (pode_ver_obra(obra_id));
create policy criar on obra_etapas for insert with check (pode_gerir_projetos());
-- Equipas de campo mudam o estado; reabrir uma etapa concluída é tratado na ação (só admin).
create policy editar on obra_etapas for update using (pode_ver_obra(obra_id));

create policy ler on elementos for select using (pode_ver_obra(obra_id));
create policy criar on elementos for insert with check (pode_gerir_projetos() and pode_ver_obra(obra_id));
create policy editar on elementos for update using (pode_ver_obra(obra_id));

-- Tempos: cada pessoa cria os seus; edita os seus durante 24 h (sem aprovação); depois, só a administração.
create policy ler on registos_tempo for select using (pode_ver_obra(obra_id));
create policy criar on registos_tempo for insert with check (perfil_id = auth.uid() and pode_ver_obra(obra_id));
create policy editar on registos_tempo for update using (
  e_admin() or (perfil_id = auth.uid() and arquivado_em is null and criado_em > now() - interval '24 hours')
) with check (e_admin() or (perfil_id = auth.uid() and arquivado_em is null));

create policy ler on notas for select using (pode_ver_obra(obra_id));
create policy criar on notas for insert with check (autor_id = auth.uid() and pode_ver_obra(obra_id));
-- Quem vê a obra pode marcar uma nota como resolvida; o texto/tipo só muda pelo
-- autor nas primeiras 24 h ou pela administração (trigger proteger_nota).
create policy editar on notas for update using (pode_ver_obra(obra_id));

create function public.proteger_nota() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (new.texto, new.tipo, new.interna, new.arquivado_em) is distinct from (old.texto, old.tipo, old.interna, old.arquivado_em)
     and not e_admin()
     and not (old.autor_id = auth.uid() and old.criado_em > now() - interval '24 hours' and new.arquivado_em is null) then
    raise exception 'Depois de 24 h a nota fica fechada: só a administração a altera.';
  end if;
  return new;
end $$;
create trigger proteger_nota before update on notas for each row execute function proteger_nota();

create policy ler on fotografias for select using (pode_ver_obra(obra_id));
create policy criar on fotografias for insert with check (autor_id = auth.uid() and pode_ver_obra(obra_id));
create policy editar on fotografias for update using (e_admin());

-- Histórico: só leitura (escrito pelo trigger). Admin vê tudo; os outros, o das obras que veem.
create policy ler on historico for select using (e_admin() or (obra_id is not null and pode_ver_obra(obra_id)));

create policy ler on ids_externos for select using (e_admin());
create policy ler on sincronizacoes for select using (e_admin());

-- ═══ Storage: fotografias (privado; URLs assinados) ════════════════════════
insert into storage.buckets (id, name, public) values ('fotografias', 'fotografias', false)
on conflict (id) do nothing;

create policy "fotografias: ler" on storage.objects for select
  using (bucket_id = 'fotografias' and pode_ver_obra(((storage.foldername(name))[1])::uuid));
create policy "fotografias: enviar" on storage.objects for insert
  with check (bucket_id = 'fotografias' and pode_ver_obra(((storage.foldername(name))[1])::uuid));

-- ═══ Dados iniciais: etapas sugeridas ══════════════════════════════════════
insert into etapas_modelo (nome, ordem, ativa, visivel_cliente) values
  ('Orçamentação', 1, true, true),
  ('Medição', 2, true, true),
  ('Projeto e especificação', 3, true, true),
  ('Pedidos a fornecedores', 4, true, false),
  ('Receção de materiais', 5, true, false),
  ('Fabricação', 6, true, true),
  ('Preparação e expedição', 7, true, true),
  ('Montagem', 8, true, true),
  ('Verificação final', 9, true, true),
  ('Pós-venda', 10, false, true);  -- Fase 2

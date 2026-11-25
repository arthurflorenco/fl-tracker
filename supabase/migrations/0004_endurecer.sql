-- ═══════════════════════════════════════════════════════════════════════════
-- 0004 — Endurecer as regras (auditoria de segurança)
--
-- 1. Datas e donos imutáveis: `criado_em` é sempre a hora do servidor e não muda.
--    Sem isto, um funcionário podia gravar `criado_em` no futuro (ou reescrevê-lo num
--    UPDATE) e a janela de 24 h para corrigir registos nunca fechava. Também não pode
--    mudar o dono (`perfil_id`/`autor_id`), a obra nem o `client_id` de um registo.
-- 2. Equipas de campo só mudam o ESTADO de etapas e elementos (antes: qualquer coluna).
-- 3. Índices em falta (usados pelas regras RLS e pelos painéis).
-- 4. As funções de apoio não ficam executáveis por visitantes anónimos.
--
-- As regras só se aplicam a pedidos de utilizadores (auth.uid() definido). Tarefas do
-- servidor (service role, importações) continuam a poder gravar datas históricas.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Campos imutáveis ───────────────────────────────────────────────────
-- Argumentos do trigger: colunas que não podem mudar num UPDATE.
create function public.proteger_campos() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  c text;
begin
  if auth.uid() is null then return new; end if;
  if tg_op = 'INSERT' then
    new.criado_em := now();
    return new;
  end if;
  foreach c in array tg_argv loop
    if (to_jsonb(new) -> c) is distinct from (to_jsonb(old) -> c) then
      raise exception 'O campo % não pode ser alterado.', c using errcode = 'check_violation';
    end if;
  end loop;
  return new;
end $$;

create trigger proteger_campos before insert or update on registos_tempo
  for each row execute function proteger_campos('criado_em', 'perfil_id', 'obra_id', 'client_id');
create trigger proteger_campos before insert or update on notas
  for each row execute function proteger_campos('criado_em', 'autor_id', 'obra_id', 'client_id');
create trigger proteger_campos before insert or update on fotografias
  for each row execute function proteger_campos('criado_em', 'autor_id', 'obra_id', 'client_id');

-- ─── 2. Campo só muda o estado ─────────────────────────────────────────────
-- Argumentos: colunas que fabricação/montagem podem alterar. O escritório altera tudo.
create function public.so_estado_para_campo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or pode_gerir_projetos() then return new; end if;
  if (to_jsonb(new) - tg_argv) is distinct from (to_jsonb(old) - tg_argv) then
    raise exception 'Só pode alterar o estado.' using errcode = 'insufficient_privilege';
  end if;
  return new;
end $$;

create trigger so_estado_para_campo before update on obra_etapas
  for each row execute function so_estado_para_campo('estado', 'iniciada_em', 'concluida_em');
create trigger so_estado_para_campo before update on elementos
  for each row execute function so_estado_para_campo('estado');

-- ─── 3. Índices ────────────────────────────────────────────────────────────
-- pode_ver_obra() procura obra_equipas por equipa em cada linha lida pelo campo.
create index on obra_equipas (equipa_id);
create index on registos_tempo (obra_etapa_id);
create index on notas (autor_id);
create index on fotografias (autor_id);
create index on historico (autor_id);
create index on perfis (equipa_id);
create index on projetos (cliente_id);
create index on obras (cliente_id);

-- ─── 4. Funções fora do alcance de anónimos ───────────────────────────────
-- Por defeito o Postgres deixa qualquer pessoa (PUBLIC) executar funções novas.
revoke execute on function public.meu_papel(), public.e_admin(), public.e_interno(),
  public.pode_ver_obra(uuid), public.pode_gerir_projetos() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.meu_papel(), public.e_admin(), public.e_interno(),
      public.pode_ver_obra(uuid), public.pode_gerir_projetos() to authenticated;
  end if;
end $$;

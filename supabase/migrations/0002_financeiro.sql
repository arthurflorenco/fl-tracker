-- FL Tracker — dados financeiros (Fase 1: dashboard de gestão)
-- Custo/hora com histórico, custos diretos por obra, valor contratado e horas previstas por etapa.
-- Regra: valores em € só a administração lê e escreve (= podeVerFinanceiro em src/lib/permissions.ts).
-- O cliente (Fase 2) nunca tem acesso a estas tabelas.

create type tipo_custo as enum ('materiais', 'vidro', 'acessorios', 'transporte', 'subempreitada', 'outros');

-- Custo/hora por pessoa a partir de uma data. Cada registo usa o valor em vigor no seu dia
-- (último `desde` <= dia do registo), por isso aumentos não mudam obras antigas.
create table custos_hora (
  id uuid primary key default gen_random_uuid(),
  perfil_id uuid not null references perfis (id),
  valor numeric(8, 2) not null check (valor > 0),
  desde date not null,
  autor_id uuid references perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  unique (perfil_id, desde)
);

-- Custos diretos lançados na obra (registo leve; não é o módulo de compras).
create table custos_diretos (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras (id),
  tipo tipo_custo not null,
  descricao text not null,
  valor numeric(12, 2) not null check (valor > 0),
  data date not null default current_date,
  autor_id uuid references perfis (id) default auth.uid(),
  criado_em timestamptz not null default now(),
  arquivado_em timestamptz
);
create index on custos_diretos (obra_id) where arquivado_em is null;

-- Valor contratado numa tabela à parte: `obras` é lida pelas equipas de campo (RLS é por linha,
-- não por coluna), por isso o valor em € não pode viver lá. No código é `Obra.valorContratado`.
create table obra_financeiro (
  obra_id uuid primary key references obras (id),
  valor_contratado numeric(12, 2),
  atualizado_em timestamptz not null default now()
);

-- Horas previstas por etapa (não são valores em €: as equipas podem ver o previsto).
alter table obra_etapas add column horas_previstas numeric(7, 1) check (horas_previstas >= 0);

-- Só a administração altera horas previstas depois de criadas (na conversão, a orçamentação define-as).
create function public.proteger_horas_previstas() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.horas_previstas is distinct from old.horas_previstas and not e_admin() then
    raise exception 'Só a administração altera as horas previstas.';
  end if;
  return new;
end $$;
create trigger proteger_horas_previstas before update on obra_etapas
  for each row execute function proteger_horas_previstas();

-- Histórico automático nas tabelas novas.
create trigger historico_custos_hora after insert or update on custos_hora for each row execute function registar_historico();
create trigger historico_custos_diretos after insert or update on custos_diretos for each row execute function registar_historico();
create trigger historico_obra_financeiro after insert or update on obra_financeiro for each row execute function registar_historico();

-- RLS: só administração. Sem políticas de DELETE (arquivar em vez de apagar).
alter table custos_hora enable row level security;
alter table custos_diretos enable row level security;
alter table obra_financeiro enable row level security;

create policy ler on custos_hora for select using (e_admin());
create policy criar on custos_hora for insert with check (e_admin());
create policy editar on custos_hora for update using (e_admin());

create policy ler on custos_diretos for select using (e_admin());
create policy criar on custos_diretos for insert with check (e_admin());
create policy editar on custos_diretos for update using (e_admin());

create policy ler on obra_financeiro for select using (e_admin());
create policy criar on obra_financeiro for insert with check (e_admin() or pode_gerir_projetos());
create policy editar on obra_financeiro for update using (e_admin());

-- O histórico da obra é visível às equipas: as entradas com valores em € ficam só para a administração.
drop policy ler on historico;
create policy ler on historico for select using (
  e_admin()
  or (
    obra_id is not null
    and pode_ver_obra(obra_id)
    and entidade not in ('custos_diretos', 'custos_hora', 'obra_financeiro')
  )
);

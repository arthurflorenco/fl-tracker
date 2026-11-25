-- ═══════════════════════════════════════════════════════════════════════════
-- 0006 — Vários responsáveis por obra
--
-- Antes: só o projeto tinha um responsável (projetos.responsavel_id, um único campo).
-- Agora: tabela de ligação N:N — uma obra tem vários responsáveis e uma pessoa é
-- responsável por várias obras. Remover um responsável não apaga a linha: marca
-- `removido_em` (o histórico mostra quem foi responsável e quando).
-- ═══════════════════════════════════════════════════════════════════════════

create table obra_responsaveis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default minha_empresa() references empresas (id),
  obra_id uuid not null,
  perfil_id uuid not null,
  criado_em timestamptz not null default now(),
  removido_em timestamptz,
  -- A obra e a pessoa têm de ser da mesma empresa que a linha.
  foreign key (obra_id, empresa_id) references obras (id, empresa_id),
  foreign key (perfil_id, empresa_id) references perfis (id, empresa_id)
);
-- A mesma pessoa só pode estar uma vez como responsável ATIVO de cada obra.
create unique index responsavel_ativo on obra_responsaveis (obra_id, perfil_id) where removido_em is null;
create index on obra_responsaveis (perfil_id);
create index on obra_responsaveis (empresa_id);

create trigger historico_obra_responsaveis after insert or update on obra_responsaveis
  for each row execute function registar_historico();
create trigger empresa_imutavel before update on obra_responsaveis
  for each row execute function empresa_imutavel();
-- Só `removido_em` muda depois de criada (o resto é imutável).
create trigger proteger_campos before insert or update on obra_responsaveis
  for each row execute function proteger_campos('obra_id', 'perfil_id', 'criado_em');

alter table obra_responsaveis enable row level security;
create policy mesma_empresa on obra_responsaveis as restrictive for all
  using (empresa_id = (select minha_empresa())) with check (empresa_id = (select minha_empresa()));
create policy ler on obra_responsaveis for select using (pode_ver_obra(obra_id));
create policy criar on obra_responsaveis for insert with check (pode_gerir_projetos());
create policy editar on obra_responsaveis for update using (pode_gerir_projetos());

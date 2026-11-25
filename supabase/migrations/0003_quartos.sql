-- FL Tracker — tempo em quartos de hora e sem sobreposições
-- Regra (= src/lib/quartos.ts): início e fim sempre em múltiplos de 15 min; a app arredonda
-- o início para baixo e o fim para cima (a favor do funcionário). Mínimo: 15 min (fim > início).
-- A mesma pessoa nunca tem dois registos ativos sobrepostos.

create extension if not exists btree_gist with schema extensions;

alter table registos_tempo
  add constraint inicio_em_quartos check (extract(epoch from inicio)::bigint % 900 = 0),
  add constraint fim_em_quartos check (fim is null or extract(epoch from fim)::bigint % 900 = 0);

-- Registo em curso ocupa até ao infinito; registos arquivados não contam.
alter table registos_tempo
  add constraint sem_sobreposicao exclude using gist (
    perfil_id with =,
    tstzrange(inicio, coalesce(fim, 'infinity'::timestamptz), '[)') with &&
  ) where (arquivado_em is null);

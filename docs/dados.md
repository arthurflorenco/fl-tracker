# Modelo de dados

Fonte de verdade: `supabase/migrations/` (`0001_base.sql` … `0006_obra_responsaveis.sql`). Tipos TS equivalentes em `src/modules/*/schema.ts`.

| Tabela | Para quê | Notas |
|---|---|---|
| `empresas` | o tenant (multi-empresa) | **todas** as outras tabelas têm `empresa_id`; RLS restritiva `empresa_id = minha_empresa()`; chaves estrangeiras compostas `(coluna, empresa_id)` impedem ligar dados de empresas diferentes |
| `perfis` | uma pessoa = um utilizador Supabase Auth | papel, equipa, ativo (desativar em vez de apagar) |
| `equipas`, `obra_equipas` | quem vê que obras | funcionários de campo só veem obras das suas equipas |
| `clientes` | cliente final | `perfil_id` para o portal (fase 2) |
| `projetos` | oportunidade / orçamento | estados: pedido → medição → proposta → em revisão → aprovado / recusado |
| `obras` | obra aprovada | `codigo` "2026-014" (único por empresa), `qr_token` opaco |
| `obra_responsaveis` | responsáveis pela obra (N:N) | várias pessoas por obra; remover marca `removido_em`; único por (obra, pessoa) ativa |
| `etapas_modelo`, `atividades` | modelo configurável | copiado para cada obra na conversão |
| `obra_etapas` | etapas de uma obra | estado, datas previstas/reais, `visivel_cliente` |
| `elementos` | janelas, portas, vidros, estores… | referência única na obra, `qr_ativo` opcional |
| `registos_tempo` | tempo por pessoa | `duracao_min` calculada; um em curso por pessoa; `client_id`, `estado_sync`, `origem` |
| `notas` | observações e problemas | `tipo`, `interna`, `resolvida` |
| `fotografias` | imagens no Storage | `aprovada_cliente` |
| `historico` | auditoria | preenchido por trigger: antes/depois em jsonb, autor, motivo, origem |
| `ids_externos`, `sincronizacoes` | integrações (software de orçamentação…) | mapeamento de IDs e log |
| `custos_hora` | custo/hora por pessoa a partir de uma data | só admin; cada registo usa o valor em vigor no seu dia |
| `custos_diretos` | materiais, vidro, ferragens, transporte, subempreitada, outros | só admin; arquivar em vez de apagar |
| `obra_financeiro` | valor contratado da obra | só admin; no código é `Obra.valorContratado` (copiado de `valor_proposta` na conversão) |
| `obra_etapas.horas_previstas` | previsto vs. real | só admin altera depois da conversão (trigger) |

Cálculos (puros, testados em `src/modules/financeiro/calculos.test.ts`):
- **Mão de obra** = Σ horas do registo × custo/hora em vigor nesse dia. Registos em curso ou arquivados não contam.
- **Margem** = valor contratado − mão de obra − custos diretos.
- **Projeção no fim** (obras em curso) = custo atual + horas que faltam nas etapas por concluir (previsto − real, ao custo/hora médio da obra) + materiais ainda não lançados (estimados pela média de custos diretos / valor das obras concluídas).
- **Em risco**: etapa por concluir com ≥ 80% das horas previstas, etapa excedida, ou margem projetada negativa.

Regras transversais: sem DELETE (arquivar com `arquivado_em`); IDs UUID; datas `timestamptz` (UTC), mostradas em hora de Lisboa.

Proteções no SQL (`0004_endurecer.sql`, `0005_empresas.sql`): `criado_em` é sempre a hora do servidor e não muda; o dono (`perfil_id`/`autor_id`), a obra e a empresa de um registo não mudam; as equipas de campo só alteram o estado de etapas e elementos.

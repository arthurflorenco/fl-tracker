# Permissões

Implementadas em `src/lib/permissions.ts` (testadas em `permissions.test.ts` e, pelas ações reais, em `src/modules/acoes.test.ts`) e espelhadas no RLS de `supabase/migrations` (verificado por `npm run db:verificar`).

**Primeira regra: a empresa.** Ninguém — nem a administração — vê ou altera dados de outra empresa. Na app: `mesmaEmpresa()` e `podeVerObra()` (que recebe a empresa da obra); todas as consultas de listas recebem `empresaId`. No SQL: política RESTRITIVA `empresa_id = minha_empresa()` em todas as tabelas (junta-se às outras com AND).

| | Admin | Orçamentação | Compras | Fabricação | Montagem | Pós-venda* | Cliente* |
|---|---|---|---|---|---|---|---|
| Painel, registar trabalho | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Ver obras | todas | todas | todas | da equipa | da equipa | — | as suas (portal) |
| Projetos e conversão em obra | ✅ | ✅ | — | — | — | — | — |
| Criar elementos, QR de elementos | ✅ | ✅ | — | — | — | — | — |
| Definir responsáveis da obra | ✅ | ✅ | — | — | — | — | — |
| Mudar estado de etapa/elemento | ✅ | ✅ | ✅ | ✅ | ✅ | — | — |
| Reabrir etapa concluída | ✅ | — | — | — | — | — | — |
| Editar os próprios registos (sem aprovação) | sempre | 24 h | 24 h | 24 h | 24 h | — | — |
| Editar registos de outros | ✅ | — | — | — | — | — | — |
| Utilizadores, equipas, etapas, histórico global | ✅ | — | — | — | — | — | — |
| Dados financeiros: custo/hora, custos diretos, valor contratado, margens, Análise | ✅ | — | — | — | — | — | — |
| Horas previstas por etapa | definir/alterar | definir na conversão | — | — | — | — | — |
| Apagar | ninguém (arquivar: admin) | | | | | | |

\* Fase 2.

Dados financeiros: `podeVerFinanceiro()` (só admin) na interface e nas ações; no SQL (`0002_financeiro.sql`) as tabelas `custos_hora`, `custos_diretos` e `obra_financeiro` só têm políticas `e_admin()`, e as entradas de histórico dessas tabelas ficam escondidas das equipas. O valor contratado vive em `obra_financeiro` (e não em `obras`) porque o RLS é por linha e as equipas leem `obras`.

O cliente nunca vê: horas individuais, custos, margens, fornecedores, notas internas, problemas administrativos. A filtragem é por lista branca (`vistaCliente()`).

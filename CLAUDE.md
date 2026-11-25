@AGENTS.md

# FL Tracker — contexto do projeto

Plataforma web multi-empresa (PWA, pensada para tablets e telemóveis) para empresas de caixilharia acompanharem as obras: projeto em orçamento → obra → elementos → etapas → tempo por pessoa → notas e fotografias, com histórico completo. Visão completa em `docs/produto.md`; fases em `docs/fases.md`. Projeto de portfólio: README em inglês; `docs/estudo.md` explica os conceitos.

## Âmbito atual: Fase 1 (piloto)

**Entra:** multi-empresa (cada empresa só vê os seus dados), login individual, utilizadores/equipas/papéis, projetos em orçamento, conversão em obra, obra completa, vários responsáveis por obra, elementos, etapas configuráveis, QR Code da obra (QR de elemento opcional), registo individual de tempo, notas classificadas, fotografias, histórico, pedidos de correção, painel básico, PWA instalável, **dashboard de gestão só para a administração** (custo/hora com histórico, custos diretos simples, valor contratado, margem real e projetada, previsto vs. real, comparação de obras e funcionários), **fichas de pessoa e de equipa** com histórico de obras (`/admin/utilizadores/[id]`, `/admin/equipas/[id]`), **exportar CSV** (obras, registos de uma obra, utilizadores, registos de uma pessoa — só administração; `src/lib/csv.ts` + `modules/financeiro/exportar.ts`).

**NÃO entra (não criar rotas, menus nem ecrãs):** portal do cliente, pós-venda, modo offline/sincronização, assistente de IA (texto/voz), integração com software de orçamentação, compras/materiais (os custos diretos manuais não são compras), relatórios PDF/automáticos (CSV já existe).
Estas fases estão *preparadas* no modelo (ver "Preparado para o futuro"), mas não expostas.

## Regras

- Interface **bilingue: inglês (padrão) e português de Portugal**. Os textos da interface vivem em `src/i18n/` (dicionários `en.ts` e `pt.ts`); nunca escrever texto visível diretamente num componente. O código, os comentários e os termos do domínio continuam em português (obra, elemento, etapa, atividade, orçamento, registo de tempo).
- Usar os tokens de `src/app/globals.css` (destaque `accent`) e os componentes de `src/components/ui`. Não inventar cores. Ver `docs/design.md`.
- Escuro por defeito; claro opcional (`data-theme` no `<html>`).
- **Multi-empresa:** toda a linha tem `empresaId`. Toda a consulta de listas recebe `empresaId`; toda a ação que recebe um id verifica `mesmaEmpresa()`/`podeVerObra()`. No SQL: RLS restritiva `empresa_id = minha_empresa()` e chaves estrangeiras compostas (`0005_empresas.sql`).
- Cada pessoa tem login próprio. Nunca contas partilhadas. Sessão de demonstração: cookie assinado (HMAC, `src/lib/assinatura.ts`, `SESSION_SECRET`).
- Ninguém apaga definitivamente. A administração arquiva (`arquivado_em`).
- **Tempo sempre em quartos de hora** (`src/lib/quartos.ts`): início arredonda para baixo, fim para cima (a favor do funcionário), mínimo 15 min — pode terminar logo a seguir a iniciar (17:00 → 17:15). Registos seguidos encadeiam: o início seguinte é o fim anterior (`inicioSugerido`/`fimSugerido`). O ecrã mostra um cronómetro a contar só como referência; o que se grava é sempre em quartos. Horas à mão até 7 dias atrás. A mesma pessoa nunca tem registos sobrepostos (SQL: `0003_quartos.sql`).
- O QR Code (leitor da app em `/admin/ler-qr` ou câmara nativa) abre sempre a página da obra via `/q/<token>`.
- Funcionários corrigem os próprios registos durante 24 h, **sem aprovação**; depois disso o registo fica fechado e só a administração o altera (com motivo, no histórico). Não há pedidos de correção.
- Toda a alteração guarda quem, o quê, quando, antes, depois, motivo e origem (`manual | ia | sync | importacao`).
- **Dados financeiros (€, custo/hora, margens) só para a administração**: `podeVerFinanceiro()` na UI e nas ações; tabelas próprias com RLS `e_admin()` (`0002_financeiro.sql`). Nunca mostrar € a equipas de campo, nem no histórico da obra (`historicoDaObra(..., { financeiro })`).
- O cliente (Fase 2) só vê informação autorizada: nunca horas individuais, custos, margens, fornecedores ou notas internas. A regra já existe em `vistaCliente()` (`src/lib/permissions.ts`) e está testada.
- Segredos só em `.env.local` (fora do git). Ver `.env.example`.
- Não pôr no repositório informação comercial (preços, propostas, propriedade intelectual).

## Arquitetura (monólito modular)

```
src/app/                  rotas (App Router, Next 16)
  entrar/                 login (demonstração: escolher pessoa)
  admin/                  área interna (futuro app.example.com/admin)
  q/[token]/              destino dos QR Codes → modo registo
src/modules/<dominio>/    empresas, projetos, obras, elementos, etapas, tempos, notas, fotografias,
                          equipas, utilizadores, auditoria, qr, financeiro
  schema.ts               tipos + validação zod
  queries.ts              leitura (server-only)
  actions.ts              ESCRITA — server actions: validar → permissão → gravar → histórico
src/modules/financeiro/calculos.ts  cálculos puros de custo/margem/projeção (testados)
src/components/graficos/  gráficos (shadcn chart + Recharts) — ver docs/design.md
src/lib/permissions.ts    regras puras de permissão (espelhadas no RLS do SQL)
src/lib/session.ts        sessão (demonstração por cookie; trocar por Supabase Auth)
src/lib/mock/             base de dados em memória + dados fictícios
src/lib/supabase/         clientes Supabase (prontos, ainda não usados)
supabase/migrations/      esquema Postgres + RLS + triggers de histórico
```

Convenções:
- **Toda a escrita passa por `modules/*/actions.ts`.** É o ponto único que o futuro assistente de IA vai chamar (nunca a base de dados diretamente).
- Ações devolvem `Resultado` (`src/lib/acao.ts`) e usam-se com `<ActionForm>`; os erros por campo chegam aos `<Field>` por contexto.
- Registos criados no dispositivo levam `clientId` (UUID) — idempotência para o modo offline.
- Se mudar uma regra em `permissions.ts`, mudar a política equivalente no SQL (e vice-versa).

## Estado atual

- Fundação completa a funcionar com **dados fictícios em memória** — no Netlify partilhados entre instâncias por Netlify Blobs (`sincronizarDb`/`agendarGravacao` em `lib/mock/store.ts`) (reiniciam quando o servidor reinicia; subir `VERSAO_SEED` em `lib/mock/store.ts` quando o formato muda). O seed gera duas empresas fictícias (Atlântico Alumínios, Ribeira Window Systems), cada uma com ~6 meses de histórico determinístico (7 obras, 4 concluídas, uma com prejuízo, uma em risco); a empresa B tem ids com prefixo `b-`.
- Esquema SQL escrito e validado com PGlite (`npm run db:verificar`), **ainda não aplicado** num projeto Supabase.
- Sem service worker / offline.
- **Modo demonstração sempre ligado no site publicado**: guia interativo passo a passo, mostrado só na primeira visita de cada browser (`src/components/guia/`, textos em `passos.ts`), faixa "dados fictícios", `/demo/qr` e "Repor dados". Em desenvolvimento desliga-se com `NEXT_PUBLIC_MODO_DEMO=0` no `.env.local`; para a versão real, mudar `src/lib/demo.ts`.

## Próximos passos

1. Criar o projeto Supabase, preencher `.env.local`, aplicar `supabase/migrations`.
2. Trocar `lib/session.ts` por Supabase Auth (convite por email) e `/entrar` por login real.
3. Trocar `queries.ts`/`actions.ts` de `lib/mock` para Supabase, módulo a módulo (ver `docs/arquitetura.md`).
4. Fotografias para o bucket privado `fotografias/<obraId>/<id>.jpg` com URLs assinados.
5. Interface: concluir a tradução EN/PT de todos os ecrãs (`src/i18n/`).

## Comandos

    npm run dev            # http://localhost:3000 → /entrar
    npm run typecheck      # next typegen + tsc
    npm run lint
    npm test               # vitest (permissões, ações: login/permissões/horas, quartos de hora, QR, cálculos, CSV, seed)
    npm run db:verificar   # aplica o SQL em PGlite e verifica RLS/multi-empresa com asserções (também na CI)
    npm run build

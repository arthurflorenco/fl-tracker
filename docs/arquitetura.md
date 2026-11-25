# Arquitetura

Monólito modular em Next.js 16 (App Router). Sem microserviços.

## Pastas

- `src/app` — rotas. `admin/` é a área interna; `q/[token]` resolve QR Codes; `entrar/` é o login.
- `src/modules/<dominio>` — cada domínio tem `schema.ts` (tipos + zod), `queries.ts` (leitura, `server-only`) e `actions.ts` (server actions de escrita).
- `src/lib` — `permissions.ts` (regras puras), `session.ts`, `acao.ts` (contrato das ações), `format.ts` (datas pt-PT/Lisboa), `imagem.ts`, `mock/`, `supabase/`.
- `src/components` — `ui/` (design system do site), `layout/` (shell, navegação), `obras/`, `registo/` (modo tablet).
- `supabase/migrations` — esquema, RLS, triggers.

## Fluxo de uma escrita

```
<ActionForm action={criarNota}>      (cliente)
   → criarNota(formData)              modules/notas/actions.ts  ('use server')
       1. exigirSessao()              quem é
       2. schema.safeParse()          dados válidos
       3. podeVerObra()/…             pode fazer isto
       4. gravar                      (hoje: lib/mock; depois: Supabase)
       5. registarHistorico()         quem/o quê/antes/depois/motivo/origem
       6. revalidatePath()
   ← Resultado { ok, mensagem | erro, campos }
```

O futuro assistente de IA chama exatamente estas funções, com `origem: 'ia'`.

## Sessão e autorização

- `src/proxy.ts` (antigo middleware) faz só a verificação otimista do cookie e guarda o destino (útil para QR lidos sem sessão).
- `lib/session.ts` decide quem é a pessoa; `lib/permissions.ts` decide o que pode fazer.
- Com Supabase, as políticas RLS repetem estas regras na base de dados — defesa em profundidade.

## Ligar o Supabase (próximo passo)

1. Criar projeto; `supabase link`; `supabase db push` (aplica `migrations/`).
2. `.env.local` com `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL`.
3. `lib/session.ts`: `getSessao()` passa a usar `criarClienteServidor().auth.getUser()` + `perfis`. `/entrar` passa a login por email. O `proxy.ts` passa a renovar a sessão Supabase.
4. Em cada módulo, trocar `db()` (mock) por `criarClienteServidor().from(...)`. Os nomes de colunas em SQL são `snake_case`; os tipos TS são `camelCase` — mapear em `queries.ts`.
5. Motivo/origem para o histórico: `select set_config('app.motivo', $1, true)` na mesma transação (função RPC por ação), ou manter a chamada explícita a `registarHistorico` para o `resumo`.
6. Financeiro: `Obra.valorContratado` lê/escreve em `obra_financeiro` (não em `obras`); na conversão em obra, inserir também a linha de `obra_financeiro`. Os cálculos (`modules/financeiro/calculos.ts`) ficam iguais — só `queries.ts` muda (a agregação pode passar para uma view/RPC só-admin se ficar pesada).
7. Fotografias: upload para `fotografias/<obraId>/<id>.jpg` e mostrar com URL assinado.
8. Apagar `lib/mock` quando nada o usar.

## Offline (fase de campo)

Service worker (cache da app e das obras descarregadas) + IndexedDB/Dexie com fila de ações pendentes. Cada registo já tem `clientId`, por isso reenviar é seguro. A UI mostra `sincronizado | pendente | erro` por registo.

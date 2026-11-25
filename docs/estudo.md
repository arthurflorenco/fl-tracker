# Estudo — os conceitos por trás do FL Tracker

Guia para estudar (e explicar numa entrevista) as decisões técnicas deste projeto. Cada conceito tem uma explicação curta, um exemplo tirado do código e a resposta para "por que fiz assim". No fim há 20 perguntas e respostas no formato Anki.

---

## Parte 1 · 10 conceitos

### 1. Autenticação vs. autorização

- **Autenticação** responde "quem é você?" (login).
- **Autorização** responde "você pode fazer isto?" (permissões).

Neste projeto, a autenticação de demonstração é um cookie assinado. A autorização vive em funções puras (sem banco de dados, fáceis de testar) em `src/lib/permissions.ts`:

```ts
export function podeVerObra(perfil, obra: AcessoObra) {
  if (obra.empresaId == null || obra.empresaId !== perfil.empresaId) return false // outra empresa
  if (perfil.papel === 'cliente' || perfil.papel === 'pos_venda') return false
  if (VEEM_TODAS_AS_OBRAS.includes(perfil.papel)) return true                    // escritório
  return perfil.equipaId != null && obra.equipas.includes(perfil.equipaId)       // campo: só a sua equipa
}
```

**Por quê:** separar "quem é" de "o que pode" permite trocar o login (por Supabase Auth, por exemplo) sem mexer nas regras.

### 2. IDOR (Insecure Direct Object Reference)

É acessar um recurso de outra pessoa só trocando o ID na URL ou na API: `/admin/obras/ob-1` → `/admin/obras/b-ob-1`. Esconder o botão não basta. O servidor tem de verificar sempre.

```ts
// src/modules/tempos/actions.ts — arquivarTempo
const r = db().registosTempo.find((x) => x.id === v.data.registoId)
if (!r || !mesmaEmpresa(eu, r)) return naoEncontrado()   // id de outra empresa = "não existe"
```

Devolver "não encontrado" (e não "proibido") também evita confirmar que aquele ID existe. O teste `src/modules/acoes.test.ts` → "permissões entre empresas (IDOR)" tenta exatamente esse ataque.

### 3. Multi-tenant (várias empresas no mesmo banco)

*Tenant* é cada cliente (aqui, cada empresa). Todas as tabelas têm `empresa_id` e todas as consultas filtram por ele:

```ts
// src/modules/projetos/queries.ts
export function listarProjetos(empresaId: string) {
  return db().projetos.filter((p) => p.empresaId === empresaId) /* … */
}
```

**Por quê `empresa_id` em todas as tabelas, e não só na `obras`?** Assim a regra de segurança fica simples e rápida (`empresa_id = X`, com índice), sem precisar de juntar tabelas (fazer *join*) para descobrir de que empresa é uma linha.

### 4. Row Level Security (RLS) e políticas restritivas

RLS são regras dentro do Postgres que filtram as linhas que cada usuário pode ler ou alterar. Funcionam mesmo que o código da aplicação tenha um bug.

```sql
-- supabase/migrations/0005_empresas.sql
create policy mesma_empresa on obras as restrictive for all
  using (empresa_id = (select minha_empresa()))
  with check (empresa_id = (select minha_empresa()));
```

- `using`: quais linhas posso **ver ou alterar**.
- `with check`: como a linha pode ficar **depois** de um INSERT ou UPDATE.
- **Permissiva** (o padrão): basta uma política deixar passar. **Restritiva**: tem de passar sempre, além das outras (funciona como um AND). Por isso nem o administrador da empresa B vê a empresa A.
- `(select minha_empresa())`: o Postgres calcula uma vez por consulta, e não uma vez por linha.

### 5. Defesa em profundidade

Nunca confiar numa camada só. Aqui a mesma regra existe em três lugares:

1. **Interface:** esconde botões (só conforto visual, não é segurança).
2. **Server actions:** `podeVerObra`, `mesmaEmpresa` (`src/modules/*/actions.ts`).
3. **Banco:** RLS e chaves estrangeiras compostas.

```sql
-- uma obra da empresa A não pode apontar para uma equipa da empresa B, nem por engano do servidor
foreign key (equipa_id, empresa_id) references equipas (id, empresa_id)
```

### 6. Modelagem: 1:N, N:N e tabela de ligação

- **1:N:** uma obra tem muitos elementos → `elementos.obra_id`.
- **N:N:** uma obra tem vários responsáveis e uma pessoa é responsável por várias obras → precisa de uma **tabela de ligação**:

```sql
-- supabase/migrations/0006_obra_responsaveis.sql
create table obra_responsaveis (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null default minha_empresa() references empresas (id),
  obra_id uuid not null,
  perfil_id uuid not null,
  removido_em timestamptz,
  ...
);
create unique index responsavel_ativo on obra_responsaveis (obra_id, perfil_id) where removido_em is null;
```

O índice único **parcial** (`where removido_em is null`) impede a mesma pessoa de aparecer duas vezes como responsável ativo, mas deixa adicioná-la de novo depois de removida.

### 7. Índices

Um índice é como o índice remissivo de um livro: o banco encontra as linhas sem ler a tabela inteira. Cada índice deixa as escritas um pouco mais lentas, por isso só se criam onde há buscas frequentes:

```sql
-- supabase/migrations/0004_endurecer.sql
create index on obra_equipas (equipa_id);   -- pode_ver_obra() procura por equipa em cada leitura
-- supabase/migrations/0001_base.sql
create index on registos_tempo (perfil_id, inicio desc); -- "os meus últimos registos" (índice composto)
```

Com 5 mil registos, uma consulta sem índice ainda é rápida. Com 5 milhões, deixa de ser. Também ajudam as restrições: `unique (empresa_id, codigo)` cria um índice e impede códigos repetidos na mesma empresa.

### 8. Soft delete (arquivar em vez de apagar)

Ninguém apaga dados: só marca a data em que arquivou.

```ts
// src/modules/tempos/actions.ts
r.arquivadoEm = new Date().toISOString()   // o registo deixa de contar nas horas e nos custos
```

No SQL não existe nenhuma política de `DELETE`, por isso o banco recusa apagar. **Por quê:** horas e custos são dados de pagamento e de faturação; apagar destrói provas e quebra relatórios antigos.

### 9. Auditoria (trilha de quem fez o quê)

Toda a alteração guarda quem, o quê, quando, o antes, o depois, o motivo e a origem. No app: `registarHistorico()` (`src/modules/auditoria/registar.ts`). No banco, um **trigger** (código que o Postgres executa sozinho a cada INSERT/UPDATE) escreve em `historico`:

```sql
insert into historico (empresa_id, entidade, entidade_id, obra_id, acao, antes, depois, autor_id, motivo, origem)
values ((to_jsonb(new) ->> 'empresa_id')::uuid, tg_table_name, v_id, v_obra,
        case tg_op when 'INSERT' then 'criar' else 'alterar' end,
        case when tg_op = 'UPDATE' then to_jsonb(old) end, to_jsonb(new), auth.uid(), ...);
```

Um segundo trigger torna `criado_em`, o dono e a obra **imutáveis** (não podem mudar). Sem ele, um funcionário poderia gravar `criado_em` no futuro e manter aberta para sempre a janela de 24 h para corrigir as horas.

### 10. Testes em camadas e CI

- **Unitários:** funções puras (`permissions.test.ts`, `quartos.test.ts`). São rápidos e não precisam de banco.
- **Integração das ações:** chamam as server actions de verdade e simulam só os cookies (`src/test/ambiente.ts` + `acoes.test.ts`).
- **Banco:** `scripts/verificar-sql.mjs` aplica as migrações num Postgres em WebAssembly (PGlite) e testa a RLS como um usuário real.
- **Teste de mutação manual:** remover de propósito a verificação de empresa e confirmar que os testes falham (falharam 9). Isso prova que os testes protegem mesmo alguma coisa.
- **CI (integração contínua):** `.github/workflows/ci.yml` roda tudo a cada envio ao GitHub; se algo falha, o commit fica vermelho.

Extra que vale citar: **idempotência**. Cada registo criado no tablet leva um `clientId` (UUID). Se a rede falhar e o tablet reenviar, o servidor não cria um duplicado. É a base para um futuro modo offline.

---

## Parte 2 · 20 perguntas (formato Anki)

Cada linha: **pergunta** ; resposta. Para importar no Anki, copie as linhas para um `.txt` e escolha o separador `;`.

1. **Qual a diferença entre autenticação e autorização?** ; Autenticação confirma quem você é (login); autorização decide o que você pode fazer (permissões).
2. **O que é IDOR?** ; Acessar um recurso de outro usuário trocando o ID na URL ou na API, porque o servidor não confere se o recurso é seu.
3. **Por que esconder um botão não é segurança?** ; Qualquer pessoa pode chamar a API diretamente; a verificação tem de estar no servidor e no banco.
4. **Por que responder 404 em vez de 403 a um ID de outra empresa?** ; Para não confirmar que aquele recurso existe.
5. **O que é RLS no Postgres?** ; Row Level Security: regras dentro do banco que filtram as linhas que cada usuário pode ler ou alterar.
6. **Diferença entre `using` e `with check` numa política RLS?** ; `using` filtra as linhas existentes que posso ver/alterar; `with check` valida como a linha fica depois do INSERT/UPDATE.
7. **O que é uma política RLS restritiva?** ; Uma política que tem de passar sempre, combinada com AND com as permissivas; útil para o isolamento entre empresas.
8. **Por que escrever `(select minha_empresa())` em vez de `minha_empresa()`?** ; Para o Postgres calcular a função uma vez por consulta, e não uma vez por linha.
9. **O que é multi-tenant?** ; Uma aplicação que serve vários clientes (tenants) no mesmo sistema, com os dados de cada um isolados.
10. **Para que serve uma chave estrangeira composta `(obra_id, empresa_id)`?** ; Garante que a linha relacionada é da mesma empresa, mesmo quando a RLS é ignorada (tarefas do servidor).
11. **Como modelar "uma obra tem vários responsáveis"?** ; Com uma tabela de ligação N:N (`obra_responsaveis`) com `obra_id` e `perfil_id`.
12. **O que é um índice único parcial?** ; Um índice único que só vale para as linhas de um `where`; ex.: um responsável ativo por obra, mas permitindo histórico.
13. **Quando criar um índice?** ; Em colunas usadas com frequência em filtros, joins ou ordenações; cada índice deixa as escritas um pouco mais lentas.
14. **O que é soft delete?** ; Marcar um registo como arquivado (ex.: `arquivado_em`) em vez de apagar a linha.
15. **Duas vantagens do soft delete?** ; Mantém o histórico e as provas (horas, custos) e permite desfazer; relatórios antigos continuam certos.
16. **O que uma trilha de auditoria deve guardar?** ; Quem, o quê, quando, o valor antes, o valor depois, o motivo e a origem da alteração.
17. **Por que `criado_em` deve ser definido pelo servidor e imutável?** ; Se o cliente pudesse definir a data, poderia contornar regras de prazo (ex.: a janela de 24 h para editar).
18. **O que é idempotência numa API?** ; Repetir o mesmo pedido produz o mesmo resultado; aqui, o mesmo `clientId` não cria um registo duplicado.
19. **O que é um teste de mutação?** ; Introduzir de propósito um bug (ex.: remover uma verificação) e confirmar que os testes falham; mostra que os testes são úteis.
20. **O que a CI faz neste projeto?** ; A cada push ou pull request, roda typecheck, lint, formatação, testes, testes de banco (RLS) e o build no GitHub Actions.

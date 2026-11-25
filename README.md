# FL Tracker

Job tracking for window and glazing companies: from the first quote to the installed window, with time logged per person, stage and item, categorised notes, photos and a full audit trail. Multi-company, bilingual (English / Portuguese) and designed for tablets on the shop floor and on site.

> Originally built as an MVP for a real aluminium joinery business and published here with permission. Every company, person, project, place and amount in this repository is fictitious.

![CI](https://github.com/arthurflorenco/fl-tracker/actions/workflows/ci.yml/badge.svg)

**Live demo: https://fl-tracker.netlify.app** — no sign-up: pick any person on the sign-in screen. Everything is fictitious; anyone can use any account, so the data may change and can be reset from the *Guide* button.

## What it does

| For the workshop and site teams | For the office and management |
|---|---|
| Scan the QR code stuck on the job → the project opens | Quotes pipeline, converted into projects when approved |
| Start / finish work in one tap, always stored in **quarter hours** | Configurable stages and activities per company |
| Log past hours (up to 7 days back), correct own entries for 24 h | Items per project (windows, doors, glass, shutters…) with their own QR |
| Leave categorised notes (problem, delay, missing material…) and photos | Several people in charge per project |
| Only see the projects assigned to their team, never any € amount | Dashboard: contract value, actual and projected margin, planned vs. actual hours, projects at risk |
| | Per-person and per-team history, comparisons, CSV export |
| | Full history of every change: who, what, when, before/after, reason |

## Try it

```bash
npm install
cp .env.example .env.local     # optional in development
npm run dev                    # http://localhost:3000
```

The app opens on a demo sign-in screen: pick any person. There are **two fictitious companies** (Atlântico Alumínios and Ribeira Window Systems) — sign in as someone from each and you will see that neither can see the other's data. An interactive guide walks you through the main flow on the first visit. Switch language with **EN | PT** in the menu.

Roles to try: *Ana Ribeiro* (management, sees money), *Carlos Mendes* (estimating), *Tiago Santos* (fabrication team), *João Pereira* (installation team).

## Stack

- **Next.js 16** (App Router, Server Components, Server Actions), **React 19**, **TypeScript**
- **Tailwind CSS 4**, shadcn/ui charts (Recharts)
- **zod** for validation
- **PostgreSQL / Supabase** schema with Row Level Security (written and tested, see below)
- **Vitest**, **PGlite** (Postgres compiled to WebAssembly) for database tests, **GitHub Actions** CI

## Architecture

A modular monolith. Each business area lives in `src/modules/<area>/`:

```
schema.ts    types + zod validation
queries.ts   reads (server only)
actions.ts   the ONLY way to write: validate → check permission → write → audit
```

```
src/app/                 routes (App Router): /entrar (sign in), /admin/*, /q/[token] (QR target)
src/modules/             empresas, projetos, obras, elementos, etapas, tempos, notas,
                         fotografias, equipas, utilizadores, auditoria, financeiro, qr
src/lib/permissions.ts   pure permission rules, mirrored by the SQL policies
src/lib/assinatura.ts    signed session cookie (HMAC)
src/i18n/                dictionaries (en.ts, pt.ts), formatters, server/client helpers
supabase/migrations/     Postgres schema, RLS, triggers
scripts/verificar-sql.mjs  runs the migrations in PGlite and asserts the security rules
```

The code and the domain vocabulary are in Portuguese (*obra* = project, *etapa* = stage, *elemento* = item, *registo de tempo* = time entry); the interface is in English and Portuguese.

## Technical decisions

**Multi-tenancy with defence in depth.** Every table has `empresa_id`. Three layers keep companies apart:
1. **App layer** — `podeVerObra()` and `mesmaEmpresa()` in `src/lib/permissions.ts`; every list query takes the company id and every action that receives an id checks it.
2. **Row Level Security** — a *restrictive* policy `empresa_id = (select minha_empresa())` on every table. Restrictive policies are AND-ed with the role policies, so even an admin policy cannot leak another company's rows. The `(select …)` wrapper makes Postgres evaluate the function once per query instead of once per row.
3. **Composite foreign keys** — `(obra_id, empresa_id) → obras(id, empresa_id)`: a project of company A cannot reference a team or person of company B, even from a server task that bypasses RLS.

**Permissions mirrored in SQL.** Every rule in `permissions.ts` has an equivalent policy or trigger in `supabase/migrations`, and both are tested. Field teams only see their teams' projects and only change *status* columns (enforced by a trigger, not just the UI). Financial data lives in separate admin-only tables because RLS works per row, not per column.

**Immutable audit fields.** A trigger forces `criado_em` to the server time and blocks changes to the owner, project and company of a record. Without it, a user could set a future `criado_em` and keep the 24-hour edit window open forever.

**Nothing is hard-deleted.** No `DELETE` policies exist; records are archived (`arquivado_em`, `removido_em`). Every insert/update writes to `historico` (who, what, when, before/after as JSON, reason, source `manual | ia | sync | importacao`).

**Time in quarter hours.** Start rounds down, end rounds up (in the employee's favour), minimum 15 minutes, consecutive entries chain. A Postgres `CHECK` keeps timestamps on quarter hours and an `EXCLUDE USING gist` constraint makes overlapping entries for the same person impossible.

**Idempotent writes.** Records created on a device carry a `clientId` (UUID). Re-sending the same request does not create a duplicate — the foundation for an offline mode.

**Signed demo session.** The demo sign-in stores the person id in an `httpOnly` cookie signed with HMAC-SHA256 (`SESSION_SECRET`). Editing the cookie in the browser invalidates it. Redirects after sign-in only accept internal paths (`//evil.com` and `/\evil.com` are rejected).

**i18n without a library.** `pt.ts` defines the dictionary type; `en.ts` must have exactly the same keys or TypeScript fails. Server messages are written in Portuguese and translated through a map (gettext style); a test scans the actions for every message and fails if one has no English translation. Dates and numbers use `Intl` per language (`en-GB`, `pt-PT`), always in Lisbon time.

**Demo data store.** The UI currently runs on an in-memory store with deterministic seed data (two companies, ~6 months of history), shared across serverless instances through Netlify Blobs. Queries and actions are the only modules that touch it, so swapping in Supabase is a module-by-module change.

## Tests

```bash
npm run typecheck      # TypeScript
npm run lint           # ESLint
npm test               # Vitest
npm run db:verificar   # applies the SQL migrations in PGlite and asserts the RLS rules
npm run build
```

- **Unit tests**: permission rules, quarter-hour rounding, financial calculations, CSV escaping (formula injection), QR tokens, i18n completeness.
- **Server action tests** (`src/modules/acoes.test.ts`): sign-in and forged cookies, cross-company access by changing ids (IDOR), time logging (rounding, overlaps, 7-day limit, 24-hour edit window, idempotency).
- **Database tests** (`scripts/verificar-sql.mjs`): 34 assertions run as real Postgres roles — tenant isolation, composite keys, immutable fields, field teams vs. office, no deletes, quarter hours and overlaps.
- **CI**: every push and pull request runs all of the above on GitHub Actions.

## Roadmap

- Connect Supabase: apply the migrations, replace the demo session with Supabase Auth (email invitations), move queries/actions from the in-memory store to Postgres.
- Photos in a private storage bucket with signed URLs (policies already written).
- Pagination and SQL aggregation for the dashboard (today computed in memory).
- Offline mode for sites without signal: service worker + queue of actions keyed by `clientId`, with a `versao` column for optimistic concurrency so two offline edits of the same record are detected instead of silently overwritten.
- Client portal (phase 2): the whitelist `vistaCliente()` that hides hours, costs and internal notes already exists and is tested.
- Integration with joinery quoting software (`ids_externos`, `sincronizacoes` tables are ready).

## Known limitations

- The SQL schema is tested in PGlite but not yet deployed to a Supabase project.
- Seed data, stage names and history summaries are stored in Portuguese (they are company data, not interface text).
- In production, `SESSION_SECRET` (32+ characters) must be set.

More detail (in Portuguese) in `docs/`: product vision, phases, architecture, data model and permissions. `docs/estudo.md` explains the main concepts used in this project.

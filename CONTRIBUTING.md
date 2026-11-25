# Contributing

## Branches

```
feature/<name>  ──PR──▶  develop  ──PR──▶  main
```

- **main** — stable, always deployable. Protected: changes only arrive through a pull request with a green CI run.
- **develop** — integration branch where finished features meet before a release.
- **feature/\<name\>** — one branch per piece of work, created from `develop` and linked to an issue.

## Pull requests

1. Branch from `develop`: `git switch develop && git pull && git switch -c feature/my-change`.
2. Keep the rules in `CLAUDE.md` in mind (permissions mirrored in SQL, every write through `modules/*/actions.ts`, all UI text in `src/i18n/`).
3. Before pushing, run what CI runs:

   ```bash
   npm run typecheck && npm run lint && npx prettier --check src scripts && npm test && npm run db:verificar && npm run build
   ```

4. Open the PR against `develop`, reference the issue (`Closes #12`) and describe what changed and how it was tested.

## Commit messages

Short, imperative, with a type prefix: `feat: …`, `fix: …`, `docs: …`, `test: …`, `chore: …`, `ci: …`.

## Changing a permission

A rule in `src/lib/permissions.ts` must have the equivalent policy or trigger in `supabase/migrations`, and a test on both sides (`src/modules/acoes.test.ts`, `scripts/verificar-sql.mjs`).

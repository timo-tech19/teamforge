# Contributing

Guide for contributing to TeamForge — branch workflow, coding conventions, and PR process.

## Branch Workflow

We use feature branches with PR-based merges to `main`.

```
main (protected)
 └── feat/feature-name     ← feature work
 └── fix/bug-description   ← bug fixes
 └── docs/what-changed     ← documentation updates
```

### Steps

1. **Start from main:** `git checkout main && git pull`
2. **Create a branch:** `git checkout -b feat/your-feature`
3. **Make changes, commit often** with descriptive messages
4. **Push and create a PR:** `git push -u origin feat/your-feature`
5. **PR must pass CI** before merging (lint, typecheck, migration validation)
6. **Squash merge or merge commit** to main

### Branch Protection

`main` has these protections:
- PRs required (no direct pushes)
- Status checks must pass: "Lint & Type Check", "Unit Tests", "Database Tests"

## Commit Messages

Follow conventional commit format:

```
feat: add project creation dialog
fix: resolve settings page crash on workspace context
docs: add architecture documentation
test: add RLS tests for workspace_members
```

Keep the first line under 70 characters. Add detail in the body if needed.

## Coding Conventions

### File Naming

- **kebab-case** for all files: `create-workspace-dialog.tsx`, `use-mobile.ts`
- No PascalCase or camelCase file names

### Formatting (Biome)

Biome handles formatting and linting. Configuration:
- **Tabs** for indentation
- **Double quotes** for strings
- **Organized imports** (sorted, grouped)
- Run `npx biome check --write src/` to auto-fix

### TypeScript

- Strict mode enabled
- No unused locals or parameters
- Use `#/` alias for imports from `src/` (e.g., `import { Button } from "#/components/ui/button"`)

### Components

- Use shadcn/ui as the component library — install new components with `npx shadcn@latest add <component>`
- shadcn generates files with spaces/no semicolons — run Biome after installing to match project format
- Custom components go in `src/components/`, shadcn primitives stay in `src/components/ui/`

### Server Functions

- Use `createServerFn` from TanStack Start
- Validate inputs with Zod schemas (via `inputValidator`)
- Return `{ error: string }` or `{ error: null, ...data }` — don't throw from handlers
- Use `getSupabaseServerClient()` for database access (cookie-based session)

### Database

- All tables must have RLS enabled
- Use `SECURITY DEFINER` helper functions for policies that reference other RLS-protected tables
- Always set `search_path = ''` on `SECURITY DEFINER` functions
- Wrap `auth.uid()` in `(SELECT auth.uid())` in policies for performance
- Add indexes on foreign key columns (Postgres doesn't auto-index FKs)
- Migrations go in `supabase/migrations/` — create with `npm run db:migrate <name>`

## Testing

### Before Merging

Run both test suites before pushing:

```bash
# Database tests (requires local Supabase running)
supabase test db

# Unit tests
npx vitest run tests/unit/
```

### Writing Tests

- **Database (pgTAP):** Test RLS policies and triggers. See [supabase-testing.md](supabase-testing.md) for the full guide.
- **Unit (Vitest):** Test Zod schemas, pure utility functions, and data transformations.
- **Don't test:** Supabase internals, pixel-perfect UI, or simple CRUD wrappers.

### Test File Locations

```
supabase/tests/          ← pgTAP database tests
tests/unit/              ← Vitest unit tests
```

## PR Process

1. **Title:** Keep under 70 characters, use conventional commit prefix
2. **Description:** Include a summary (what and why) and a test plan
3. **Test plan:** Checklist of manual and automated tests run
4. **Review:** All CI checks must pass before merge

### PR Template

```markdown
## Summary
- Brief description of changes

## Test plan
- [ ] `supabase test db` passes
- [ ] `npx vitest run` passes
- [ ] Manual testing of affected features
```

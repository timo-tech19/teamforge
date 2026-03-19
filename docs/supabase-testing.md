# Supabase pgTAP Testing Guide

A reference for writing database tests for TeamForge using pgTAP and `supabase test db`.

## The Two Worlds: Postgres Role vs Authenticated Role

Supabase RLS policies check two things:
- **`auth.uid()`** — reads from `request.jwt.claims` (the JWT `sub` field)
- **The current role** — policies are defined `TO authenticated`, so they only apply when the session role is `authenticated`

When you're the `postgres` role (default in tests), **RLS is bypassed entirely**. That's why setup code (creating users, inserting data) works without any policies getting in the way.

```
postgres role  →  RLS bypassed  →  use for setup/teardown/assertions
authenticated  →  RLS enforced  →  use for testing actual policy behavior
```

## The Authentication Dance

Every RLS test follows this pattern:

```sql
-- 1. Setup as postgres (RLS bypassed)
INSERT INTO workspaces ...;

-- 2. Switch to authenticated user
SELECT tests.authenticate_as('some_user');   -- sets JWT claims + role

-- 3. Do the operation you're testing (RLS enforced)
SELECT count(*) FROM workspaces;             -- policy decides what's visible

-- 4. Switch back to postgres
SELECT tests.clear_authentication();         -- clears JWT claims
RESET ROLE;                                  -- restores postgres role

-- 5. Assert the result as postgres (can see everything)
SELECT is(...);
```

**Why assert as postgres?** Because if you assert while authenticated, the assertion itself is subject to RLS — you might get 0 rows not because the operation failed, but because you can't *see* the result.

## SECURITY DEFINER — The Bridge Between Worlds

The `authenticated` role can't read `auth.users` or access arbitrary schemas. But sometimes you need data from those while authenticated (like looking up a user ID to insert a row).

`SECURITY DEFINER` functions run with the **creator's privileges** (postgres), regardless of who calls them:

```sql
-- This works even when role is 'authenticated'
tests.get_user_id('some_user')    -- SECURITY DEFINER → reads auth.users as postgres
```

**Important:** You can't use `set_config('role', ...)` inside a `SECURITY DEFINER` function — Postgres blocks it. That's why we use `RESET ROLE` as a separate statement after `clear_authentication()`.

## BEGIN / ROLLBACK — Clean Tests

Every test file is wrapped in `BEGIN` ... `ROLLBACK`. This means:
- All data created during the test is thrown away
- The database is unchanged after tests run
- Tests are isolated from each other
- You can run tests repeatedly without cleanup

## What Makes a Good RLS Test

Test each policy with **three personas**:

| Persona | Purpose |
|---|---|
| **Authorized** (owner/admin) | Verify the happy path works |
| **Wrong role** (member trying admin action) | Verify privilege escalation is blocked |
| **Outsider** (not in workspace at all) | Verify complete isolation |

For each, test the **operation** (SELECT/INSERT/UPDATE/DELETE), not the policy name. A silent failure (UPDATE that affects 0 rows) is just as important as a visible one.

## Silent Failures vs Errors

RLS doesn't always throw errors. It depends on the operation:

- **SELECT** — silently returns 0 rows (no error)
- **UPDATE/DELETE** — silently affects 0 rows (no error)
- **INSERT** — throws `new row violates row-level security policy` error

That's why UPDATE/DELETE tests check that data is **unchanged** rather than catching errors. For INSERT denials, you'd need exception handling (which is tricky in pgTAP — often easier to just test that the row doesn't exist after).

## The `(SELECT auth.uid())` Pattern

Always wrap `auth.uid()` in a subquery in policies:

```sql
-- Bad: called once per row
USING (auth.uid() = user_id)

-- Good: called once, cached
USING ((SELECT auth.uid()) = user_id)
```

This is a performance concern (avoids re-evaluating per row on large tables), not a correctness one. Our policies already follow this pattern.

## Test Helpers Reference

Located in `supabase/tests/00000_test_helpers.sql`:

| Function | Purpose |
|---|---|
| `tests.create_supabase_user('identifier')` | Creates a user in `auth.users` with email `identifier@test.com`. Returns the user's UUID. Triggers `handle_new_user` which auto-creates a profile. |
| `tests.get_user_id('identifier')` | Looks up a test user's UUID. `SECURITY DEFINER` so it works while authenticated. |
| `tests.authenticate_as('identifier')` | Sets JWT claims and switches role to `authenticated`. |
| `tests.clear_authentication()` | Clears JWT claims. **Must be followed by `RESET ROLE;`** to restore postgres. |

## Common Gotchas

- **Temp tables aren't shared across roles** — use `SECURITY DEFINER` helpers like `tests.get_user_id()` instead
- **`finish()` errors on 0 tests** — always have at least 1 assertion per file
- **Test file execution order is alphabetical** — prefix helpers with `00000_` to ensure they run first
- **`RESET ROLE` must be a standalone statement**, not inside a function
- **Always assert as postgres** — switch back before `SELECT is(...)` so RLS doesn't interfere with your assertions

## Running Tests

```bash
# Run all database tests
supabase test db

# Run unit tests (Zod schemas, etc.)
npx vitest run tests/unit/

# Run all tests
supabase test db && npx vitest run tests/unit/
```

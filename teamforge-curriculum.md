# TeamForge — Learning Curriculum

## Overview

A structured learning path for building a production-ready multi-tenant team collaboration platform with Supabase. Each phase builds on the previous one, progressing from understanding Supabase internals to shipping a deployable application.

**Project:** TeamForge — a team workspace platform (simplified Linear meets Basecamp)
**Stack:** Supabase (Postgres, GoTrue, PostgREST, Realtime, Storage, Edge Functions)
**Goal:** Deep understanding of Supabase architecture, database design, and production software engineering

---

## Phase 1 — Supabase Architecture: "What Is Supabase Actually Doing?" ✅ Complete

Understanding the infrastructure layer that most developers never look at.

### Topics Covered
- **Service map:** PostgREST (auto-generated REST API), GoTrue (auth/JWTs), Realtime (WebSocket server, Elixir), Storage API (files/buckets), API Gateway (routing, API key validation), pg_meta (dashboard)
- **Request lifecycle:** Client → API Gateway → PostgREST → Postgres, with JWT parsing and role injection at each step
- **JWT-to-RLS handoff:** PostgREST validates JWT, runs `SET LOCAL role` and `SET LOCAL request.jwt.claims`, enabling `auth.uid()` inside Postgres
- **Three roles:** `anon` (public, no login), `authenticated` (logged-in user), `service_role` (server-side, bypasses RLS via `bypassrls` privilege)
- **Default-deny:** RLS enabled + no matching policy = zero rows returned (safe failure mode)
- **Client initialization:** `createClient()` does zero network calls; `apikey` header always carries anon key for project identification; `Authorization` header swaps from anon key to user JWT after login
- **Token refresh:** Client library automatically exchanges refresh tokens before JWT expiry
- **Postgres schemas:** Logical isolation within a single database using `CREATE SCHEMA` for service boundaries without microservice complexity

### Key Insights
- Postgres is the single source of truth — every Supabase service connects to the same database
- RLS is a deliberate architectural choice, not a workaround — stronger than application-level auth checks scattered across code
- `auth.uid()` is just a Postgres function reading a session variable, not magic
- `SECURITY DEFINER` functions run with creator's privileges — safe on triggers, dangerous on directly callable functions

---

## Phase 2 — Database Design & Migrations ✅ Complete

Schema design for multi-tenancy, migration workflows, and team collaboration patterns.

### Topics Covered
- **Multi-tenant schema:** 8 tables — profiles, workspaces, workspace_members, projects, project_members, tasks, comments, activity_log
- **Junction tables:** Composite primary keys for many-to-many relationships (workspace_members, project_members)
- **Layered access model:** Direct project membership OR workspace admin/owner oversight
- **Postgres enums:** Type-safe role and status values (workspace_role, member_status, task_status, task_priority, project_status, project_role, activity_action)
- **Foreign key strategies:** ON DELETE CASCADE (children die with parent), ON DELETE SET NULL (preserve record, lose reference), choosing based on data importance
- **JSONB for flexible data:** activity_log.metadata stores action-specific structured data without rigid column schemas
- **Composite indexes for RLS:** (workspace_id, user_id), (project_id, user_id) for fast policy evaluation
- **Query-optimized indexes:** (workspace_id, created_at DESC) for reverse-chronological activity feeds
- **Profiles pattern:** public.profiles extends auth.users with application data; trigger auto-creates on signup
- **Migration-only workflow:** Drop declarative schemas in favor of sequential migration files — the single source of truth
- **Team workflow:** Git branches → write migration → test locally with `supabase db reset` → PR + review → merge → deploy with `supabase db push`
- **Migration squashing:** `supabase migration squash` collapses completed migrations; only squash what's been applied everywhere
- **Schema snapshots:** `supabase db dump --local` for reading current state without replaying migrations

### Key Insights
- `workspace_members` is the most-queried table in the system — every RLS check flows through it
- Composite primary keys on junction tables prevent duplicate memberships structurally
- Every RLS EXISTS subquery needs a composite index on the columns in its WHERE clause
- Default-deny + enums + NOT NULL constraints = multiple layers of data integrity
- The `position` column on tasks enables drag-and-drop ordering

---

## Phase 3 — Authentication & Authorization Deep Dive ✅ Complete

### Topics Covered
- **RLS policy types:** SELECT (USING), INSERT (WITH CHECK), UPDATE (USING + WITH CHECK), DELETE (USING)
- **TO clause:** Scoping policies to specific database roles (anon, authenticated) — gate at the entrance vs fine-grained filter
- **SQL foundations:** SELECT, WHERE, JOIN, subqueries, IN vs EXISTS, correlated subqueries
- **EXISTS pattern:** Correlated subqueries that short-circuit — the standard RLS building block
- **Layered access policies:** Two-path EXISTS (direct membership OR admin oversight) for project-scoped resources
- **Multi-join policies:** Comments chain through tasks → projects → workspace_members for access checks
- **Self-referencing policies:** workspace_members SELECT policy references its own table
- **Data integrity in policies:** INSERT WITH CHECK ensuring author_id = auth.uid() prevents impersonation
- **Moderation policies:** Project leads and workspace admins can delete any comment
- **Trigger functions:** handle_new_user (profile creation), handle_new_workspace_owner (bootstrap membership)
- **SECURITY DEFINER:** Safe on triggers (not directly callable), dangerous on RPC functions
- **Complete policy set:** profiles, workspaces, workspace_members, projects, tasks, comments, activity_log
- **Auth flows:** Email/password, OAuth, magic links, phone OTP — all converge to the same JWT session
- **JWT anatomy:** Header (algorithm), payload (claims including sub, role, exp), signature (tamper protection). Base64-encoded, not encrypted. Decode at jwt.io for debugging.
- **Custom claims:** Can embed role data in JWT for performance, but creates staleness issues. TeamForge queries workspace_members instead.
- **Session management:** Access token (1hr) + refresh token (7 days). Client auto-refreshes before expiry. Page reloads restore session from stored tokens.
- **Server-side auth with TanStack Start:** createServerClient from @supabase/ssr reads tokens from cookies. Loaders validate auth with getUser() before rendering. Route protection via beforeLoad + redirect.
- **getUser() vs getSession():** getSession() decodes JWT locally (fast, could be stale). getUser() verifies with GoTrue (slower, guaranteed valid). Use getUser() for security-critical checks.
- **Email confirmation:** GoTrue sends confirmation email → user clicks link → app exchanges token → email marked confirmed
- **Password reset:** resetPasswordForEmail → email with link → user sets new password → updateUser()
- **Auth callback route:** Single /auth/callback route handles all redirects (email confirm, password reset, OAuth)
- **Redirect URL configuration:** Must be set in both Supabase dashboard and OAuth providers; misconfiguration is a common production bug

### Key Insights
- `TO authenticated` is a role-level gate; `auth.uid()` in USING is a row-level filter — two different layers
- EXISTS is preferred over IN for RLS because it short-circuits and returns boolean
- Every EXISTS subquery needs two anchors: the current row (table column) and the current user (auth.uid())
- The hardest policies chain multiple JOINs inside EXISTS — comments → tasks → projects → workspace_members
- Activity log uses no INSERT/UPDATE/DELETE policies for authenticated users — entries created only by SECURITY DEFINER triggers
- All auth methods produce identical sessions — RLS doesn't know or care how a user authenticated
- JWTs are readable by anyone (Base64, not encrypted) — the signature prevents tampering, not reading
- Cookie-based token storage is required for SSR frameworks like TanStack Start so the server can access the session

---

## Phase 4 — API Layer & Data Access Patterns ✅ Complete

### Topics Covered
- **PostgREST schema introspection:** Reads foreign keys on startup to auto-generate relationships. Schema design = API design.
- **Embedded selects:** Many-to-one (`tasks → projects`), one-to-many (`projects → tasks`), many-to-many through junction tables (`workspaces → workspace_members → profiles`). Nested embedding for multi-hop joins.
- **Foreign key hints:** `!column_name` syntax to disambiguate when a table has multiple FKs to the same target (e.g., `profiles!assigned_to` vs `profiles!created_by`)
- **Query-to-SQL mapping:** `.from()` = FROM, `.select()` = SELECT, `.eq()` = WHERE =, `.gt/.lt` = WHERE >/< , `.order()` = ORDER BY, `.limit()` = LIMIT, `.range()` = LIMIT + OFFSET
- **Pagination — offset-based:** `.range(start, end)` — simple but has duplication bugs on live data and degrades at high offsets
- **Pagination — cursor-based:** `.lt('created_at', lastSeen)` — no duplicates, constant performance, preferred for feeds and long lists
- **RPC functions:** Wrap multi-step operations in database transactions for atomicity. Called via `supabase.rpc()`. Use when multiple tables must update together or business logic is complex.
- **SECURITY INVOKER vs DEFINER on RPCs:** INVOKER preserves caller's RLS (preferred for user-callable functions). DEFINER bypasses RLS (use only for triggers/admin operations).
- **When to use RPC vs direct access:** Single-table CRUD → direct access. Multi-step atomic operations → RPC.
- **EXPLAIN ANALYZE:** Query profiling tool. Shows index usage, row counts, execution time. "Seq Scan" = missing index. "Index Scan" = fast path. Run in Supabase SQL editor or CLI.
- **Data fetching strategy:** Co-locate related data in single queries for UI components. Separate queries for unrelated components. Use loaders for server-side fetching in TanStack Start.

### Key Insights
- PostgREST auto-generates JOINs from foreign keys — if you forget a FK in your schema, the embedded select won't work
- Cursor-based pagination is always preferred over offset-based for production feeds
- RPC functions give you database transactions — both operations succeed or both fail, no inconsistent state
- EXPLAIN ANALYZE is the first debugging tool when queries feel slow — check for Seq Scan

---

## Phase 5 — Realtime & Presence ✅ Complete

### Topics Covered
- **HTTP vs WebSocket:** HTTP is stateless and client-initiated only (polling). WebSocket is a persistent, bidirectional channel upgraded from HTTP. Server can push data instantly.
- **WebSocket tradeoff:** Faster and more efficient than polling, but requires stable connection. Network drops kill the channel silently.
- **Postgres CDC:** Realtime reads from Postgres's Write-Ahead Log (WAL) via logical replication. Zero-delay notification of changes — same mechanism used for database replicas.
- **Realtime server architecture:** Separate Elixir server, not part of PostgREST. Manages WebSocket connections and channel subscriptions.
- **Three channel types:**
  - `postgres_changes` — listens for database INSERT/UPDATE/DELETE events. CDC-powered. Use for data that lives in Postgres (tasks, comments, rides).
  - `broadcast` — arbitrary client-to-client messages through the server. No database. Use for ephemeral data (cursor positions, typing indicators).
  - `presence` — tracks who's currently connected. Auto-removes on disconnect. Use for "who's online" indicators.
- **Fetch-on-reconnect pattern:** Realtime is a live stream, not a replay. Events during disconnection are lost. Always pair Realtime with an HTTP fetch on SUBSCRIBED status to fill gaps. This fires on both initial connection and reconnection.
- **Connection status monitoring:** Subscribe callback provides SUBSCRIBED, CHANNEL_ERROR, CLOSED states. Show UI indicators so users know connection health.
- **RLS and Realtime:** `postgres_changes` respects RLS per-event — clients only receive events for rows they can access. `broadcast` and `presence` check permissions at subscription time, not per-message — channel naming strategy matters.
- **Cost implications:** Each WebSocket connection uses server resources. Monitor concurrent connections against plan limits. Relevant for apps with many always-connected users (like drivers).

### Key Insights
- Never rely on Realtime alone — always pair with HTTP fetch to fill disconnection gaps
- The fetch-on-reconnect pattern solves most "Realtime isn't working" bugs in production
- postgres_changes is for database state, broadcast is for ephemeral messages, presence is for connection tracking
- Channel naming should scope to access boundaries (workspace:uuid, not global channels)
- Presence auto-removes disconnected users — no manual cleanup needed

---

## Phase 6 — Edge Functions & Background Processing ✅ Complete

### Topics Covered
- **What Edge Functions solve:** Server-side code for calling external APIs, holding secrets, running business logic that can't live in the browser or database
- **Deno runtime:** TypeScript-first, V8 isolates, URL imports, browser-standard APIs (fetch, Request, Response)
- **Three invocation patterns:** Client invocation (supabase.functions.invoke, carries user JWT), database webhook (pg_net trigger, uses service_role), scheduled cron (pg_cron, uses service_role)
- **supabase.functions.invoke() vs raw fetch:** invoke() handles auth headers, token refresh, and URL construction automatically. Raw fetch requires manual header management and is the primary cause of auth failures and no-verify-jwt workarounds.
- **no-verify-jwt danger:** Disables all auth on the function endpoint. Anyone with the URL can call it. Only appropriate for public webhooks (e.g., Stripe callbacks).
- **Service role key vs user JWT in functions:** User-triggered functions should forward the user's JWT via Authorization header and use anon key — RLS applies. System-triggered functions (webhook, cron) use service_role key — RLS bypassed. Some functions need both: verify with user client, act with admin client.
- **Edge Functions vs traditional servers:** Edge Functions are ephemeral (per-request lifecycle), auto-scale to zero, limited to ~150s execution and ~150MB memory, have cold starts. Servers are persistent, hold state and connections, unlimited execution, but require ops management. Edge Functions suit focused tasks; servers suit heavy/persistent workloads.
- **Background processing pattern:** Decouple side effects from user responses. Task INSERT returns immediately; trigger fires Edge Function asynchronously for notifications, logging.
- **Scheduled functions:** pg_cron extension runs SQL on a cron schedule, calling Edge Functions via pg_net HTTP for daily digests, cleanup jobs.
- **Best practices:** One function per job. Validate inputs. Handle errors with meaningful responses. Use secrets (supabase secrets set) never hardcode. Parallelize external API calls with Promise.all. Use the right Supabase client for the context.

### Key Insights
- Always use supabase.functions.invoke() from the client — never raw fetch. This eliminates most auth issues.
- no-verify-jwt is a security hole, not a fix. The real fix is correct auth header management.
- Choose the Supabase client based on who triggered the function: user JWT for user actions, service_role for system actions
- Edge Functions excel at short, focused server-side tasks. If you need persistent connections, heavy compute, or long-running jobs, you need a traditional server.
- Cold starts (200-500ms) exist but are rarely noticeable for user-facing actions

---

## Phase 7 — Storage & File Handling ✅ Complete

### Topics Covered
- **Why files don't live in Postgres:** Databases are optimized for structured, queryable data. Files are large opaque blobs. Storing them in rows bloats queries, memory, and costs. Object storage (S3) is purpose-built for large files with HTTP serving and caching.
- **Pattern:** Store file in object storage, store metadata (path, filename, size, uploader) in Postgres. The database row references the file, not the file itself.
- **Buckets:** Top-level containers with their own access rules. Public buckets (avatars) serve files without auth. Private buckets (attachments) require JWT or signed URLs.
- **storage.objects table:** A real Postgres table in the `storage` schema. Every uploaded file creates a metadata row. Storage policies are SQL on this table — same engine as RLS, different target.
- **Storage policy enforcement:** Storage API receives request → parses JWT → queries storage.objects with policies applied → if allowed, fetches from S3 and streams to client. Access decision in Postgres, file delivery from S3.
- **Folder structure as access control:** Organizing files as `attachments/{project_id}/{task_id}/{filename}` lets policies extract the project ID with `storage.foldername(name)` and check project membership.
- **Relative paths vs absolute URLs:** Store relative paths in the database (e.g., `user-uuid.jpg`), construct full URLs at runtime. Absolute URLs break on migration, project changes, or domain changes. Exception: externally-hosted URLs you don't control (OAuth profile pictures).
- **Signed URLs:** Temporary URLs with cryptographic token and expiry for private file access. Generated via `createSignedUrl(path, expirySeconds)`.
- **Expired signed URLs UX:** Generate signed URLs on click (not page load) for downloads. For inline image previews, refresh URLs on an interval before expiry. Pages left open for hours still work because every interaction generates fresh URLs.
- **task_attachments table:** Separate table linking files to tasks with metadata (file_path, file_name, file_size, uploaded_by).

### Key Insights
- Storage policies are SQL on storage.objects — same skills as RLS, just a different table
- Folder structure in object storage doubles as an access control mechanism
- Always store relative paths, construct full URLs in application code
- Generate signed URLs at interaction time, not at render time — avoids expiry problems

---

## Phase 8 — Production Hardening ✅ Complete

### Topics Covered
- **Connection pooling (Supavisor):** Each Postgres connection uses ~10MB RAM. Direct connections limited by plan. Supavisor multiplexes many client connections into fewer database connections — queries take 5-50ms so connections are idle 95% of the time. Use pooler connection string (port 6543) from Edge Functions and external services.
- **Cost anatomy:** Database size (tables, indexes, WAL), bandwidth/egress (API responses, file downloads, Realtime events), Edge Function invocations, Realtime concurrent connections, Storage size. Egress is the biggest surprise — select only columns you need.
- **Error handling:** Supabase client returns `{ data, error }` and never throws. Silent failures if error unchecked. Handle specific codes: PGRST301 (RLS violation), rate limits (back off and retry), unknown errors (log and show user-friendly message).
- **Rate limiting:** Supabase rate limits auth and API endpoints. Fix is architectural: batch requests, cache with TanStack Query, avoid unnecessary refetches.
- **Monitoring:** Dashboard tracks CPU, connections, API volume, storage, Edge Functions. Most important: check slowest queries page, run EXPLAIN ANALYZE on anything over 200ms.
- **Select optimization:** `select('id, title, status')` vs `select('*')` reduces egress and speeds queries.

### Key Insights
- Connection pooling is essential at scale — 100 users don't need 100 database connections
- Egress is often the biggest cost driver — be deliberate about what you fetch
- The Supabase client never throws — always check `error` or failures are silent
- Monitor slowest queries and check for missing indexes on RLS-heavy tables

---

## Phase 9 — Team Workflows & CI/CD ✅ Complete

### Topics Covered
- **Three environments:** Local (Supabase CLI, free, disposable), Staging (hosted, mirrors production config, test migrations here first), Production (real users, changes only via CI/CD pipeline).
- **Golden rule:** Never make manual changes to production through the dashboard. Every change flows through migration files in Git.
- **CI/CD with GitHub Actions:** Merge to main → auto-push migrations to staging → verify → promote to production. Prevents accidental production deployments.
- **New developer onboarding:** Five commands from zero to running app — clone, install CLI, supabase start, supabase db reset, npm run dev. Migrations are the documentation.
- **Minimum viable documentation:** Spec file (architectural overview, in repo), README (setup commands, env vars, migration workflow), inline SQL comments explaining why not what.

### Key Insights
- Migrations are documentation — a new engineer can understand the database by reading the migration history
- Never modify production through the dashboard — CI/CD pipeline is the only path
- Five-command onboarding is possible when you commit to migration-only workflow
- Comment the "why" in migrations, not the "what" — the SQL already says what

---

## Phase 10 — Testing ✅ Complete

### Topics Covered
- **Testing philosophy for Supabase apps:** Highest-risk logic lives in the database (RLS, triggers, functions), not the UI. A broken policy is a data breach, not a visual bug. Invest testing effort where risk is highest.
- **Testing pyramid:** Database tests (pgTAP, highest priority) → Integration tests (Vitest + Supabase client, high priority) → Unit tests (Vitest, normal priority). Most teams test the top and skip the bottom — that's backwards.
- **Database tests with pgTAP:** SQL-based tests using `supabase test db`. Create test users with `tests.create_supabase_user()`, switch identity with `tests.authenticate_as()`, assert with `is()` and `throws_ok()`. Tests run in a transaction that rolls back — no cleanup needed.
- **RLS policy testing pattern:** For every table, test three roles — authorized user (can access), different-role user (may have limited access), outsider (zero access). Test all four operations (SELECT, INSERT, UPDATE, DELETE) against each role.
- **Trigger testing:** Verify handle_new_user creates profile row. Verify handle_new_workspace_owner creates membership with correct role and status.
- **RPC function testing:** Verify atomicity — complete_task must update status AND create activity log entry. If one fails, both should roll back.
- **Integration tests:** Vitest + Supabase client against local instance (localhost:54321). Test critical user flows: workspace creation, member invitation, task lifecycle, cross-workspace isolation.
- **Unit tests:** Pure client-side logic — data transformations, formatters, validators. Mock Supabase client for component tests, but prefer integration tests for database-dependent logic.
- **What NOT to test:** Supabase service internals, PostgREST query translation, GoTrue auth flows, pixel-perfect UI rendering.
- **CI/CD integration:** `supabase test db` + integration tests + unit tests all run in GitHub Actions. `needs: test` on deploy job blocks deployment if any test fails. No untested RLS policy reaches production.

### Key Insights
- Test what hurts most when it breaks — RLS policies and triggers are your security layer
- pgTAP tests run in transactions that roll back — fast, clean, no test data pollution
- Three roles per table is the minimum: authorized, limited, outsider
- Integration tests against local Supabase catch issues that mocked unit tests miss
- CI/CD must gate deploys on test passage — the pipeline is your safety net

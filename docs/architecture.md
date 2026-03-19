# Architecture

TeamForge is a multi-tenant team collaboration platform built with TanStack Start (SSR) and Supabase.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | TanStack Start (SSR) + TanStack Router (file-based routing) |
| Data fetching | TanStack Query (via server functions) |
| Database | Supabase (Postgres) with Row-Level Security |
| Auth | Supabase Auth with cookie-based SSR sessions |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Linting/Formatting | Biome (tabs, double quotes, organized imports) |
| Testing | Vitest (unit), pgTAP (database) |
| CI/CD | GitHub Actions |

## Project Structure

```
teamforge/
├── .github/workflows/     # CI (lint, typecheck, migrations) + CD (deploy migrations)
├── docs/                  # Project documentation
├── supabase/
│   ├── migrations/        # Postgres migrations (deployed via CI/CD)
│   └── tests/             # pgTAP database tests
├── tests/
│   └── unit/              # Vitest unit tests (schemas, validators)
├── src/
│   ├── components/        # React components
│   │   └── ui/            # shadcn/ui primitives
│   ├── hooks/             # Custom React hooks
│   ├── lib/
│   │   ├── auth/          # Auth server functions + schemas
│   │   ├── supabase/      # Supabase client factories + generated types
│   │   └── workspace/     # Workspace server functions + schemas
│   ├── routes/            # File-based route tree (TanStack Router)
│   ├── router.tsx         # Router configuration
│   ├── routeTree.gen.ts   # Auto-generated route tree (do not edit)
│   └── styles.css         # Global styles + CSS variables
├── vitest.config.ts       # Vitest configuration
└── biome.json             # Biome linter/formatter config
```

## Route Architecture

TanStack Router uses file-based routing. The route tree has two branches:

```
__root.tsx                    ← bare HTML shell (no header/footer)
├── _public.tsx               ← pathless layout: header + footer
│   ├── _public/index.tsx     ← / (landing page)
│   ├── _public/login.tsx     ← /login
│   ├── _public/signup.tsx    ← /signup
│   └── _public/workspaces.tsx ← /workspaces (workspace list)
└── w/$slug.tsx               ← workspace layout: shadcn sidebar
    ├── w/$slug/index.tsx     ← /w/:slug (dashboard)
    └── w/$slug/settings.tsx  ← /w/:slug/settings
```

### Key Concepts

**Pathless layouts** (`_public.tsx`) add a layout wrapper without adding a URL segment. The `_public` prefix means "invisible in the URL."

**`shellComponent` vs `component`** on the root route:
- `shellComponent` renders the `<html>` shell for SSR streaming — can't access route data
- `component` renders inside the shell and provides the `<Outlet />` for child routes

**Data flow between routes:**
- `beforeLoad` data → **route context** (cascades to all children automatically)
- `loader` data → **loader data** (scoped to that route; children use `getRouteApi()` to access)

### Auth Guards

| Route | Guard | Behavior |
|---|---|---|
| `/`, `/login`, `/signup` | `beforeLoad`: redirect if logged in | Sends authenticated users to `/workspaces` |
| `/workspaces` | `beforeLoad`: redirect if NOT logged in | Sends anonymous users to `/login` |
| `/w/$slug/*` | `beforeLoad`: redirect if NOT logged in | Sends anonymous users to `/login` |

The `_public` layout also runs a `loader` that fetches the user profile for the auth-aware header (shows avatar + name when logged in, sign in/up buttons when not).

## Database Schema

### Tables

```
profiles           ← 1:1 with auth.users (auto-created via trigger)
workspaces         ← tenant boundary, has slug for URLs
workspace_members  ← junction: users ↔ workspaces (role + status)
projects           ← belongs to workspace
project_members    ← junction: users ↔ projects (role)
tasks              ← belongs to project
comments           ← belongs to task
activity_log       ← audit trail per workspace
```

### Enums

| Enum | Values |
|---|---|
| `workspace_role` | owner, admin, member, viewer |
| `member_status` | pending, active |
| `project_role` | lead, member, viewer |
| `project_status` | active, paused, archived |
| `task_status` | backlog, todo, in_progress, in_review, done |
| `task_priority` | low, medium, high, urgent |
| `activity_action` | task_created, task_updated, task_deleted, comment_added, member_invited, member_removed, project_created, project_archived |

### Row-Level Security

Every table has RLS enabled with default-deny. Policies use `SECURITY DEFINER` helper functions to avoid infinite recursion on self-referencing tables:

| Helper Function | Purpose |
|---|---|
| `is_workspace_member(workspace_id)` | Check if current user is a member of the workspace |
| `get_workspace_role(workspace_id)` | Get current user's role in the workspace |
| `is_project_member(project_id)` | Check if current user is a member of the project |
| `get_project_role(project_id)` | Get current user's role in the project |
| `is_workspace_admin_for_project(project_id)` | Check if current user is workspace admin (via project) |
| `is_workspace_admin_for_task(task_id)` | Check if current user is workspace admin (via task) |

These helpers are `SECURITY DEFINER` with `search_path = ''` to prevent search_path hijacking.

### Triggers

| Trigger | Table | Action |
|---|---|---|
| `on_auth_user_created` | `auth.users` | Creates a `profiles` row with `display_name` from user metadata |
| `on_workspace_created` | `workspaces` | Creates a `workspace_members` row with `owner` role for the creator |

## Auth Flow

1. **Signup:** Client validates with Zod → `signupWithEmail` server function → Supabase `auth.signUp()` → trigger creates profile → auto-login → `router.invalidate()` → redirect to `/workspaces`
2. **Login:** Client validates with Zod → `loginWithEmail` server function → Supabase `auth.signInWithPassword()` → `router.invalidate()` → redirect to `/workspaces`
3. **Session:** Cookie-based via `@supabase/ssr`. Server client reads cookies on each request. Browser client manages cookie refresh.
4. **Logout:** `logout` server function → `auth.signOut()` → `window.location.href = "/"` (full page reload to clear all state)

### Server Functions

Server functions use `createServerFn` from TanStack Start. They run on the server and are called from client components via RPC.

| Function | Method | Purpose |
|---|---|---|
| `getUser` | GET | Get current auth user (or null) |
| `getUserProfile` | GET | Get display name + avatar from profiles table |
| `loginWithEmail` | POST | Sign in with email/password |
| `signupWithEmail` | POST | Create account with display name |
| `logout` | POST | Sign out and clear session |
| `listWorkspaces` | GET | List workspaces for current user (with role) |
| `getWorkspaceBySlug` | GET | Get workspace by URL slug |
| `createWorkspace` | POST | Create workspace (auto-adds creator as owner) |
| `updateWorkspace` | POST | Update workspace name |
| `deleteWorkspace` | POST | Delete workspace (owner only, enforced by RLS) |

## CI/CD

### CI (Pull Requests)

Runs on every PR to `main`:
1. **Lint & Type Check** — Biome check + `tsc --noEmit`
2. **Unit Tests** — Vitest unit tests (schemas, validators)
3. **Database Tests** — starts local Supabase, verifies migrations, runs pgTAP tests

### CD (Merge to Main)

Runs on push to `main`:
1. **Deploy migrations** — links to production Supabase project and runs `supabase db push`

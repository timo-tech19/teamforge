# TeamForge

A multi-tenant team collaboration platform for small-to-medium teams (5-50 people). Workspace-based project management with real-time collaboration, role-based access, and database-enforced security.

## Features

- **Workspaces** — Isolated team environments with owner/admin/member/viewer roles
- **Auth** — Email/password signup + login with auto-created profiles
- **Role-based access** — Row-Level Security on every table, enforced at the database level
- **Dark mode** — Light/dark/system theme with no flash on load
- **Responsive sidebar** — Collapsible workspace sidebar (keyboard shortcut: Ctrl+B)

### Coming Soon

- Project boards (kanban + list views)
- Task tracking with drag-and-drop
- Member invitations and role management
- Threaded comments on tasks
- Real-time updates via Supabase Realtime
- File attachments
- Activity feed

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR) + [TanStack Router](https://tanstack.com/router) |
| Database | [Supabase](https://supabase.com) (Postgres + Auth + Realtime) |
| Styling | [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com) |
| Linting | [Biome](https://biomejs.dev) |
| Testing | [Vitest](https://vitest.dev) + [pgTAP](https://pgtap.org) |

## Getting Started

### Prerequisites

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli/getting-started)
- Docker (for local Supabase)

### Setup

```bash
# Clone and install
git clone https://github.com/timo-tech19/teamforge.git
cd teamforge
npm install

# Start local Supabase (runs Postgres, Auth, etc. in Docker)
supabase start

# Generate TypeScript types from the database
npm run db:gen-types

# Start the dev server
npm run dev
```

The app runs at `http://localhost:3000`. Local Supabase dashboard is at `http://localhost:54323`.

### Environment

Local development uses the Supabase CLI's local stack — no `.env` file needed. The Supabase client is configured to connect to `localhost:54321` in development.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server on port 3000 |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest unit tests |
| `npm run check` | Run Biome linter + formatter check |
| `npm run db:gen-types` | Regenerate TypeScript types from local Supabase |
| `npm run db:reset` | Reset local database (re-run all migrations) |
| `npm run db:migrate` | Create a new migration file |

## Testing

```bash
# Unit tests (Zod schemas, validators)
npx vitest run tests/unit/

# Database tests (RLS policies, triggers) — requires local Supabase
supabase test db
```

See [docs/supabase-testing.md](docs/supabase-testing.md) for the pgTAP testing guide.

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/architecture.md) | Tech stack, route structure, database schema, auth flow |
| [Contributing](docs/contributing.md) | Branch workflow, coding conventions, PR process |
| [Supabase Testing](docs/supabase-testing.md) | Guide to writing pgTAP database tests |

## Project Structure

```
src/
├── components/        # React components (+ ui/ for shadcn primitives)
├── hooks/             # Custom React hooks
├── lib/               # Server functions, Supabase clients, utilities
├── routes/            # File-based route tree
│   ├── _public/       # Public pages (landing, auth, workspace list)
│   └── w/$slug/       # Workspace pages (dashboard, settings)
└── styles.css         # Global styles + CSS variables

supabase/
├── migrations/        # Postgres migrations
└── tests/             # pgTAP database tests

tests/
└── unit/              # Vitest unit tests
```

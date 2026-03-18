# TeamForge — Project Specification

## Product Overview

TeamForge is a multi-tenant team collaboration platform for organizing work across teams and projects. It provides workspace-based team management, project organization, task tracking with board views, threaded comments, real-time updates, file attachments, and an activity feed.

**Target users:** Small-to-medium teams (5–50 people) who need structured project management — especially teams transitioning from ad-hoc coordination to organized workflows.

**Core value proposition:** Teams should only see work that concerns them. Non-technical team members (operations, marketing) shouldn't be overwhelmed by technical project details, while leadership retains oversight across all projects.

---

## Tech Stack

### Phase 1: Web Application (primary)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | TanStack Start | Full-stack React framework — type-safe routing, SSR, server functions, Vite-powered |
| Routing | TanStack Router | File-based, type-safe routing with loaders and SWR caching |
| Data Fetching | TanStack Query | Server state management, caching, optimistic updates |
| Styling | Tailwind CSS | Utility-first styling |
| Backend | Supabase | Auth, database, API, realtime, storage, edge functions |
| Database | PostgreSQL (via Supabase) | Single source of truth |
| Auth | GoTrue (via Supabase) | Email/password, OAuth, magic links |
| API | PostgREST (via Supabase) | Auto-generated REST API from schema |
| Realtime | Supabase Realtime | Live updates, presence |
| Storage | Supabase Storage | File attachments |
| Edge Functions | Deno (via Supabase) | Background processing, notifications |

### Phase 2: Mobile Application (future)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Mobile | Expo React Native | Cross-platform iOS + Android |
| Shared | Supabase (same project) | Same backend, same database, same auth |

The web app is the primary deliverable. The mobile app will share the same Supabase backend — no API changes needed since both clients talk to the same PostgREST and GoTrue endpoints.

---

## Frontend Architecture

### Design Direction
- **Aesthetic:** Clean and minimal, inspired by Linear. Lots of whitespace, subtle borders, muted colors with purposeful accent color. No visual clutter.
- **Dark mode:** Supported from day one via CSS variables. Dark gray backgrounds (not pure black).
- **Typography:** System font stack via Tailwind defaults. One weight for body (400), one for emphasis (500). Spare use of bold.
- **Motion:** Subtle transitions on hover/focus. Slide-over panels for task detail. No gratuitous animation.

### Frontend Dependencies

| Package | Purpose |
|---------|---------|
| `@tanstack/react-start` | Full-stack framework (SSR, server functions, routing) |
| `@tanstack/react-router` | Type-safe file-based routing with loaders |
| `@tanstack/react-query` | Server state, caching, optimistic updates |
| `tailwindcss` | Utility-first styling |
| `shadcn/ui` | Component primitives (Button, Dialog, Command, Sheet, Table, etc.) |
| `lucide-react` | Icon library (used by shadcn/ui) |
| `@dnd-kit/core` + `@dnd-kit/sortable` | Drag-and-drop for kanban board |
| `@supabase/supabase-js` | Supabase client (browser) |
| `@supabase/ssr` | Supabase client (server-side, cookie-based) |
| `cmdk` | Command palette (via shadcn/ui Command component) |
| `sonner` | Toast notifications |

### App Layout

```
┌──────────────────────────────────────────────────┐
│ App shell (authenticated routes only)            │
│ ┌────────────┬──────────────────────────────────┐│
│ │            │ Breadcrumbs / Page title    [?][P]││
│ │  Sidebar   │──────────────────────────────────││
│ │  (240px)   │                                  ││
│ │            │   Main content area              ││
│ │ Workspace  │   (page-specific content)        ││
│ │ switcher   │                                  ││
│ │ Dashboard  │                                  ││
│ │ My tasks   │                                  ││
│ │ Activity   │                                  ││
│ │ Projects   │                                  ││
│ │  > Alpha   │                                  ││
│ │  > Beta    │                                  ││
│ │ Members    │                                  ││
│ │ Settings   │                                  ││
│ └────────────┴──────────────────────────────────┘│
└──────────────────────────────────────────────────┘
```

Sidebar is collapsible on mobile. Workspace switcher dropdown at top of sidebar. Projects listed with expand/collapse. Online presence dots next to member names.

### Route Map

**Public routes (no auth)**
- `/` — Landing page
- `/login` — Email/password + OAuth sign in
- `/signup` — Create account
- `/auth/callback` — OAuth, magic link, email confirm handler
- `/reset-password` — Request password reset
- `/update-password` — Set new password from email link

**Workspace selection (auth required)**
- `/workspaces` — List user's workspaces, create new
- `/workspaces/new` — Create workspace form
- `/invite/:token` — Accept workspace invitation

**Workspace pages (sidebar layout)**
- `/w/:slug` — Dashboard (overview, recent activity, stats)
- `/w/:slug/my-tasks` — Tasks assigned to current user across all projects
- `/w/:slug/activity` — Full workspace activity feed (cursor-paginated)
- `/w/:slug/members` — Member list, invite members, manage roles
- `/w/:slug/settings` — Workspace name, slug, danger zone

**Project pages**
- `/w/:slug/p/:projectId` — Project overview (description, members, stats)
- `/w/:slug/p/:projectId/board` — Kanban board (columns by status)
- `/w/:slug/p/:projectId/list` — Table/list view of tasks
- `/w/:slug/p/:projectId/settings` — Project name, members, archive/delete

**Task detail (slide-over panel)**
- `/w/:slug/p/:projectId/t/:taskId` — Task detail with comments, attachments, activity

**User settings**
- `/settings/profile` — Display name, avatar upload
- `/settings/account` — Email, password, delete account

### Key Pages Description

**Workspace dashboard** (`/w/:slug`)
Overview cards showing: number of active projects, tasks due this week, recent activity stream (last 10 items). Quick-add task shortcut. Online members shown in sidebar.

**Kanban board** (`/w/:slug/p/:projectId/board`)
Five columns: Backlog, Todo, In progress, In review, Done. Task cards show title, priority badge, assignee avatar, due date (if set). Cards are draggable between columns using @dnd-kit. Dropping a card updates `status` and `position` via optimistic mutation. Empty columns show "no tasks" placeholder with add button.

**Task detail** (slide-over from board or list)
Right-side panel (Sheet component) showing: task title (editable inline), description (editable, markdown support later), status/priority/assignee selectors, due date picker, file attachments list, comments thread (newest at bottom), task activity log. URL updates to `/w/:slug/p/:projectId/t/:taskId` so it's shareable.

**My tasks** (`/w/:slug/my-tasks`)
Grouped by project, showing all tasks assigned to the current user. Filterable by status and priority. This is the "what should I work on today" view.

**Members page** (`/w/:slug/members`)
Table of workspace members showing name, email, role, joined date, online status. Invite button opens dialog with email input. Role management dropdown (owner/admin can change roles). Remove member button with confirmation.

**Activity feed** (`/w/:slug/activity`)
Chronological feed of workspace events: task created, task completed, member joined, project created, etc. Each entry shows actor avatar, action description, timestamp. Cursor-paginated (load more on scroll). Realtime updates via postgres_changes subscription.

### UI Patterns

**Command palette (Cmd+K)**
Global search and navigation. Sections: recent tasks, projects, members, actions (create task, create project, invite member). Built with shadcn/ui Command component (cmdk).

**Optimistic updates**
Task mutations (status change, assignment, priority) update the UI immediately. TanStack Query's `useMutation` with `onMutate` patches the cache optimistically, `onError` reverts, `onSettled` refetches for consistency.

**Real-time integration**
Board subscribes to `postgres_changes` on tasks table filtered by project_id. Presence tracked on workspace channel. Toasts shown for changes by other users ("Sarah moved 'Fix login' to Done"). Fetch-on-reconnect pattern for every subscription.

**Loading states**
Skeleton loaders (shadcn/ui Skeleton) for initial page loads. No full-page spinners. Inline loading indicators for mutations. Error boundaries with retry buttons for failed loads.

**Empty states**
Custom illustrations or simple text for: no workspaces yet, no projects in workspace, no tasks in project, no comments on task. Each includes a primary action button (create workspace, create project, add task).

**Toast notifications (sonner)**
Success: "Task created", "Member invited". Error: "Failed to update task. Please try again." Info: "Sarah completed 'Fix login bug'" (from Realtime).

---

## Architecture Decisions

### Multi-tenancy Model
- **Tenant boundary:** Workspaces
- **Isolation mechanism:** Row Level Security (RLS) policies on every table
- **Access model:** Layered — project-level membership for granular access, workspace admin/owner for oversight
- **Single database:** All workspaces share one Postgres database; isolation is enforced by RLS, not separate databases

### Access Control Hierarchy
1. **Workspace Owner** — full access to all workspace resources, can manage members and billing
2. **Workspace Admin** — can see all projects (even without project membership), manage workspace members
3. **Project Lead** — manages project settings and members within their project
4. **Project Member** — can view and interact with project tasks and comments
5. **Project Viewer** — read-only access to project contents
6. **Workspace Viewer** — read-only access to workspace-level information

### Security Model
- RLS enforced on every table for both `anon` and `authenticated` roles
- `service_role` used only in Edge Functions (server-side), never exposed to client
- Default-deny: tables with RLS enabled but no matching policy return zero rows
- JWT claims injected into Postgres session variables; `auth.uid()` reads from session
- `SECURITY DEFINER` used only on trigger functions, never on client-callable RPCs

### Development Workflow
- Migration-only approach (no declarative schemas)
- Sequential migration files in Git as single source of truth
- Local development with Supabase CLI (`supabase db reset` replays all migrations)
- Schema snapshots via `supabase db dump --local` for quick reference
- Migration squashing after milestones

---

## Database Schema

### Enum Types

```sql
CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member', 'viewer');
CREATE TYPE member_status AS ENUM ('pending', 'active');
CREATE TYPE project_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE project_role AS ENUM ('lead', 'member', 'viewer');
CREATE TYPE task_status AS ENUM ('backlog', 'todo', 'in_progress', 'in_review', 'done');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE activity_action AS ENUM (
  'task_created', 'task_updated', 'task_completed',
  'task_assigned', 'comment_added', 'member_joined',
  'member_removed', 'project_created', 'project_archived'
);
```

### Tables

#### profiles
Extends `auth.users` with application-specific user data. Auto-created via trigger on user signup.

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Trigger:** `handle_new_user()` fires AFTER INSERT on `auth.users`, creates a profile row pulling `display_name` from `raw_user_meta_data` with fallback to 'User'. Uses `SECURITY DEFINER`.

#### workspaces
The tenant boundary. All resources belong to a workspace.

```sql
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### workspace_members
Junction table connecting users to workspaces. The most-queried table for RLS — every access check flows through here.

```sql
CREATE TABLE workspace_members (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  role workspace_role NOT NULL DEFAULT 'member',
  status member_status NOT NULL DEFAULT 'pending',
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, workspace_id)
);
```

#### projects
Belong to a single workspace. Deleted when workspace is deleted.

```sql
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status project_status NOT NULL DEFAULT 'active',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### project_members
Junction table for project-level access. Workspace admins/owners can see all projects without explicit membership.

```sql
CREATE TABLE project_members (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  role project_role NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, project_id)
);
```

#### tasks
Belong to a single project. `position` enables drag-and-drop ordering.

```sql
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  status task_status NOT NULL DEFAULT 'backlog',
  priority task_priority NOT NULL DEFAULT 'medium',
  due_date date,
  position integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

#### comments
Threaded comments on tasks. Deleted when author is removed (comments without attribution are meaningless).

```sql
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  edited_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

#### activity_log
Workspace-wide activity feed. Uses JSONB metadata for action-specific data.

```sql
CREATE TABLE activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action activity_action NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Indexes

```sql
-- RLS performance (critical)
CREATE INDEX idx_workspace_members_lookup ON workspace_members (workspace_id, user_id);
CREATE INDEX idx_workspace_members_user ON workspace_members (user_id);
CREATE INDEX idx_project_members_lookup ON project_members (project_id, user_id);
CREATE INDEX idx_project_members_user ON project_members (user_id);

-- Query performance
CREATE INDEX idx_projects_workspace ON projects (workspace_id);
CREATE INDEX idx_tasks_project ON tasks (project_id);
CREATE INDEX idx_tasks_assigned ON tasks (assigned_to);
CREATE INDEX idx_tasks_status ON tasks (project_id, status);
CREATE INDEX idx_comments_task ON comments (task_id);
CREATE INDEX idx_activity_workspace ON activity_log (workspace_id, created_at DESC);
CREATE INDEX idx_activity_project ON activity_log (project_id, created_at DESC);
```

### Migration Order
1. `profiles` + `handle_new_user` trigger
2. `workspaces`
3. `workspace_members` (depends on workspaces, auth.users)
4. `projects` (depends on workspaces)
5. `project_members` (depends on projects, auth.users)
6. `tasks` (depends on projects, auth.users)
7. `comments` (depends on tasks, auth.users)
8. `activity_log` (depends on workspaces, projects, auth.users)
9. `indexes`

---

## RLS Policies

### Design Principles
- **Default-deny:** Every table has RLS enabled. No policy = no access.
- **Layered access:** Project-scoped resources use two paths — direct project membership OR workspace admin/owner oversight.
- **Role-scoped policies:** All policies use `TO authenticated` to exclude anonymous access entirely.
- **EXISTS over IN:** All membership checks use `EXISTS` with correlated subqueries for short-circuit performance.
- **Composite indexes required:** Every `EXISTS` subquery's WHERE clause is backed by a composite index.

### Trigger Functions

```sql
-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Auto-add workspace creator as owner
CREATE OR REPLACE FUNCTION handle_new_workspace_owner()
RETURNS trigger AS $$
BEGIN
  INSERT INTO workspace_members (user_id, workspace_id, role, status)
  VALUES (NEW.created_by, NEW.id, 'owner', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_workspace_owner();
```

### profiles

```sql
CREATE POLICY "Authenticated users can view profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- INSERT handled by trigger; DELETE handled by ON DELETE CASCADE from auth.users
```

### workspaces

```sql
CREATE POLICY "Authenticated users can create workspaces"
ON workspaces FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Members can view workspace"
ON workspaces FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can update workspace"
ON workspaces FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
)
WITH CHECK (true);

CREATE POLICY "Owner can delete workspace"
ON workspaces FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspaces.id
    AND wm.user_id = auth.uid()
    AND wm.role = 'owner'
  )
);
```

### workspace_members

```sql
CREATE POLICY "Members can view workspace members"
ON workspace_members FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members my_membership
    WHERE my_membership.workspace_id = workspace_members.workspace_id
    AND my_membership.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can invite members"
ON workspace_members FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins can update members"
ON workspace_members FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Owners can remove members or self-remove"
ON workspace_members FOR DELETE
TO authenticated
USING (
  workspace_members.user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_members.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role = 'owner'
  )
);
```

### projects

```sql
CREATE POLICY "Members or admins can view projects"
ON projects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = projects.id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Workspace members can create projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.status = 'active'
  )
);

CREATE POLICY "Leads or admins can update projects"
ON projects FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id = projects.id
    AND pm.user_id = auth.uid()
    AND pm.role = 'lead'
  )
  OR
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Admins can delete projects"
ON projects FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = projects.workspace_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);
```

### tasks

```sql
CREATE POLICY "Project members or admins can view tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.user_id = auth.uid()
    AND pm.project_id = tasks.project_id
  )
  OR
  EXISTS (
    SELECT 1 FROM projects p
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE p.id = tasks.project_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('admin', 'owner')
  )
);

-- INSERT, UPDATE, DELETE follow same layered pattern
-- Project members can create/update tasks
-- Project leads + workspace admins can delete tasks
-- Full policies written during build phase
```

### comments

```sql
CREATE POLICY "Project members or admins can view comments"
ON comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = comments.task_id
    AND pm.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE t.id = comments.task_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);

CREATE POLICY "Project members can comment"
ON comments FOR INSERT
TO authenticated
WITH CHECK (
  author_id = auth.uid()
  AND
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = comments.task_id
    AND pm.user_id = auth.uid()
  )
);

CREATE POLICY "Authors can update own comments"
ON comments FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

CREATE POLICY "Authors or leads can delete comments"
ON comments FOR DELETE
TO authenticated
USING (
  author_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = comments.task_id
    AND pm.user_id = auth.uid()
    AND pm.role = 'lead'
  )
  OR
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN workspace_members wm ON wm.workspace_id = p.workspace_id
    WHERE t.id = comments.task_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin')
  )
);
```

### activity_log

```sql
-- Viewable by workspace members; insert via triggers/edge functions only
CREATE POLICY "Workspace members can view activity"
ON activity_log FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = activity_log.workspace_id
    AND wm.user_id = auth.uid()
  )
);

-- No INSERT/UPDATE/DELETE policies for authenticated role
-- Activity log entries created by SECURITY DEFINER trigger functions only
```

---

## Realtime Subscriptions

### Channel Architecture
- **postgres_changes** for data that lives in Postgres (tasks, comments, activity). CDC-powered via WAL. RLS enforced per-event.
- **broadcast** for ephemeral client-to-client messages (typing indicators, cursor positions). No database involved.
- **presence** for tracking connected users (who's online in a workspace). Auto-removes on disconnect.

### Channels
- `project:${projectId}` — task INSERT/UPDATE/DELETE events for the task board
- `task:${taskId}` — comment INSERT events for live comment threads
- `workspace:${workspaceId}` — presence tracking (who's online), activity feed updates

### Reconnection Pattern
Always pair Realtime with HTTP fetch on SUBSCRIBED status. Realtime is a live stream — events during disconnection are lost. The subscribe callback fires on both initial connection and reconnection:
```javascript
channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await fetchLatestData()  // Fill any gaps from disconnection
  }
})
```

---

## Edge Functions

### Functions

| Function | Trigger | Auth | Purpose |
|----------|---------|------|---------|
| `send-invitation` | DB webhook (workspace_members INSERT, status='pending') | service_role | Send invitation email via Resend |
| `notify-task-assigned` | DB webhook (tasks UPDATE on assigned_to) | service_role | Push notification to assignee |
| `daily-digest` | pg_cron (daily at 8am UTC) | service_role | Email summary of workspace activity |
| `process-webhook` | External HTTP (e.g., payment provider) | no-verify-jwt (public endpoint) | Handle incoming webhooks |

### Client-Invoked Functions
Client-invoked functions receive the user's JWT automatically via `supabase.functions.invoke()`. Create the Supabase client with the anon key and forward the Authorization header — RLS applies.

### System-Invoked Functions
Webhook and cron-triggered functions have no user context. Create the Supabase client with the service_role key — RLS bypassed. Validate inputs and permissions manually.

### Secrets
Managed via `supabase secrets set KEY=value`. Never hardcoded. Available at runtime via `Deno.env.get('KEY')`.
- `RESEND_API_KEY` — email service
- `SUPABASE_SERVICE_ROLE_KEY` — auto-available in Edge Functions

---

## Storage

### Buckets

| Bucket | Visibility | Purpose |
|--------|-----------|---------|
| `avatars` | Public | User profile images. Direct URL access, no auth needed. |
| `attachments` | Private | Task file attachments. Requires JWT or signed URL. |

### Folder Structure
```
avatars/
  {user_id}.jpg

attachments/
  {project_id}/
    {task_id}/
      {filename}
```

Folder structure encodes access boundaries — `storage.foldername(name)` extracts project_id for policy checks.

### Storage Policies
```sql
CREATE POLICY "Public avatar access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Project members view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'attachments'
  AND EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.project_id::text = (storage.foldername(name))[1]
    AND pm.user_id = auth.uid()
  )
);
```

### File Metadata Table
```sql
CREATE TABLE task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### Access Patterns
- **Avatars:** Store relative path in profiles.avatar_url. Construct public URL at runtime via `getPublicUrl()`.
- **Attachments:** Generate signed URLs on download click (not page load) to avoid expiry issues. For inline previews, refresh URLs on interval before expiry.

---

## Build Plan

### Approach
Build in layers. Each layer produces a working app. Within each layer, pause at natural stopping points to learn TanStack Start concepts, review what was built, and understand how the pieces connect. Follow a real developer workflow throughout: Git commits, branch-based development, tests, and deployment to a remote Supabase project.

### Developer Workflow (enforced from Layer 1)
1. **Git:** Initialize repo, commit after each meaningful unit of work. Feature branches for each sub-task, merge to main when complete.
2. **Local Supabase:** `supabase start` for local development. `supabase db reset` to rebuild from migrations.
3. **Testing:** Write pgTAP tests for RLS policies as they're created. Integration tests for critical flows. Run `supabase test db` before committing migration changes.
4. **Deployment:** Push migrations to a remote Supabase staging project after each layer is complete and tested.

### Learning Approach
Timo is new to TanStack Start. Each sub-task within a layer is an opportunity to learn:
- **Before coding:** Explain the TanStack Start concept involved (file-based routing, loaders, server functions, middleware, etc.)
- **During coding:** Build together, explaining decisions as they're made
- **After coding:** Review what was built, connect it to broader patterns, answer questions
- **Timo decides** when to pause for learning vs when to keep building

### Layer 1 — Foundation
Get auth, workspaces, and basic CRUD working end-to-end.

| Sub-task | What's built | TanStack Start concepts |
|----------|-------------|------------------------|
| Project setup | TanStack Start + Tailwind + shadcn/ui initialized, Supabase CLI initialized, Git repo created | Project structure, Vite config, file-based routing basics |
| Supabase migrations | All migration files written, applied locally, tested with pgTAP | Supabase CLI workflow |
| Auth pages | Login, signup, password reset, auth callback, route protection | Server functions, `beforeLoad`, redirect, cookie-based auth with @supabase/ssr |
| Workspace CRUD | Create workspace, list workspaces, workspace dashboard shell | Loaders, route params (`$slug`), data fetching with TanStack Query, forms with server functions |
| Project CRUD | Create project, list projects in sidebar, project overview page | Nested routes, layout routes (`_layout`), `Outlet` |
| Task CRUD | Create/read/update/delete tasks, basic list view | Mutations with TanStack Query, optimistic updates intro, form handling |

### Layer 2 — Core Experience
The kanban board, task detail, and comments.

| Sub-task | What's built | TanStack Start concepts |
|----------|-------------|------------------------|
| Kanban board | Columns by status, task cards with metadata | Component composition, client-side state |
| Drag and drop | Move tasks between columns, update status + position | @dnd-kit integration, optimistic mutations |
| Task detail panel | Slide-over Sheet with full task editing | Route-based modals (URL updates, back button works), `Sheet` component |
| Comments | Threaded comments on tasks, create/edit/delete | Realtime subscriptions preview, scroll behavior |
| Task attachments | File upload, download with signed URLs | Storage integration, file input handling |

### Layer 3 — Collaboration
Real-time features, activity feed, member management.

| Sub-task | What's built | TanStack Start concepts |
|----------|-------------|------------------------|
| Realtime board | Live task updates from other users | Supabase Realtime channels, subscription lifecycle, fetch-on-reconnect |
| Presence | Online indicators in sidebar | Presence API, channel management |
| Activity feed | Workspace activity log, cursor-paginated | Infinite scroll, cursor pagination with TanStack Query |
| Member management | Invite members, manage roles, remove members | Dialogs, role-based UI (show/hide admin controls) |
| Notifications | Toast notifications for Realtime events | Sonner integration, event handling |

### Layer 4 — Polish
Command palette, dark mode, and final touches.

| Sub-task | What's built | TanStack Start concepts |
|----------|-------------|------------------------|
| Command palette | Cmd+K global search and navigation | cmdk/Command component, keyboard shortcuts, search across entities |
| Dark mode | Toggle between light/dark | Theme provider, CSS variables, persisted preference |
| My tasks view | Cross-project task list for current user | Complex queries with multiple filters |
| Empty states | Custom empty states for all entities | Conditional rendering patterns |
| Loading polish | Skeleton loaders, error boundaries | Suspense boundaries, error handling in TanStack Router |

---

## Environment Strategy

### Environments
- **Local:** Supabase CLI (`supabase start`, `supabase db reset`). Fully local Postgres, GoTrue, PostgREST, Storage. Free, instant rebuild from migrations.
- **Staging:** Hosted Supabase project. Mirrors production config. All migrations deployed here first via CI/CD. Verify before promoting to production.
- **Production:** Hosted Supabase project with connection pooling, backups, monitoring. Changes only arrive through CI/CD pipeline, never through dashboard.

### CI/CD Pipeline (GitHub Actions)
- Push to `main` → auto-deploy migrations and Edge Functions to staging
- Manual promotion step to deploy to production
- Secrets managed via GitHub repository secrets (`SUPABASE_ACCESS_TOKEN`, project refs)

### Developer Onboarding
Five commands from zero to running:
```bash
git clone <repo>
npm install -g supabase
supabase start
supabase db reset
npm run dev
```

### Documentation
- **Spec file** (this document) — architectural decisions, schema, RLS patterns
- **README** — setup commands, env vars, migration workflow
- **SQL comments** — explain "why" in migrations, not "what"

---

## Testing Strategy

### Philosophy
Test what hurts most when it breaks. In a Supabase app, the highest-risk logic lives in the database — RLS policies, triggers, and functions. A broken button is a visual bug. A broken RLS policy is a data breach.

### Test Pyramid

| Layer | Tool | What to test | Priority |
|-------|------|-------------|----------|
| Database tests | pgTAP (`supabase test db`) | RLS policies, triggers, RPC functions | Highest — security layer |
| Integration tests | Vitest + Supabase client | Full API flows against local Supabase | High — catches real-world issues |
| Unit tests | Vitest | Client-side logic, data transformations, utilities | Normal — fast, low risk |

### Database Tests (pgTAP)

Location: `supabase/tests/`

Test every RLS policy with three roles: authorized user, different-role user, and outsider. Each test file follows the pattern:

```sql
BEGIN;
SELECT plan(N);

-- Create test users
SELECT tests.create_supabase_user('owner', 'owner@test.com');
SELECT tests.create_supabase_user('member', 'member@test.com');
SELECT tests.create_supabase_user('outsider', 'outsider@test.com');

-- Seed test data (runs as service_role, bypasses RLS)
-- ...

-- Authenticate as different users and assert access
SELECT tests.authenticate_as('owner');
SELECT is((SELECT count(*) FROM ...)::int, 1, 'Owner can see resource');

SELECT tests.authenticate_as('outsider');
SELECT is((SELECT count(*) FROM ...)::int, 0, 'Outsider cannot see resource');

SELECT * FROM finish();
ROLLBACK;
```

#### Required Test Files

| File | Tests |
|------|-------|
| `workspaces_rls_test.sql` | Members can view, outsiders cannot. Only owners can delete. Admins can update. |
| `workspace_members_rls_test.sql` | Members see co-members. Admins can invite/update. Self-remove works. Outsiders see nothing. |
| `projects_rls_test.sql` | Project members can view. Workspace admins can view all projects (oversight). Non-members cannot view. Leads can update. |
| `tasks_rls_test.sql` | Layered access — project members AND workspace admins. Outsiders see nothing. Assignment updates respect permissions. |
| `comments_rls_test.sql` | Authors can edit/delete own. Leads can delete any. Outsiders cannot view. author_id must equal auth.uid() on insert. |
| `activity_log_rls_test.sql` | Workspace members can view. No direct insert/update/delete for authenticated users. |
| `storage_policies_test.sql` | Outsiders cannot access private attachments. Members can access project files. Public avatars accessible to all authenticated users. |
| `triggers_test.sql` | handle_new_user creates profile. handle_new_workspace_owner creates membership with owner role and active status. |
| `rpc_functions_test.sql` | complete_task updates status AND creates activity log entry atomically. |

### Integration Tests

Location: `tests/integration/`

Run against local Supabase (`http://localhost:54321`). Test critical user flows through the actual Supabase client:

| Test | What it validates |
|------|------------------|
| Workspace creation flow | Create workspace → creator auto-added as owner → workspace visible to creator |
| Member invitation flow | Admin invites member → workspace_members row created with pending status → member can view workspace after activation |
| Task lifecycle | Create task → assign → update status → complete → activity log entry exists |
| Cross-workspace isolation | User in workspace A cannot see projects, tasks, or members in workspace B |
| Auth flows | Sign up → profile auto-created → sign in → session valid → sign out → session cleared |

### Unit Tests

Location: `tests/unit/`

Test pure client-side logic that doesn't need a database:
- `taskHelpers.test.ts` — groupTasksByStatus, sortByPriority, filterByAssignee
- `formatters.test.ts` — date formatting, relative time, file size display
- `validators.test.ts` — workspace slug validation, email format, required fields

### What NOT to Test
- Supabase service internals (PostgREST query translation, GoTrue auth flows)
- That `supabase.from('x').select('*')` returns data — Supabase's responsibility
- Pixel-perfect UI rendering — low risk, high maintenance

### CI/CD Integration

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
      - run: supabase start
      - run: supabase test db              # Database tests
      - run: npm ci
      - run: supabase db reset             # Seed test data
      - run: npm run test:integration      # Integration tests
      - run: npm run test:unit             # Unit tests

  deploy:
    needs: test                            # blocks deploy if any test fails
    if: github.ref == 'refs/heads/main'
    # ... deploy steps
```

All tests must pass before migrations reach staging. No untested RLS policy reaches production.

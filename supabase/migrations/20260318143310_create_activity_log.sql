-- Activity log: workspace-wide audit trail.
-- This table is append-only from the client's perspective — no INSERT,
-- UPDATE, or DELETE policies for the authenticated role. Entries are
-- created by SECURITY DEFINER trigger functions or edge functions only.
-- This guarantees the log can't be tampered with by users.

create table activity_log (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  project_id   uuid references projects(id) on delete set null,
  actor_id     uuid references auth.users(id) on delete set null,
  action       activity_action not null,
  metadata     jsonb default '{}',
  created_at   timestamptz not null default now()
);

-- FK indexes
create index activity_log_workspace_id_idx on activity_log (workspace_id);
create index activity_log_project_id_idx on activity_log (project_id);
create index activity_log_actor_id_idx on activity_log (actor_id);

-- The activity feed query is: "show me recent activity in this workspace,
-- newest first." This composite index covers that directly.
create index activity_log_workspace_created_idx
  on activity_log (workspace_id, created_at desc);

-- Filter activity by project, newest first (e.g. project activity tab)
create index activity_log_project_created_idx
  on activity_log (project_id, created_at desc);

alter table activity_log enable row level security;

-- Workspace members can read activity in their workspace.
-- This is the simplest RLS policy in the system — one hop to workspace_members.
create policy "Workspace members can view activity"
  on activity_log for select
  to authenticated
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = activity_log.workspace_id
        and wm.user_id = (select auth.uid())
    )
  );

-- No INSERT/UPDATE/DELETE policies for the authenticated role.
-- Activity entries are created exclusively by SECURITY DEFINER functions
-- (triggers or edge functions), which bypass RLS entirely.
-- This makes the activity log tamper-proof from the client side.

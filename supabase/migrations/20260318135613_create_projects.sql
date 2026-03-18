-- Projects: belong to a single workspace, deleted when workspace is deleted.
-- This is where teams organize their work into separate streams.

create table projects (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name         text not null,
  description  text,
  status       project_status not null default 'active',
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- FK indexes: both workspace_id and created_by are foreign keys.
-- workspace_id is also used in almost every RLS policy on this table,
-- so this index is critical for both JOIN performance and RLS speed.
create index projects_workspace_id_idx on projects (workspace_id);
create index projects_created_by_idx on projects (created_by);

alter table projects enable row level security;

-- Any active workspace member can create a project.
-- The status = 'active' check prevents pending (invited but not accepted)
-- members from creating projects.
create policy "Workspace members can create projects"
  on projects for insert
  to authenticated
  with check (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.status = 'active'
    )
  );

-- Remaining project policies (SELECT, UPDATE, DELETE) are in the
-- project_members migration because they reference that table,
-- which doesn't exist yet at this point in the migration order.

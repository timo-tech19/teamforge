-- Workspaces: the tenant boundary.
-- Every resource in TeamForge (projects, tasks, comments) belongs to a workspace.
-- The slug provides human-readable URLs like /w/acme-corp instead of UUIDs.

create table workspaces (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Index on created_by for the foreign key (Postgres doesn't auto-index FKs).
-- Without this, ON DELETE SET NULL on auth.users would require a full table scan.
create index workspaces_created_by_idx on workspaces (created_by);

alter table workspaces enable row level security;

-- Any authenticated user can create a workspace.
-- The trigger in the workspace_members migration will auto-add them as owner.
create policy "Authenticated users can create workspaces"
  on workspaces for insert
  to authenticated
  with check (true);

-- Remaining workspace policies (SELECT, UPDATE, DELETE) are in the
-- workspace_members migration because they reference that table,
-- which doesn't exist yet at this point in the migration order.

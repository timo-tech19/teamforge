-- Workspace members: the junction table connecting users to workspaces.
-- This is the MOST IMPORTANT table for authorization — almost every RLS
-- policy in the system queries this table to answer "is this user in this
-- workspace, and what role do they have?"
--
-- Composite primary key (user_id, workspace_id) means:
--   1. A user can only be in a workspace once (no duplicates)
--   2. The PK index covers lookups by (user_id) and (user_id, workspace_id)
--   3. We still need a separate index on (workspace_id) for reverse lookups

create table workspace_members (
  user_id      uuid references auth.users(id) on delete cascade,
  workspace_id uuid references workspaces(id) on delete cascade,
  role         workspace_role not null default 'member',
  status       member_status not null default 'pending',
  invited_by   uuid references auth.users(id) on delete set null,
  joined_at    timestamptz not null default now(),
  primary key (user_id, workspace_id)
);

-- The composite PK already indexes (user_id, workspace_id), which covers
-- "find all workspaces for user X". But RLS policies and member lists need
-- the reverse: "find all members of workspace Y". Without this index,
-- every RLS check would full-scan the table.
create index workspace_members_workspace_id_idx
  on workspace_members (workspace_id);

-- Index on invited_by for the FK (ON DELETE SET NULL needs this)
create index workspace_members_invited_by_idx
  on workspace_members (invited_by);

alter table workspace_members enable row level security;

-- If you're a member of a workspace, you can see all other members.
-- This self-referencing pattern (querying the same table in the policy)
-- is safe — Postgres handles it correctly.
create policy "Members can view workspace members"
  on workspace_members for select
  to authenticated
  using (
    exists (
      select 1 from workspace_members my_membership
      where my_membership.workspace_id = workspace_members.workspace_id
        and my_membership.user_id = (select auth.uid())
    )
  );

-- Only owners/admins can invite new members.
create policy "Admins can invite members"
  on workspace_members for insert
  to authenticated
  with check (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- Only owners/admins can change roles or status.
create policy "Admins can update members"
  on workspace_members for update
  to authenticated
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- You can leave a workspace yourself, OR the owner can remove you.
create policy "Owners can remove members or self-remove"
  on workspace_members for delete
  to authenticated
  using (
    workspace_members.user_id = (select auth.uid())
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role = 'owner'
    )
  );

-- ── Deferred workspace policies ──────────────────────────────────────
-- These policies belong to the workspaces table but reference
-- workspace_members, so they must be created after this table exists.

create policy "Members can view workspace"
  on workspaces for select
  to authenticated
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = (select auth.uid())
    )
  );

create policy "Admins can update workspace"
  on workspaces for update
  to authenticated
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  )
  with check (true);

create policy "Owner can delete workspace"
  on workspaces for delete
  to authenticated
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = workspaces.id
        and wm.user_id = (select auth.uid())
        and wm.role = 'owner'
    )
  );

-- Trigger: when a workspace is created, auto-add the creator as owner.
-- This lives here (not in the workspaces migration) because it INSERTs
-- into workspace_members, which must exist first.
create or replace function handle_new_workspace_owner()
returns trigger as $$
begin
  insert into public.workspace_members (user_id, workspace_id, role, status)
  values (new.created_by, new.id, 'owner', 'active');
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_workspace_created
  after insert on workspaces
  for each row
  execute function handle_new_workspace_owner();

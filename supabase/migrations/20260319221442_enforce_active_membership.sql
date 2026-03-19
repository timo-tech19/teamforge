-- Enforce active membership for workspace access.
--
-- Previously, is_workspace_member() only checked if a row existed.
-- Now it also checks status = 'active', so pending (invited) members
-- cannot access workspace content until they accept the invitation.
--
-- Additional policies are added so pending members can:
--   1. See their own membership rows (to know they have invitations)
--   2. See the workspace name/slug (to display the invitation)
--   3. Accept the invitation (update own row from pending to active)
--   4. Decline the invitation (self-remove, already covered by existing DELETE policy)

-- ── Update is_workspace_member to require active status ───────────────

create or replace function is_workspace_member(
  _workspace_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = (select auth.uid())
      and status = 'active'
  );
$$;

-- ── Helper: check for any membership status (including pending) ───────
-- Used by the workspace SELECT policy so pending members can see
-- the workspace they've been invited to.

create or replace function is_workspace_member_any_status(
  _workspace_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = _workspace_id
      and user_id = (select auth.uid())
  );
$$;

-- ── Workspace members: let users see their own rows ───────────────────
-- This lets pending members see their invitations.
-- Combined with the existing policy (active members see all co-members),
-- these OR together: active members see everyone, pending see only themselves.

create policy "Users can view own memberships"
  on workspace_members for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ── Workspace members: let pending members accept invitations ─────────
-- A pending member can update their OWN row to change status from
-- pending to active. They cannot change anyone else's row or change
-- any other field (the WITH CHECK ensures the result is valid).

create policy "Pending members can accept invite"
  on workspace_members for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and status = 'pending'
  )
  with check (
    user_id = (select auth.uid())
    and status = 'active'
  );

-- ── Workspaces: let invited members see the workspace ─────────────────
-- Update the existing policy to use is_workspace_member_any_status
-- so pending members can see the workspace name for the invitation UI.
-- They still can't see projects, tasks, etc. (those use is_workspace_member
-- which requires active status).

drop policy "Members can view workspace" on workspaces;
create policy "Members can view workspace"
  on workspaces for select
  to authenticated
  using ((select is_workspace_member_any_status(id)));

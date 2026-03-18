-- Fix infinite recursion in RLS policies.
--
-- The problem: workspace_members and project_members policies query their
-- OWN table to check membership, which triggers the same policy again.
--
-- The fix: SECURITY DEFINER helper functions that bypass RLS. These run
-- with the privileges of the function creator (db owner), so they skip
-- policy checks. We set search_path = '' to prevent hijacking.

-- ── Helper functions ────────────────────────────────────────────────

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
  );
$$;

create or replace function get_workspace_role(
  _workspace_id uuid
)
returns text
language sql
security definer
set search_path = ''
as $$
  select role::text from public.workspace_members
  where workspace_id = _workspace_id
    and user_id = (select auth.uid());
$$;

create or replace function is_project_member(
  _project_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.project_members
    where project_id = _project_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function get_project_role(
  _project_id uuid
)
returns text
language sql
security definer
set search_path = ''
as $$
  select role::text from public.project_members
  where project_id = _project_id
    and user_id = (select auth.uid());
$$;

-- Helper to check workspace admin status via a project_id
create or replace function is_workspace_admin_for_project(
  _project_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.projects p
      join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where p.id = _project_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin')
  );
$$;

-- Helper to check workspace admin status via a task_id
create or replace function is_workspace_admin_for_task(
  _task_id uuid
)
returns boolean
language sql
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.tasks t
      join public.projects p on p.id = t.project_id
      join public.workspace_members wm on wm.workspace_id = p.workspace_id
    where t.id = _task_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin')
  );
$$;

-- ── Fix workspace_members policies ──────────────────────────────────

drop policy "Members can view workspace members" on workspace_members;
create policy "Members can view workspace members"
  on workspace_members for select
  to authenticated
  using ((select is_workspace_member(workspace_id)));

drop policy "Admins can invite members" on workspace_members;
create policy "Admins can invite members"
  on workspace_members for insert
  to authenticated
  with check ((select get_workspace_role(workspace_id)) in ('owner', 'admin'));

drop policy "Admins can update members" on workspace_members;
create policy "Admins can update members"
  on workspace_members for update
  to authenticated
  using ((select get_workspace_role(workspace_id)) in ('owner', 'admin'));

drop policy "Owners can remove members or self-remove" on workspace_members;
create policy "Owners can remove members or self-remove"
  on workspace_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select get_workspace_role(workspace_id)) = 'owner'
  );

-- ── Fix workspaces policies (reference workspace_members) ───────────

drop policy "Members can view workspace" on workspaces;
create policy "Members can view workspace"
  on workspaces for select
  to authenticated
  using ((select is_workspace_member(id)));

drop policy "Admins can update workspace" on workspaces;
create policy "Admins can update workspace"
  on workspaces for update
  to authenticated
  using ((select get_workspace_role(id)) in ('owner', 'admin'))
  with check (true);

drop policy "Owner can delete workspace" on workspaces;
create policy "Owner can delete workspace"
  on workspaces for delete
  to authenticated
  using ((select get_workspace_role(id)) = 'owner');

-- ── Fix projects policies ───────────────────────────────────────────

drop policy "Members or admins can view projects" on projects;
create policy "Members or admins can view projects"
  on projects for select
  to authenticated
  using (
    (select is_project_member(id))
    or (select get_workspace_role(workspace_id)) in ('owner', 'admin')
  );

drop policy "Workspace members can create projects" on projects;
create policy "Workspace members can create projects"
  on projects for insert
  to authenticated
  with check ((select is_workspace_member(workspace_id)));

drop policy "Leads or admins can update projects" on projects;
create policy "Leads or admins can update projects"
  on projects for update
  to authenticated
  using (
    (select get_project_role(id)) = 'lead'
    or (select get_workspace_role(workspace_id)) in ('owner', 'admin')
  );

drop policy "Admins can delete projects" on projects;
create policy "Admins can delete projects"
  on projects for delete
  to authenticated
  using ((select get_workspace_role(workspace_id)) in ('owner', 'admin'));

-- ── Fix project_members policies ────────────────────────────────────

drop policy "Project members or admins can view project members" on project_members;
create policy "Project members or admins can view project members"
  on project_members for select
  to authenticated
  using (
    (select is_project_member(project_id))
    or (select is_workspace_admin_for_project(project_id))
  );

drop policy "Leads or admins can add project members" on project_members;
create policy "Leads or admins can add project members"
  on project_members for insert
  to authenticated
  with check (
    (select get_project_role(project_id)) = 'lead'
    or (select is_workspace_admin_for_project(project_id))
  );

drop policy "Leads or admins can update project members" on project_members;
create policy "Leads or admins can update project members"
  on project_members for update
  to authenticated
  using (
    (select get_project_role(project_id)) = 'lead'
    or (select is_workspace_admin_for_project(project_id))
  );

drop policy "Self-remove or leads/admins can remove project members" on project_members;
create policy "Self-remove or leads/admins can remove project members"
  on project_members for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select get_project_role(project_id)) = 'lead'
    or (select is_workspace_admin_for_project(project_id))
  );

-- ── Fix tasks policies ──────────────────────────────────────────────

drop policy "Project members or admins can view tasks" on tasks;
create policy "Project members or admins can view tasks"
  on tasks for select
  to authenticated
  using (
    (select is_project_member(project_id))
    or (select is_workspace_admin_for_project(project_id))
  );

drop policy "Project members can create tasks" on tasks;
create policy "Project members can create tasks"
  on tasks for insert
  to authenticated
  with check (
    (select is_project_member(project_id))
    or (select is_workspace_admin_for_project(project_id))
  );

drop policy "Project members can update tasks" on tasks;
create policy "Project members can update tasks"
  on tasks for update
  to authenticated
  using (
    (select is_project_member(project_id))
    or (select is_workspace_admin_for_project(project_id))
  );

drop policy "Leads or admins can delete tasks" on tasks;
create policy "Leads or admins can delete tasks"
  on tasks for delete
  to authenticated
  using (
    (select get_project_role(project_id)) = 'lead'
    or (select is_workspace_admin_for_project(project_id))
  );

-- ── Fix comments policies ───────────────────────────────────────────

drop policy "Project members or admins can view comments" on comments;
create policy "Project members or admins can view comments"
  on comments for select
  to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = comments.task_id
        and (
          (select is_project_member(t.project_id))
          or (select is_workspace_admin_for_project(t.project_id))
        )
    )
  );

drop policy "Project members can comment" on comments;
create policy "Project members can comment"
  on comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.tasks t
      where t.id = comments.task_id
        and (
          (select is_project_member(t.project_id))
          or (select is_workspace_admin_for_project(t.project_id))
        )
    )
  );

drop policy "Authors or leads or admins can delete comments" on comments;
create policy "Authors or leads or admins can delete comments"
  on comments for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from public.tasks t
      where t.id = comments.task_id
        and (
          (select get_project_role(t.project_id)) = 'lead'
          or (select is_workspace_admin_for_project(t.project_id))
        )
    )
  );

-- ── Fix activity_log policies ───────────────────────────────────────

drop policy "Workspace members can view activity" on activity_log;
create policy "Workspace members can view activity"
  on activity_log for select
  to authenticated
  using ((select is_workspace_member(workspace_id)));

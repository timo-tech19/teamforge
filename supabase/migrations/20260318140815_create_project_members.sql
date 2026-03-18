-- Project members: junction table for project-level access.
-- Same composite PK pattern as workspace_members.
-- Workspace owners/admins bypass this table entirely via the two-path
-- policies on projects and tasks — they don't need explicit membership.

create table project_members (
  user_id    uuid references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  role       project_role not null default 'member',
  joined_at  timestamptz not null default now(),
  primary key (user_id, project_id)
);

-- Reverse lookup: "who is in this project?"
-- Same reasoning as workspace_members — the composite PK covers
-- (user_id, project_id) but not project_id alone.
create index project_members_project_id_idx
  on project_members (project_id);

alter table project_members enable row level security;

-- Two-path SELECT: project members can see each other,
-- workspace admins can see all project memberships.
create policy "Project members or admins can view project members"
  on project_members for select
  to authenticated
  using (
    exists (
      select 1 from project_members my_membership
      where my_membership.project_id = project_members.project_id
        and my_membership.user_id = (select auth.uid())
    )
    or exists (
      select 1 from workspace_members wm
        join projects p on p.id = project_members.project_id
      where wm.workspace_id = p.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- Project leads can add members, workspace admins can add to any project.
create policy "Leads or admins can add project members"
  on project_members for insert
  to authenticated
  with check (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'lead'
    )
    or exists (
      select 1 from workspace_members wm
        join projects p on p.id = project_members.project_id
      where wm.workspace_id = p.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- Project leads or workspace admins can change member roles.
create policy "Leads or admins can update project members"
  on project_members for update
  to authenticated
  using (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'lead'
    )
    or exists (
      select 1 from workspace_members wm
        join projects p on p.id = project_members.project_id
      where wm.workspace_id = p.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- ── Deferred project policies ────────────────────────────────────────
-- These policies belong to the projects table but reference
-- project_members, so they must be created after this table exists.

create policy "Members or admins can view projects"
  on projects for select
  to authenticated
  using (
    exists (
      select 1 from project_members pm
      where pm.project_id = projects.id
        and pm.user_id = (select auth.uid())
    )
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

create policy "Leads or admins can update projects"
  on projects for update
  to authenticated
  using (
    exists (
      select 1 from project_members pm
      where pm.project_id = projects.id
        and pm.user_id = (select auth.uid())
        and pm.role = 'lead'
    )
    or exists (
      select 1 from workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

create policy "Admins can delete projects"
  on projects for delete
  to authenticated
  using (
    exists (
      select 1 from workspace_members wm
      where wm.workspace_id = projects.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- ── Project members policies ────────────────────────────────────────

-- You can leave a project yourself, leads can remove members,
-- workspace admins can remove anyone.
create policy "Self-remove or leads/admins can remove project members"
  on project_members for delete
  to authenticated
  using (
    project_members.user_id = (select auth.uid())
    or exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'lead'
    )
    or exists (
      select 1 from workspace_members wm
        join projects p on p.id = project_members.project_id
      where wm.workspace_id = p.workspace_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

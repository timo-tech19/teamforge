-- Tasks: the core work items. Belong to a single project.
-- The position column enables drag-and-drop ordering on the kanban board —
-- when a user drags a card, we update its position integer.

create table tasks (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  title       text not null,
  description text,
  status      task_status not null default 'backlog',
  priority    task_priority not null default 'medium',
  due_date    date,
  position    integer not null default 0,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- FK indexes
create index tasks_project_id_idx on tasks (project_id);
create index tasks_assigned_to_idx on tasks (assigned_to);
create index tasks_created_by_idx on tasks (created_by);

-- Composite index for the kanban board query: "give me all tasks in this
-- project grouped by status, ordered by position". This single index
-- covers that entire query without touching the table.
create index tasks_project_status_position_idx
  on tasks (project_id, status, position);

alter table tasks enable row level security;

-- Same two-path pattern: project members OR workspace admins.
create policy "Project members or admins can view tasks"
  on tasks for select
  to authenticated
  using (
    exists (
      select 1 from project_members pm
      where pm.project_id = tasks.project_id
        and pm.user_id = (select auth.uid())
    )
    or exists (
      select 1 from projects p
        join workspace_members wm on wm.workspace_id = p.workspace_id
      where p.id = tasks.project_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- Any project member can create tasks.
create policy "Project members can create tasks"
  on tasks for insert
  to authenticated
  with check (
    exists (
      select 1 from project_members pm
      where pm.project_id = tasks.project_id
        and pm.user_id = (select auth.uid())
    )
    or exists (
      select 1 from projects p
        join workspace_members wm on wm.workspace_id = p.workspace_id
      where p.id = tasks.project_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- Project members can update tasks (change status, reassign, edit description).
-- This is intentionally broad — any member can move a card on the board.
create policy "Project members can update tasks"
  on tasks for update
  to authenticated
  using (
    exists (
      select 1 from project_members pm
      where pm.project_id = tasks.project_id
        and pm.user_id = (select auth.uid())
    )
    or exists (
      select 1 from projects p
        join workspace_members wm on wm.workspace_id = p.workspace_id
      where p.id = tasks.project_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- Only project leads and workspace admins can delete tasks.
-- Regular members can change status to "done" but can't destroy data.
create policy "Leads or admins can delete tasks"
  on tasks for delete
  to authenticated
  using (
    exists (
      select 1 from project_members pm
      where pm.project_id = tasks.project_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'lead'
    )
    or exists (
      select 1 from projects p
        join workspace_members wm on wm.workspace_id = p.workspace_id
      where p.id = tasks.project_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

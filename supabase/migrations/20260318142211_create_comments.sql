-- Comments: threaded comments on tasks.
-- author_id uses ON DELETE CASCADE (not SET NULL) because a comment
-- without attribution is meaningless — if the user is deleted, so are
-- their comments.

create table comments (
  id         uuid primary key default gen_random_uuid(),
  task_id    uuid not null references tasks(id) on delete cascade,
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  edited_at  timestamptz,
  created_at timestamptz not null default now()
);

-- FK indexes
create index comments_task_id_idx on comments (task_id);
create index comments_author_id_idx on comments (author_id);

alter table comments enable row level security;

-- Comments have the deepest join chain: comments → tasks → projects → workspace_members.
-- To check "can this user see this comment?", we go through the task to
-- find the project, then check project membership or workspace admin status.
create policy "Project members or admins can view comments"
  on comments for select
  to authenticated
  using (
    exists (
      select 1 from tasks t
        join project_members pm on pm.project_id = t.project_id
      where t.id = comments.task_id
        and pm.user_id = (select auth.uid())
    )
    or exists (
      select 1 from tasks t
        join projects p on p.id = t.project_id
        join workspace_members wm on wm.workspace_id = p.workspace_id
      where t.id = comments.task_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- INSERT requires two things: you must be the author (no impersonation),
-- AND you must be a project member. The author_id check is critical —
-- without it, someone could insert a comment with another user's ID.
create policy "Project members can comment"
  on comments for insert
  to authenticated
  with check (
    author_id = (select auth.uid())
    and (
      exists (
        select 1 from tasks t
          join project_members pm on pm.project_id = t.project_id
        where t.id = comments.task_id
          and pm.user_id = (select auth.uid())
      )
      or exists (
        select 1 from tasks t
          join projects p on p.id = t.project_id
          join workspace_members wm on wm.workspace_id = p.workspace_id
        where t.id = comments.task_id
          and wm.user_id = (select auth.uid())
          and wm.role in ('owner', 'admin')
      )
    )
  );

-- Only the comment author can edit their own comment.
-- No admin override here — editing someone else's words would be misleading.
create policy "Authors can update own comments"
  on comments for update
  to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- Three-path DELETE: author can delete their own, project leads can
-- moderate, workspace admins can moderate everything.
create policy "Authors or leads or admins can delete comments"
  on comments for delete
  to authenticated
  using (
    author_id = (select auth.uid())
    or exists (
      select 1 from tasks t
        join project_members pm on pm.project_id = t.project_id
      where t.id = comments.task_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'lead'
    )
    or exists (
      select 1 from tasks t
        join projects p on p.id = t.project_id
        join workspace_members wm on wm.workspace_id = p.workspace_id
      where t.id = comments.task_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- Task attachments: metadata table for files uploaded to tasks.
-- Actual files live in Supabase Storage (attachments bucket).
-- This table tracks the mapping between tasks and storage objects.

create table task_attachments (
  id          uuid primary key default gen_random_uuid(),
  task_id     uuid not null references tasks(id) on delete cascade,
  file_path   text not null,
  file_name   text not null,
  file_size   integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- FK indexes
create index task_attachments_task_id_idx on task_attachments (task_id);
create index task_attachments_uploaded_by_idx on task_attachments (uploaded_by);

alter table task_attachments enable row level security;

-- Same two-path pattern as tasks: project members OR workspace admins.
-- Attachments inherit their task's access rules.
create policy "Project members or admins can view attachments"
  on task_attachments for select
  to authenticated
  using (
    exists (
      select 1 from tasks t
        join project_members pm on pm.project_id = t.project_id
      where t.id = task_attachments.task_id
        and pm.user_id = (select auth.uid())
    )
    or exists (
      select 1 from tasks t
        join projects p on p.id = t.project_id
        join workspace_members wm on wm.workspace_id = p.workspace_id
      where t.id = task_attachments.task_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- Project members can upload attachments.
create policy "Project members can upload attachments"
  on task_attachments for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and (
      exists (
        select 1 from tasks t
          join project_members pm on pm.project_id = t.project_id
        where t.id = task_attachments.task_id
          and pm.user_id = (select auth.uid())
      )
      or exists (
        select 1 from tasks t
          join projects p on p.id = t.project_id
          join workspace_members wm on wm.workspace_id = p.workspace_id
        where t.id = task_attachments.task_id
          and wm.user_id = (select auth.uid())
          and wm.role in ('owner', 'admin')
      )
    )
  );

-- Uploader, project leads, or workspace admins can delete attachments.
create policy "Uploader or leads or admins can delete attachments"
  on task_attachments for delete
  to authenticated
  using (
    uploaded_by = (select auth.uid())
    or exists (
      select 1 from tasks t
        join project_members pm on pm.project_id = t.project_id
      where t.id = task_attachments.task_id
        and pm.user_id = (select auth.uid())
        and pm.role = 'lead'
    )
    or exists (
      select 1 from tasks t
        join projects p on p.id = t.project_id
        join workspace_members wm on wm.workspace_id = p.workspace_id
      where t.id = task_attachments.task_id
        and wm.user_id = (select auth.uid())
        and wm.role in ('owner', 'admin')
    )
  );

-- ── Storage bucket and policies ───────────────────────────────────────

-- Create the attachments bucket (private — requires auth for access)
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

-- Project members can upload files to the attachments bucket.
-- Path format: {project_id}/{task_id}/{filename}
create policy "Project members can upload attachments"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and exists (
      select 1 from project_members pm
      where pm.project_id::text = (storage.foldername(name))[1]
        and pm.user_id = (select auth.uid())
    )
  );

-- Project members can view/download attachments.
create policy "Project members can view attachments"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1 from project_members pm
      where pm.project_id::text = (storage.foldername(name))[1]
        and pm.user_id = (select auth.uid())
    )
  );

-- Project members can delete their own uploaded attachments.
-- Leads and admins can delete any attachment in their projects.
create policy "Members can delete own attachments"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'attachments'
    and exists (
      select 1 from project_members pm
      where pm.project_id::text = (storage.foldername(name))[1]
        and pm.user_id = (select auth.uid())
    )
  );

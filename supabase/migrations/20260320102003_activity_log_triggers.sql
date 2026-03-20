-- Activity log triggers: SECURITY DEFINER functions that write to
-- activity_log on key events. These bypass RLS (no INSERT policy
-- exists for authenticated users) to keep the log tamper-proof.

-- ── Task created ──────────────────────────────────────────────────────

create or replace function log_task_created()
returns trigger as $$
declare
  v_workspace_id uuid;
begin
  select workspace_id into v_workspace_id
    from public.projects where id = new.project_id;

  insert into public.activity_log (workspace_id, project_id, actor_id, action, metadata)
  values (
    v_workspace_id,
    new.project_id,
    new.created_by,
    'task_created',
    jsonb_build_object('task_id', new.id, 'task_title', new.title)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_task_created
  after insert on tasks
  for each row
  execute function log_task_created();

-- ── Task updated (status change only — skip noisy position-only updates) ─

create or replace function log_task_updated()
returns trigger as $$
declare
  v_workspace_id uuid;
begin
  -- Only log meaningful changes, not drag-and-drop reordering
  if old.status is distinct from new.status then
    select workspace_id into v_workspace_id
      from public.projects where id = new.project_id;

    insert into public.activity_log (workspace_id, project_id, actor_id, action, metadata)
    values (
      v_workspace_id,
      new.project_id,
      auth.uid(),
      'task_updated',
      jsonb_build_object(
        'task_id', new.id,
        'task_title', new.title,
        'old_status', old.status,
        'new_status', new.status
      )
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_task_updated
  after update on tasks
  for each row
  execute function log_task_updated();

-- ── Task deleted ──────────────────────────────────────────────────────

create or replace function log_task_deleted()
returns trigger as $$
declare
  v_workspace_id uuid;
begin
  select workspace_id into v_workspace_id
    from public.projects where id = old.project_id;

  insert into public.activity_log (workspace_id, project_id, actor_id, action, metadata)
  values (
    v_workspace_id,
    old.project_id,
    auth.uid(),
    'task_deleted',
    jsonb_build_object('task_id', old.id, 'task_title', old.title)
  );
  return old;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_task_deleted
  after delete on tasks
  for each row
  execute function log_task_deleted();

-- ── Comment added ─────────────────────────────────────────────────────

create or replace function log_comment_added()
returns trigger as $$
declare
  v_workspace_id uuid;
  v_project_id uuid;
  v_task_title text;
begin
  select p.workspace_id, t.project_id, t.title
    into v_workspace_id, v_project_id, v_task_title
    from public.tasks t
    join public.projects p on p.id = t.project_id
    where t.id = new.task_id;

  insert into public.activity_log (workspace_id, project_id, actor_id, action, metadata)
  values (
    v_workspace_id,
    v_project_id,
    new.author_id,
    'comment_added',
    jsonb_build_object('task_id', new.task_id, 'task_title', v_task_title)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_comment_added
  after insert on comments
  for each row
  execute function log_comment_added();

-- ── Member invited ────────────────────────────────────────────────────

create or replace function log_member_invited()
returns trigger as $$
begin
  -- Only log new invitations (pending status), not direct adds
  if new.status = 'pending' then
    insert into public.activity_log (workspace_id, actor_id, action, metadata)
    values (
      new.workspace_id,
      new.invited_by,
      'member_invited',
      jsonb_build_object('invited_user_id', new.user_id)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_member_invited
  after insert on workspace_members
  for each row
  execute function log_member_invited();

-- ── Member removed ────────────────────────────────────────────────────

create or replace function log_member_removed()
returns trigger as $$
begin
  -- Skip if workspace is being deleted (cascade)
  if exists (select 1 from public.workspaces where id = old.workspace_id) then
    insert into public.activity_log (workspace_id, actor_id, action, metadata)
    values (
      old.workspace_id,
      auth.uid(),
      'member_removed',
      jsonb_build_object('removed_user_id', old.user_id)
    );
  end if;
  return old;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_member_removed
  after delete on workspace_members
  for each row
  execute function log_member_removed();

-- ── Project created ───────────────────────────────────────────────────

create or replace function log_project_created()
returns trigger as $$
begin
  insert into public.activity_log (workspace_id, project_id, actor_id, action, metadata)
  values (
    new.workspace_id,
    new.id,
    new.created_by,
    'project_created',
    jsonb_build_object('project_name', new.name)
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_project_created_log
  after insert on projects
  for each row
  execute function log_project_created();

-- ── Project archived ──────────────────────────────────────────────────

create or replace function log_project_archived()
returns trigger as $$
begin
  if old.status is distinct from 'archived' and new.status = 'archived' then
    insert into public.activity_log (workspace_id, project_id, actor_id, action, metadata)
    values (
      new.workspace_id,
      new.id,
      auth.uid(),
      'project_archived',
      jsonb_build_object('project_name', new.name)
    );
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_project_archived
  after update on projects
  for each row
  execute function log_project_archived();

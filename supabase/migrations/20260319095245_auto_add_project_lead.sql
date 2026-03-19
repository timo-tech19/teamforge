-- Trigger: auto-add project creator as lead in project_members.
-- Mirrors the handle_new_workspace_owner pattern. Without this,
-- the creator can't see their own project (SELECT RLS policy
-- requires project membership or workspace admin role).

create or replace function handle_new_project_lead()
returns trigger as $$
begin
  insert into public.project_members (user_id, project_id, role)
  values (new.created_by, new.id, 'lead');
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_project_created
  after insert on projects
  for each row
  execute function handle_new_project_lead();

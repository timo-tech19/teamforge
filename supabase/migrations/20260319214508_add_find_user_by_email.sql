-- Helper function to look up a user's ID by email.
--
-- SECURITY DEFINER because auth.users is not readable by the
-- authenticated role. This function runs with the creator's
-- (postgres) privileges, so it can query auth.users.
--
-- Used by the invite flow: the inviter knows the email,
-- but we need the UUID to insert into workspace_members.

create or replace function find_user_id_by_email(
  _email text
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id from auth.users where email = _email;
$$;

-- Grant execute to authenticated users so it can be called
-- from the Supabase client via .rpc()
grant execute on function find_user_id_by_email(text) to authenticated;

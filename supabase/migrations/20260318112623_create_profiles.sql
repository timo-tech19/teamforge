-- Profiles table: extends auth.users with app-specific user data.
-- The id column is a foreign key to auth.users — not auto-generated.
-- This means every profile is 1:1 with an auth user.

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Enable RLS (default-deny: no access until we add policies)
alter table profiles enable row level security;

-- Any logged-in user can view any profile (needed for showing
-- teammate names, avatars in workspace member lists, etc.)
create policy "Authenticated users can view profiles"
  on profiles for select
  to authenticated
  using (true);

-- Users can only update their own profile.
-- The (select auth.uid()) pattern wraps the function call in a subquery
-- so Postgres evaluates it ONCE per query, not once per row. On a table
-- with 10k users, that's 1 function call instead of 10,000.
create policy "Users can update own profile"
  on profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Trigger: auto-create a profile row when a user signs up.
-- SECURITY DEFINER means this function runs with the privileges of the
-- user who created it (the db owner), not the calling user. This is
-- necessary because the trigger fires on auth.users (which the new user
-- can't write to), and it needs to INSERT into profiles.
-- We set search_path = '' to prevent search_path hijacking attacks.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', 'User')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

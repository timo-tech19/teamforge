-- Test helpers: utility functions for pgTAP tests.
-- These run BEFORE any test files (sorted alphabetically).
--
-- Provides:
--   tests.create_supabase_user(identifier, email) -> uuid
--   tests.authenticate_as(identifier)
--   tests.clear_authentication()

BEGIN;
SELECT plan(1);

-- Create a schema to hold test helper functions
CREATE SCHEMA IF NOT EXISTS tests;

-- Create a test user in auth.users and return their id.
-- The identifier is used to look up the user later in authenticate_as().
CREATE OR REPLACE FUNCTION tests.create_supabase_user(
  _identifier text,
  _email text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  _user_id uuid;
  _user_email text;
BEGIN
  _user_email := COALESCE(_email, _identifier || '@test.com');

  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    _user_email,
    crypt('password123', gen_salt('bf')),
    NOW(),
    jsonb_build_object('display_name', _identifier),
    NOW(),
    NOW(),
    '',
    ''
  )
  RETURNING id INTO _user_id;

  RETURN _user_id;
END;
$$;

-- Authenticate as a test user by setting the JWT claims
-- that Supabase RLS policies read via auth.uid() and auth.role().
CREATE OR REPLACE FUNCTION tests.authenticate_as(
  _identifier text
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  _user_id uuid;
BEGIN
  SELECT id INTO _user_id
  FROM auth.users
  WHERE email = _identifier || '@test.com';

  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Test user "%" not found', _identifier;
  END IF;

  -- Set the JWT claims that auth.uid() and auth.role() read
  PERFORM set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', _user_id::text,
      'role', 'authenticated',
      'email', _identifier || '@test.com'
    )::text,
    true
  );

  -- Set the role so RLS policies for 'authenticated' apply
  PERFORM set_config('role', 'authenticated', true);
END;
$$;

-- Look up a test user's id by identifier. SECURITY DEFINER so it
-- works while the role is 'authenticated' (which can't read auth.users).
CREATE OR REPLACE FUNCTION tests.get_user_id(
  _identifier text
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT id FROM auth.users WHERE email = _identifier || '@test.com';
$$;

-- Clear authentication: revert to postgres superuser role.
-- Cannot use SECURITY DEFINER here because Postgres forbids
-- set_config('role', ...) inside security-definer functions.
-- Instead we clear JWT claims and use RESET ROLE (which any role can call).
CREATE OR REPLACE FUNCTION tests.clear_authentication()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', '', true);
END;
$$;

-- Grant the authenticated role access to test helpers so
-- tests can call clear_authentication() while authenticated.
GRANT USAGE ON SCHEMA tests TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA tests TO authenticated;

SELECT pass('Test helpers installed');
SELECT * FROM finish();
COMMIT;

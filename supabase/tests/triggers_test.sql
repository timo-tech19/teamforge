-- Test triggers: handle_new_user and handle_new_workspace_owner.

BEGIN;
SELECT plan(6);

-- ── Setup ─────────────────────────────────────────────────────────────

-- Create test users (triggers handle_new_user which creates profiles)
SELECT tests.create_supabase_user('trigger_owner');
SELECT tests.create_supabase_user('trigger_nometadata');

-- ── handle_new_user trigger ───────────────────────────────────────────

-- Test 1: Profile row is auto-created when user signs up
SELECT is(
  (SELECT count(*)::int FROM profiles WHERE id = (
    SELECT id FROM auth.users WHERE email = 'trigger_owner@test.com'
  )),
  1,
  'handle_new_user: profile row created on signup'
);

-- Test 2: Profile display_name comes from raw_user_meta_data
SELECT is(
  (SELECT display_name FROM profiles WHERE id = (
    SELECT id FROM auth.users WHERE email = 'trigger_owner@test.com'
  )),
  'trigger_owner',
  'handle_new_user: display_name set from user metadata'
);

-- Test 3: Profile avatar_url defaults to NULL
SELECT is(
  (SELECT avatar_url FROM profiles WHERE id = (
    SELECT id FROM auth.users WHERE email = 'trigger_owner@test.com'
  )),
  NULL,
  'handle_new_user: avatar_url defaults to NULL'
);

-- ── handle_new_workspace_owner trigger ────────────────────────────────

-- Create a workspace as the trigger_owner user (bypassing RLS with postgres role)
INSERT INTO workspaces (name, slug, created_by)
VALUES (
  'Trigger Test WS',
  'trigger-test-ws',
  (SELECT id FROM auth.users WHERE email = 'trigger_owner@test.com')
);

-- Test 4: Creator auto-added as workspace member
SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'trigger-test-ws')
     AND user_id = (SELECT id FROM auth.users WHERE email = 'trigger_owner@test.com')
  ),
  1,
  'handle_new_workspace_owner: creator added as workspace member'
);

-- Test 5: Creator role is owner
SELECT is(
  (SELECT role::text FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'trigger-test-ws')
     AND user_id = (SELECT id FROM auth.users WHERE email = 'trigger_owner@test.com')
  ),
  'owner',
  'handle_new_workspace_owner: creator role is owner'
);

-- Test 6: Creator status is active
SELECT is(
  (SELECT status::text FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'trigger-test-ws')
     AND user_id = (SELECT id FROM auth.users WHERE email = 'trigger_owner@test.com')
  ),
  'active',
  'handle_new_workspace_owner: creator status is active'
);

SELECT * FROM finish();
ROLLBACK;

-- Test RLS policies on workspace_members table.
--
-- Policies under test (from fix_rls_recursion migration):
--   SELECT: members can view co-members (via is_workspace_member helper)
--   INSERT: owner/admin can invite (via get_workspace_role helper)
--   UPDATE: owner/admin can update roles (via get_workspace_role helper)
--   DELETE: self-remove OR owner can remove others

BEGIN;
SELECT plan(10);

-- ── Setup ─────────────────────────────────────────────────────────────

SELECT tests.create_supabase_user('wm_owner');
SELECT tests.create_supabase_user('wm_admin');
SELECT tests.create_supabase_user('wm_member');
SELECT tests.create_supabase_user('wm_outsider');
SELECT tests.create_supabase_user('wm_invitee');

-- Create workspace (trigger adds wm_owner as owner)
INSERT INTO workspaces (name, slug, created_by)
VALUES ('Members RLS Test', 'members-rls-test', tests.get_user_id('wm_owner'));

-- Add admin and member (as postgres)
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('wm_admin'),
  (SELECT id FROM workspaces WHERE slug = 'members-rls-test'),
  'admin',
  'active'
);

INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('wm_member'),
  (SELECT id FROM workspaces WHERE slug = 'members-rls-test'),
  'member',
  'active'
);

-- ── SELECT policy ─────────────────────────────────────────────────────

-- Test 1: Owner can see all members
SELECT tests.authenticate_as('wm_owner');
SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test')),
  3,
  'SELECT: owner can see all workspace members'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 2: Member can see all co-members
SELECT tests.authenticate_as('wm_member');
SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test')),
  3,
  'SELECT: member can see all co-members'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 3: Outsider cannot see any members
SELECT tests.authenticate_as('wm_outsider');
SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test')),
  0,
  'SELECT: outsider cannot see workspace members'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── INSERT policy (invite) ────────────────────────────────────────────

-- Test 4: Owner can invite a new member
SELECT tests.authenticate_as('wm_owner');
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('wm_invitee'),
  (SELECT id FROM workspaces WHERE slug = 'members-rls-test'),
  'member',
  'pending'
);
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test')
     AND user_id = tests.get_user_id('wm_invitee')),
  1,
  'INSERT: owner can invite new members'
);

-- Remove invitee for next test (as postgres)
DELETE FROM workspace_members
WHERE user_id = tests.get_user_id('wm_invitee');

-- Test 5: Admin can invite a new member
SELECT tests.authenticate_as('wm_admin');
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('wm_invitee'),
  (SELECT id FROM workspaces WHERE slug = 'members-rls-test'),
  'member',
  'pending'
);
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test')
     AND user_id = tests.get_user_id('wm_invitee')),
  1,
  'INSERT: admin can invite new members'
);

-- Remove invitee
DELETE FROM workspace_members
WHERE user_id = tests.get_user_id('wm_invitee');

-- ── UPDATE policy ─────────────────────────────────────────────────────

-- Test 6: Owner can update member role
SELECT tests.authenticate_as('wm_owner');
UPDATE workspace_members
SET role = 'admin'
WHERE user_id = tests.get_user_id('wm_member')
  AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test');
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT role::text FROM workspace_members
   WHERE user_id = tests.get_user_id('wm_member')
     AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test')),
  'admin',
  'UPDATE: owner can change member role'
);

-- Reset member role back
UPDATE workspace_members
SET role = 'member'
WHERE user_id = tests.get_user_id('wm_member')
  AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test');

-- Test 7: Member cannot update roles
SELECT tests.authenticate_as('wm_member');
UPDATE workspace_members
SET role = 'admin'
WHERE user_id = tests.get_user_id('wm_member')
  AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test');
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT role::text FROM workspace_members
   WHERE user_id = tests.get_user_id('wm_member')
     AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test')),
  'member',
  'UPDATE: member cannot change own role (role unchanged)'
);

-- ── DELETE policy ─────────────────────────────────────────────────────

-- Test 8: Member can self-remove (leave workspace)
SELECT tests.authenticate_as('wm_member');
DELETE FROM workspace_members
WHERE user_id = tests.get_user_id('wm_member')
  AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test');
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE user_id = tests.get_user_id('wm_member')
     AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test')),
  0,
  'DELETE: member can self-remove from workspace'
);

-- Re-add member for next tests
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('wm_member'),
  (SELECT id FROM workspaces WHERE slug = 'members-rls-test'),
  'member',
  'active'
);

-- Test 9: Owner can remove another member
SELECT tests.authenticate_as('wm_owner');
DELETE FROM workspace_members
WHERE user_id = tests.get_user_id('wm_member')
  AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test');
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE user_id = tests.get_user_id('wm_member')
     AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test')),
  0,
  'DELETE: owner can remove other members'
);

-- Re-add member for next test
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('wm_member'),
  (SELECT id FROM workspaces WHERE slug = 'members-rls-test'),
  'member',
  'active'
);

-- Test 10: Admin cannot remove another member (only owner can)
SELECT tests.authenticate_as('wm_admin');
DELETE FROM workspace_members
WHERE user_id = tests.get_user_id('wm_member')
  AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test');
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE user_id = tests.get_user_id('wm_member')
     AND workspace_id = (SELECT id FROM workspaces WHERE slug = 'members-rls-test')),
  1,
  'DELETE: admin cannot remove other members (only owner or self-remove)'
);

SELECT * FROM finish();
ROLLBACK;

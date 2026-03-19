-- Test RLS policies on workspaces table.
--
-- Policies under test (from fix_rls_recursion migration):
--   INSERT: any authenticated user can create
--   SELECT: members can view (via is_workspace_member helper)
--   UPDATE: owner/admin can update (via get_workspace_role helper)
--   DELETE: owner only (via get_workspace_role helper)

BEGIN;
SELECT plan(10);

-- ── Setup ─────────────────────────────────────────────────────────────

SELECT tests.create_supabase_user('ws_owner');
SELECT tests.create_supabase_user('ws_admin');
SELECT tests.create_supabase_user('ws_member');
SELECT tests.create_supabase_user('ws_outsider');

-- Create workspace as postgres (bypasses RLS), trigger adds ws_owner as owner
INSERT INTO workspaces (name, slug, created_by)
VALUES ('RLS Test Workspace', 'rls-test-ws', tests.get_user_id('ws_owner'));

-- Add admin and member (as postgres, bypassing RLS)
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('ws_admin'),
  (SELECT id FROM workspaces WHERE slug = 'rls-test-ws'),
  'admin',
  'active'
);

INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('ws_member'),
  (SELECT id FROM workspaces WHERE slug = 'rls-test-ws'),
  'member',
  'active'
);

-- ── INSERT policy ─────────────────────────────────────────────────────

-- Test 1: Authenticated user can create a workspace
SELECT tests.authenticate_as('ws_outsider');
INSERT INTO workspaces (name, slug, created_by)
VALUES ('Outsider Workspace', 'outsider-ws', tests.get_user_id('ws_outsider'));
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'outsider-ws'),
  1,
  'INSERT: any authenticated user can create a workspace'
);

-- ── SELECT policy ─────────────────────────────────────────────────────

-- Test 2: Owner can view their workspace
SELECT tests.authenticate_as('ws_owner');
SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'rls-test-ws'),
  1,
  'SELECT: owner can view workspace'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 3: Admin can view the workspace
SELECT tests.authenticate_as('ws_admin');
SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'rls-test-ws'),
  1,
  'SELECT: admin can view workspace'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 4: Member can view the workspace
SELECT tests.authenticate_as('ws_member');
SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'rls-test-ws'),
  1,
  'SELECT: member can view workspace'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 5: Outsider cannot view the workspace
SELECT tests.authenticate_as('ws_outsider');
SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'rls-test-ws'),
  0,
  'SELECT: outsider cannot view workspace'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── UPDATE policy ─────────────────────────────────────────────────────

-- Test 6: Owner can update workspace
SELECT tests.authenticate_as('ws_owner');
UPDATE workspaces SET name = 'Updated by Owner' WHERE slug = 'rls-test-ws';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT name FROM workspaces WHERE slug = 'rls-test-ws'),
  'Updated by Owner',
  'UPDATE: owner can update workspace'
);

-- Test 7: Admin can update workspace
SELECT tests.authenticate_as('ws_admin');
UPDATE workspaces SET name = 'Updated by Admin' WHERE slug = 'rls-test-ws';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT name FROM workspaces WHERE slug = 'rls-test-ws'),
  'Updated by Admin',
  'UPDATE: admin can update workspace'
);

-- Test 8: Member cannot update workspace
SELECT tests.authenticate_as('ws_member');
UPDATE workspaces SET name = 'Updated by Member' WHERE slug = 'rls-test-ws';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT name FROM workspaces WHERE slug = 'rls-test-ws'),
  'Updated by Admin',
  'UPDATE: member cannot update workspace (name unchanged)'
);

-- ── DELETE policy ─────────────────────────────────────────────────────

-- Test 9: Admin cannot delete workspace
SELECT tests.authenticate_as('ws_admin');
DELETE FROM workspaces WHERE slug = 'rls-test-ws';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'rls-test-ws'),
  1,
  'DELETE: admin cannot delete workspace'
);

-- Test 10: Owner can delete workspace
SELECT tests.authenticate_as('ws_owner');
DELETE FROM workspaces WHERE slug = 'rls-test-ws';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'rls-test-ws'),
  0,
  'DELETE: owner can delete workspace'
);

SELECT * FROM finish();
ROLLBACK;

-- Test RLS policies on projects table.
--
-- Policies under test (from fix_rls_recursion migration):
--   INSERT: workspace members can create (via is_workspace_member helper)
--   SELECT: project members OR workspace admins can view
--   UPDATE: project leads OR workspace admins can update
--   DELETE: workspace admins only (via get_workspace_role helper)
--
-- Also tests the handle_new_project_lead trigger.

BEGIN;
SELECT plan(12);

-- ── Setup ─────────────────────────────────────────────────────────────

SELECT tests.create_supabase_user('proj_ws_owner');
SELECT tests.create_supabase_user('proj_ws_member');
SELECT tests.create_supabase_user('proj_outsider');

-- Create workspace (trigger adds proj_ws_owner as owner)
INSERT INTO workspaces (name, slug, created_by)
VALUES ('Project RLS Test', 'project-rls-test', tests.get_user_id('proj_ws_owner'));

-- Add a regular workspace member
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('proj_ws_member'),
  (SELECT id FROM workspaces WHERE slug = 'project-rls-test'),
  'member',
  'active'
);

-- ── INSERT policy + trigger ───────────────────────────────────────────

-- Test 1: Workspace member can create a project
SELECT tests.authenticate_as('proj_ws_member');
INSERT INTO projects (name, workspace_id, created_by)
VALUES (
  'Member Project',
  (SELECT id FROM workspaces WHERE slug = 'project-rls-test'),
  tests.get_user_id('proj_ws_member')
);
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM projects WHERE name = 'Member Project'),
  1,
  'INSERT: workspace member can create a project'
);

-- Test 2: Trigger auto-adds creator as project lead
SELECT is(
  (SELECT role::text FROM project_members
   WHERE project_id = (SELECT id FROM projects WHERE name = 'Member Project')
     AND user_id = tests.get_user_id('proj_ws_member')),
  'lead',
  'TRIGGER: creator auto-added as project lead'
);

-- Test 3: Outsider cannot create a project
-- INSERT RLS violations throw errors (unlike SELECT/UPDATE/DELETE which silently fail).
-- We use throws_ok() to verify the error is raised.
SELECT tests.authenticate_as('proj_outsider');
SELECT throws_ok(
  format(
    'INSERT INTO projects (name, workspace_id, created_by) VALUES (%L, %L, %L)',
    'Outsider Project',
    (SELECT id FROM workspaces WHERE slug = 'project-rls-test'),
    tests.get_user_id('proj_outsider')
  ),
  '42501',
  NULL,
  'INSERT: outsider cannot create a project in workspace'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Create a second project as workspace owner for further tests
INSERT INTO projects (name, description, workspace_id, created_by)
VALUES (
  'Owner Project',
  'A test project',
  (SELECT id FROM workspaces WHERE slug = 'project-rls-test'),
  tests.get_user_id('proj_ws_owner')
);

-- ── SELECT policy ─────────────────────────────────────────────────────

-- Test 4: Project lead (creator) can view their project
SELECT tests.authenticate_as('proj_ws_member');
SELECT is(
  (SELECT count(*)::int FROM projects WHERE name = 'Member Project'),
  1,
  'SELECT: project lead can view their project'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 5: Workspace owner (admin) can view all projects
SELECT tests.authenticate_as('proj_ws_owner');
SELECT is(
  (SELECT count(*)::int FROM projects
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'project-rls-test')),
  2,
  'SELECT: workspace owner can view all projects'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 6: Non-member of project (but workspace member) can't see project they're not in
-- proj_ws_member is lead of "Member Project" but NOT a member of "Owner Project"
-- and proj_ws_member is a regular workspace member (not admin), so they shouldn't see "Owner Project"
SELECT tests.authenticate_as('proj_ws_member');
SELECT is(
  (SELECT count(*)::int FROM projects WHERE name = 'Owner Project'),
  0,
  'SELECT: regular workspace member cannot see projects they are not a member of'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 7: Outsider cannot see any projects
SELECT tests.authenticate_as('proj_outsider');
SELECT is(
  (SELECT count(*)::int FROM projects
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'project-rls-test')),
  0,
  'SELECT: outsider cannot see any projects'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── UPDATE policy ─────────────────────────────────────────────────────

-- Test 8: Project lead can update their project
SELECT tests.authenticate_as('proj_ws_member');
UPDATE projects SET name = 'Updated by Lead' WHERE name = 'Member Project';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM projects WHERE name = 'Updated by Lead'),
  1,
  'UPDATE: project lead can update their project'
);

-- Test 9: Workspace owner can update any project
SELECT tests.authenticate_as('proj_ws_owner');
UPDATE projects SET name = 'Updated by WS Owner' WHERE name = 'Updated by Lead';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM projects WHERE name = 'Updated by WS Owner'),
  1,
  'UPDATE: workspace owner can update any project'
);

-- Test 10: Outsider cannot update projects
SELECT tests.authenticate_as('proj_outsider');
UPDATE projects SET name = 'Hacked' WHERE name = 'Updated by WS Owner';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT name FROM projects WHERE id = (SELECT id FROM projects WHERE name = 'Updated by WS Owner')),
  'Updated by WS Owner',
  'UPDATE: outsider cannot update projects'
);

-- ── DELETE policy ─────────────────────────────────────────────────────

-- Test 11: Project lead (non-admin) cannot delete projects
SELECT tests.authenticate_as('proj_ws_member');
DELETE FROM projects WHERE name = 'Updated by WS Owner';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM projects WHERE name = 'Updated by WS Owner'),
  1,
  'DELETE: project lead cannot delete projects (only workspace admins can)'
);

-- Test 12: Workspace owner can delete projects
SELECT tests.authenticate_as('proj_ws_owner');
DELETE FROM projects WHERE name = 'Owner Project';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM projects WHERE name = 'Owner Project'),
  0,
  'DELETE: workspace owner can delete projects'
);

SELECT * FROM finish();
ROLLBACK;

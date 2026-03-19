-- Test the invitation flow: pending members are locked out of
-- workspace content until they accept.
--
-- Tests the updated is_workspace_member (requires active status),
-- the "Users can view own memberships" policy,
-- the "Pending members can accept invite" policy,
-- and workspace visibility for pending members.

BEGIN;
SELECT plan(10);

-- ── Setup ─────────────────────────────────────────────────────────────

SELECT tests.create_supabase_user('inv_owner');
SELECT tests.create_supabase_user('inv_pending');
SELECT tests.create_supabase_user('inv_outsider');

-- Create workspace (trigger adds inv_owner as owner with active status)
INSERT INTO workspaces (name, slug, created_by)
VALUES ('Invite Flow Test', 'invite-flow-test', tests.get_user_id('inv_owner'));

-- Create a project and task so we can test content visibility
INSERT INTO projects (name, workspace_id, created_by)
VALUES ('Invite Project', (SELECT id FROM workspaces WHERE slug = 'invite-flow-test'), tests.get_user_id('inv_owner'));

INSERT INTO tasks (title, project_id, created_by)
VALUES (
  'Invite Task',
  (SELECT id FROM projects WHERE name = 'Invite Project'),
  tests.get_user_id('inv_owner')
);

-- Invite inv_pending as a member (pending status)
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('inv_pending'),
  (SELECT id FROM workspaces WHERE slug = 'invite-flow-test'),
  'member',
  'pending'
);

-- ── Pending member can see the workspace ──────────────────────────────

-- Test 1: Pending member can see the workspace (for invitation display)
SELECT tests.authenticate_as('inv_pending');
SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'invite-flow-test'),
  1,
  'Pending member can see the workspace they are invited to'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 2: Pending member can see their own membership row
SELECT tests.authenticate_as('inv_pending');
SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'invite-flow-test')
     AND user_id = tests.get_user_id('inv_pending')),
  1,
  'Pending member can see their own membership row'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── Pending member is locked out of content ───────────────────────────

-- Test 3: Pending member cannot see projects
SELECT tests.authenticate_as('inv_pending');
SELECT is(
  (SELECT count(*)::int FROM projects
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'invite-flow-test')),
  0,
  'Pending member cannot see projects'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 4: Pending member cannot see tasks
SELECT tests.authenticate_as('inv_pending');
SELECT is(
  (SELECT count(*)::int FROM tasks
   WHERE project_id = (SELECT id FROM projects WHERE name = 'Invite Project')),
  0,
  'Pending member cannot see tasks'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 5: Pending member cannot see other members
SELECT tests.authenticate_as('inv_pending');
SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'invite-flow-test')
     AND user_id = tests.get_user_id('inv_owner')),
  0,
  'Pending member cannot see other members (only their own row)'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── Accept invitation ─────────────────────────────────────────────────

-- Test 6: Pending member can accept (update own status to active)
SELECT tests.authenticate_as('inv_pending');
UPDATE workspace_members
SET status = 'active'
WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'invite-flow-test')
  AND user_id = tests.get_user_id('inv_pending');
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT status::text FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'invite-flow-test')
     AND user_id = tests.get_user_id('inv_pending')),
  'active',
  'Pending member can accept invitation (status changed to active)'
);

-- ── After accepting, member has workspace access ──────────────────────

-- Add the now-active member to the project (as postgres)
INSERT INTO project_members (user_id, project_id, role)
VALUES (
  tests.get_user_id('inv_pending'),
  (SELECT id FROM projects WHERE name = 'Invite Project'),
  'member'
);

-- Test 7: Active member who is also a project member can see projects
SELECT tests.authenticate_as('inv_pending');
SELECT is(
  (SELECT count(*)::int FROM projects
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'invite-flow-test')),
  1,
  'After accepting and joining project, member can see projects'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 8: Active member can now see other members
SELECT tests.authenticate_as('inv_pending');
SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'invite-flow-test')),
  2,
  'After accepting, member can see all workspace members'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── Outsider still locked out ─────────────────────────────────────────

-- Test 9: Outsider cannot see workspace
SELECT tests.authenticate_as('inv_outsider');
SELECT is(
  (SELECT count(*)::int FROM workspaces WHERE slug = 'invite-flow-test'),
  0,
  'Outsider cannot see the workspace'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 10: Outsider has no membership rows
SELECT tests.authenticate_as('inv_outsider');
SELECT is(
  (SELECT count(*)::int FROM workspace_members
   WHERE workspace_id = (SELECT id FROM workspaces WHERE slug = 'invite-flow-test')),
  0,
  'Outsider has no membership rows'
);
SELECT tests.clear_authentication();
RESET ROLE;

SELECT * FROM finish();
ROLLBACK;

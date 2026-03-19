-- Test RLS policies on tasks table.
--
-- Policies under test (from fix_rls_recursion migration):
--   INSERT: project members OR workspace admins can create
--   SELECT: project members OR workspace admins can view
--   UPDATE: project members OR workspace admins can update
--   DELETE: project leads OR workspace admins only

BEGIN;
SELECT plan(10);

-- ── Setup ─────────────────────────────────────────────────────────────

SELECT tests.create_supabase_user('task_ws_owner');
SELECT tests.create_supabase_user('task_proj_lead');
SELECT tests.create_supabase_user('task_proj_member');
SELECT tests.create_supabase_user('task_outsider');

-- Create workspace (trigger adds task_ws_owner as owner)
INSERT INTO workspaces (name, slug, created_by)
VALUES ('Tasks RLS Test', 'tasks-rls-test', tests.get_user_id('task_ws_owner'));

-- Add project lead as workspace member
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('task_proj_lead'),
  (SELECT id FROM workspaces WHERE slug = 'tasks-rls-test'),
  'member',
  'active'
);

-- Add project member as workspace member
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('task_proj_member'),
  (SELECT id FROM workspaces WHERE slug = 'tasks-rls-test'),
  'member',
  'active'
);

-- Create project (trigger adds task_proj_lead as lead)
INSERT INTO projects (name, workspace_id, created_by)
VALUES (
  'Task Test Project',
  (SELECT id FROM workspaces WHERE slug = 'tasks-rls-test'),
  tests.get_user_id('task_proj_lead')
);

-- Add project member
INSERT INTO project_members (user_id, project_id, role)
VALUES (
  tests.get_user_id('task_proj_member'),
  (SELECT id FROM projects WHERE name = 'Task Test Project'),
  'member'
);

-- ── INSERT policy ─────────────────────────────────────────────────────

-- Test 1: Project member can create a task
SELECT tests.authenticate_as('task_proj_member');
INSERT INTO tasks (title, project_id, created_by)
VALUES (
  'Member Task',
  (SELECT id FROM projects WHERE name = 'Task Test Project'),
  tests.get_user_id('task_proj_member')
);
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM tasks WHERE title = 'Member Task'),
  1,
  'INSERT: project member can create a task'
);

-- Test 2: Workspace owner can create a task (even without project membership)
SELECT tests.authenticate_as('task_ws_owner');
INSERT INTO tasks (title, project_id, created_by)
VALUES (
  'Owner Task',
  (SELECT id FROM projects WHERE name = 'Task Test Project'),
  tests.get_user_id('task_ws_owner')
);
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM tasks WHERE title = 'Owner Task'),
  1,
  'INSERT: workspace owner can create a task without project membership'
);

-- Test 3: Outsider cannot create a task
SELECT tests.authenticate_as('task_outsider');
SELECT throws_ok(
  format(
    'INSERT INTO tasks (title, project_id, created_by) VALUES (%L, %L, %L)',
    'Outsider Task',
    (SELECT id FROM projects WHERE name = 'Task Test Project'),
    tests.get_user_id('task_outsider')
  ),
  '42501',
  NULL,
  'INSERT: outsider cannot create a task'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── SELECT policy ─────────────────────────────────────────────────────

-- Test 4: Project member can see tasks
SELECT tests.authenticate_as('task_proj_member');
SELECT is(
  (SELECT count(*)::int FROM tasks
   WHERE project_id = (SELECT id FROM projects WHERE name = 'Task Test Project')),
  2,
  'SELECT: project member can see all tasks in project'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 5: Outsider cannot see tasks
SELECT tests.authenticate_as('task_outsider');
SELECT is(
  (SELECT count(*)::int FROM tasks
   WHERE project_id = (SELECT id FROM projects WHERE name = 'Task Test Project')),
  0,
  'SELECT: outsider cannot see any tasks'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── UPDATE policy ─────────────────────────────────────────────────────

-- Test 6: Project member can update a task (e.g., change status)
SELECT tests.authenticate_as('task_proj_member');
UPDATE tasks SET status = 'in_progress' WHERE title = 'Member Task';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT status::text FROM tasks WHERE title = 'Member Task'),
  'in_progress',
  'UPDATE: project member can update task status'
);

-- Test 7: Outsider cannot update tasks
SELECT tests.authenticate_as('task_outsider');
UPDATE tasks SET title = 'Hacked' WHERE title = 'Member Task';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM tasks WHERE title = 'Hacked'),
  0,
  'UPDATE: outsider cannot update tasks'
);

-- ── DELETE policy ─────────────────────────────────────────────────────

-- Test 8: Regular project member cannot delete tasks
SELECT tests.authenticate_as('task_proj_member');
DELETE FROM tasks WHERE title = 'Member Task';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM tasks WHERE title = 'Member Task'),
  1,
  'DELETE: regular project member cannot delete tasks'
);

-- Test 9: Project lead can delete tasks
SELECT tests.authenticate_as('task_proj_lead');
DELETE FROM tasks WHERE title = 'Member Task';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM tasks WHERE title = 'Member Task'),
  0,
  'DELETE: project lead can delete tasks'
);

-- Test 10: Workspace owner can delete tasks
SELECT tests.authenticate_as('task_ws_owner');
DELETE FROM tasks WHERE title = 'Owner Task';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM tasks WHERE title = 'Owner Task'),
  0,
  'DELETE: workspace owner can delete tasks'
);

SELECT * FROM finish();
ROLLBACK;

-- Test activity log triggers: verify that key actions create activity_log entries.

BEGIN;
SELECT plan(8);

-- ── Setup ─────────────────────────────────────────────────────────────

SELECT tests.create_supabase_user('actlog_owner');
SELECT tests.create_supabase_user('actlog_member');

-- Create workspace as owner (triggers handle_new_workspace_owner)
SELECT tests.authenticate_as('actlog_owner');

INSERT INTO workspaces (id, name, slug, created_by)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Activity WS',
  'activity-ws',
  tests.get_user_id('actlog_owner')
);

RESET ROLE;
SELECT tests.clear_authentication();

-- Add member as active
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES (
  tests.get_user_id('actlog_member'),
  'aaaaaaaa-0000-0000-0000-000000000001',
  'member',
  'active'
);

-- Create project as owner (triggers log_project_created + handle_new_project_lead)
SELECT tests.authenticate_as('actlog_owner');

INSERT INTO projects (id, workspace_id, name, created_by)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'Test Project',
  tests.get_user_id('actlog_owner')
);

RESET ROLE;
SELECT tests.clear_authentication();

-- ── Test 1: project_created trigger ───────────────────────────────────

SELECT is(
  (SELECT count(*)::int FROM activity_log
   WHERE workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     AND action = 'project_created'),
  1,
  'project_created: activity entry created when project is inserted'
);

-- ── Test 2: task_created trigger ──────────────────────────────────────

SELECT tests.authenticate_as('actlog_owner');

INSERT INTO tasks (id, project_id, title, created_by)
VALUES (
  'cccccccc-0000-0000-0000-000000000001',
  'bbbbbbbb-0000-0000-0000-000000000001',
  'Test Task',
  tests.get_user_id('actlog_owner')
);

RESET ROLE;
SELECT tests.clear_authentication();

SELECT is(
  (SELECT count(*)::int FROM activity_log
   WHERE workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     AND action = 'task_created'),
  1,
  'task_created: activity entry created when task is inserted'
);

-- ── Test 3: task_created metadata includes task title ─────────────────

SELECT is(
  (SELECT metadata->>'task_title' FROM activity_log
   WHERE action = 'task_created'
     AND workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'
   LIMIT 1),
  'Test Task',
  'task_created: metadata includes task_title'
);

-- ── Test 4: task_updated trigger (status change) ──────────────────────

SELECT tests.authenticate_as('actlog_owner');

UPDATE tasks
SET status = 'in_progress', updated_at = now()
WHERE id = 'cccccccc-0000-0000-0000-000000000001';

RESET ROLE;
SELECT tests.clear_authentication();

SELECT is(
  (SELECT count(*)::int FROM activity_log
   WHERE workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     AND action = 'task_updated'),
  1,
  'task_updated: activity entry created on status change'
);

-- ── Test 5: task_updated skips position-only changes ──────────────────

SELECT tests.authenticate_as('actlog_owner');

UPDATE tasks
SET position = 5, updated_at = now()
WHERE id = 'cccccccc-0000-0000-0000-000000000001';

RESET ROLE;
SELECT tests.clear_authentication();

SELECT is(
  (SELECT count(*)::int FROM activity_log
   WHERE workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     AND action = 'task_updated'),
  1,
  'task_updated: no entry for position-only change (still 1 from before)'
);

-- ── Test 6: comment_added trigger ─────────────────────────────────────

SELECT tests.authenticate_as('actlog_owner');

INSERT INTO comments (task_id, author_id, body)
VALUES (
  'cccccccc-0000-0000-0000-000000000001',
  tests.get_user_id('actlog_owner'),
  'Test comment body'
);

RESET ROLE;
SELECT tests.clear_authentication();

SELECT is(
  (SELECT count(*)::int FROM activity_log
   WHERE workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     AND action = 'comment_added'),
  1,
  'comment_added: activity entry created when comment is inserted'
);

-- ── Test 7: task_deleted trigger ──────────────────────────────────────

SELECT tests.authenticate_as('actlog_owner');

DELETE FROM tasks WHERE id = 'cccccccc-0000-0000-0000-000000000001';

RESET ROLE;
SELECT tests.clear_authentication();

SELECT is(
  (SELECT count(*)::int FROM activity_log
   WHERE workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     AND action = 'task_deleted'),
  1,
  'task_deleted: activity entry created when task is deleted'
);

-- ── Test 8: member_invited trigger ────────────────────────────────────

-- Invite a new user (pending status)
SELECT tests.create_supabase_user('actlog_invitee');

SELECT tests.authenticate_as('actlog_owner');

INSERT INTO workspace_members (user_id, workspace_id, role, status, invited_by)
VALUES (
  tests.get_user_id('actlog_invitee'),
  'aaaaaaaa-0000-0000-0000-000000000001',
  'member',
  'pending',
  tests.get_user_id('actlog_owner')
);

RESET ROLE;
SELECT tests.clear_authentication();

SELECT is(
  (SELECT count(*)::int FROM activity_log
   WHERE workspace_id = 'aaaaaaaa-0000-0000-0000-000000000001'
     AND action = 'member_invited'),
  1,
  'member_invited: activity entry created when member is invited'
);

SELECT * FROM finish();
ROLLBACK;

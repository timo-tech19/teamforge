-- Test RLS policies on comments table.
--
-- Policies under test:
--   INSERT: author_id must match auth.uid(), AND project member or workspace admin
--   SELECT: project members or workspace admins can view
--   UPDATE: author can update own comments only
--   DELETE: author, project lead, or workspace admin can delete

BEGIN;
SELECT plan(11);

-- ── Setup ─────────────────────────────────────────────────────────────

SELECT tests.create_supabase_user('cmt_ws_owner');
SELECT tests.create_supabase_user('cmt_proj_lead');
SELECT tests.create_supabase_user('cmt_proj_member');
SELECT tests.create_supabase_user('cmt_outsider');

-- Create workspace
INSERT INTO workspaces (name, slug, created_by)
VALUES ('Comments RLS Test', 'comments-rls-test', tests.get_user_id('cmt_ws_owner'));

-- Add users as workspace members
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES
  (tests.get_user_id('cmt_proj_lead'), (SELECT id FROM workspaces WHERE slug = 'comments-rls-test'), 'member', 'active'),
  (tests.get_user_id('cmt_proj_member'), (SELECT id FROM workspaces WHERE slug = 'comments-rls-test'), 'member', 'active');

-- Create project (trigger adds cmt_proj_lead as lead)
INSERT INTO projects (name, workspace_id, created_by)
VALUES ('Comment Test Project', (SELECT id FROM workspaces WHERE slug = 'comments-rls-test'), tests.get_user_id('cmt_proj_lead'));

-- Add project member
INSERT INTO project_members (user_id, project_id, role)
VALUES (tests.get_user_id('cmt_proj_member'), (SELECT id FROM projects WHERE name = 'Comment Test Project'), 'member');

-- Create a task to comment on
INSERT INTO tasks (title, project_id, created_by)
VALUES ('Comment Test Task', (SELECT id FROM projects WHERE name = 'Comment Test Project'), tests.get_user_id('cmt_proj_lead'));

-- ── INSERT policy ─────────────────────────────────────────────────────

-- Test 1: Project member can create a comment
SELECT tests.authenticate_as('cmt_proj_member');
INSERT INTO comments (task_id, author_id, body)
VALUES (
  (SELECT id FROM tasks WHERE title = 'Comment Test Task'),
  tests.get_user_id('cmt_proj_member'),
  'Member comment'
);
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM comments WHERE body = 'Member comment'),
  1,
  'INSERT: project member can create a comment'
);

-- Test 2: Workspace owner can comment (even without project membership)
SELECT tests.authenticate_as('cmt_ws_owner');
INSERT INTO comments (task_id, author_id, body)
VALUES (
  (SELECT id FROM tasks WHERE title = 'Comment Test Task'),
  tests.get_user_id('cmt_ws_owner'),
  'Owner comment'
);
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM comments WHERE body = 'Owner comment'),
  1,
  'INSERT: workspace owner can comment without project membership'
);

-- Test 3: Cannot impersonate another user (author_id must match auth.uid)
SELECT tests.authenticate_as('cmt_proj_member');
SELECT throws_ok(
  format(
    'INSERT INTO comments (task_id, author_id, body) VALUES (%L, %L, %L)',
    (SELECT id FROM tasks WHERE title = 'Comment Test Task'),
    tests.get_user_id('cmt_proj_lead'),
    'Impersonated comment'
  ),
  '42501',
  NULL,
  'INSERT: cannot impersonate another user as comment author'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 4: Outsider cannot comment
SELECT tests.authenticate_as('cmt_outsider');
SELECT throws_ok(
  format(
    'INSERT INTO comments (task_id, author_id, body) VALUES (%L, %L, %L)',
    (SELECT id FROM tasks WHERE title = 'Comment Test Task'),
    tests.get_user_id('cmt_outsider'),
    'Outsider comment'
  ),
  '42501',
  NULL,
  'INSERT: outsider cannot comment on tasks'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── SELECT policy ─────────────────────────────────────────────────────

-- Test 5: Project member can see comments
SELECT tests.authenticate_as('cmt_proj_member');
SELECT is(
  (SELECT count(*)::int FROM comments
   WHERE task_id = (SELECT id FROM tasks WHERE title = 'Comment Test Task')),
  2,
  'SELECT: project member can see all comments on task'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 6: Outsider cannot see comments
SELECT tests.authenticate_as('cmt_outsider');
SELECT is(
  (SELECT count(*)::int FROM comments
   WHERE task_id = (SELECT id FROM tasks WHERE title = 'Comment Test Task')),
  0,
  'SELECT: outsider cannot see any comments'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── UPDATE policy ─────────────────────────────────────────────────────

-- Test 7: Author can update own comment
SELECT tests.authenticate_as('cmt_proj_member');
UPDATE comments SET body = 'Edited member comment' WHERE body = 'Member comment';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM comments WHERE body = 'Edited member comment'),
  1,
  'UPDATE: author can edit own comment'
);

-- Test 8: Cannot edit another user''s comment
SELECT tests.authenticate_as('cmt_proj_member');
UPDATE comments SET body = 'Hacked' WHERE body = 'Owner comment';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM comments WHERE body = 'Owner comment'),
  1,
  'UPDATE: cannot edit another user''s comment'
);

-- ── DELETE policy ─────────────────────────────────────────────────────

-- Test 9: Author can delete own comment
SELECT tests.authenticate_as('cmt_proj_member');
DELETE FROM comments WHERE body = 'Edited member comment';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM comments WHERE body = 'Edited member comment'),
  0,
  'DELETE: author can delete own comment'
);

-- Re-add member comment for next tests
SELECT tests.authenticate_as('cmt_proj_member');
INSERT INTO comments (task_id, author_id, body)
VALUES (
  (SELECT id FROM tasks WHERE title = 'Comment Test Task'),
  tests.get_user_id('cmt_proj_member'),
  'Another member comment'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 10: Project lead can delete any comment (moderation)
SELECT tests.authenticate_as('cmt_proj_lead');
DELETE FROM comments WHERE body = 'Another member comment';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM comments WHERE body = 'Another member comment'),
  0,
  'DELETE: project lead can delete any comment (moderation)'
);

-- Test 11: Workspace owner can delete any comment
SELECT tests.authenticate_as('cmt_ws_owner');
DELETE FROM comments WHERE body = 'Owner comment';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM comments WHERE body = 'Owner comment'),
  0,
  'DELETE: workspace owner can delete any comment'
);

SELECT * FROM finish();
ROLLBACK;

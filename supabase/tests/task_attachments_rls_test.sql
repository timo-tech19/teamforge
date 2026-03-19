-- Test RLS policies on task_attachments table.
--
-- Policies under test:
--   INSERT: uploaded_by must match auth.uid(), AND project member or workspace admin
--   SELECT: project members or workspace admins can view
--   DELETE: uploader, project lead, or workspace admin can delete

BEGIN;
SELECT plan(8);

-- ── Setup ─────────────────────────────────────────────────────────────

SELECT tests.create_supabase_user('att_ws_owner');
SELECT tests.create_supabase_user('att_proj_lead');
SELECT tests.create_supabase_user('att_proj_member');
SELECT tests.create_supabase_user('att_outsider');

-- Create workspace
INSERT INTO workspaces (name, slug, created_by)
VALUES ('Attachments RLS Test', 'attachments-rls-test', tests.get_user_id('att_ws_owner'));

-- Add workspace members
INSERT INTO workspace_members (user_id, workspace_id, role, status)
VALUES
  (tests.get_user_id('att_proj_lead'), (SELECT id FROM workspaces WHERE slug = 'attachments-rls-test'), 'member', 'active'),
  (tests.get_user_id('att_proj_member'), (SELECT id FROM workspaces WHERE slug = 'attachments-rls-test'), 'member', 'active');

-- Create project (trigger adds att_proj_lead as lead)
INSERT INTO projects (name, workspace_id, created_by)
VALUES ('Attachment Test Project', (SELECT id FROM workspaces WHERE slug = 'attachments-rls-test'), tests.get_user_id('att_proj_lead'));

-- Add project member
INSERT INTO project_members (user_id, project_id, role)
VALUES (tests.get_user_id('att_proj_member'), (SELECT id FROM projects WHERE name = 'Attachment Test Project'), 'member');

-- Create a task
INSERT INTO tasks (title, project_id, created_by)
VALUES ('Attachment Test Task', (SELECT id FROM projects WHERE name = 'Attachment Test Project'), tests.get_user_id('att_proj_lead'));

-- ── INSERT policy ─────────────────────────────────────────────────────

-- Test 1: Project member can upload an attachment
SELECT tests.authenticate_as('att_proj_member');
INSERT INTO task_attachments (task_id, file_path, file_name, file_size, uploaded_by)
VALUES (
  (SELECT id FROM tasks WHERE title = 'Attachment Test Task'),
  'test/path/file.pdf',
  'file.pdf',
  1024,
  tests.get_user_id('att_proj_member')
);
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM task_attachments WHERE file_name = 'file.pdf'),
  1,
  'INSERT: project member can upload an attachment'
);

-- Test 2: Cannot impersonate another user
SELECT tests.authenticate_as('att_proj_member');
SELECT throws_ok(
  format(
    'INSERT INTO task_attachments (task_id, file_path, file_name, file_size, uploaded_by) VALUES (%L, %L, %L, %s, %L)',
    (SELECT id FROM tasks WHERE title = 'Attachment Test Task'),
    'test/path/fake.pdf',
    'fake.pdf',
    512,
    tests.get_user_id('att_proj_lead')
  ),
  '42501',
  NULL,
  'INSERT: cannot upload attachment as another user'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 3: Outsider cannot upload
SELECT tests.authenticate_as('att_outsider');
SELECT throws_ok(
  format(
    'INSERT INTO task_attachments (task_id, file_path, file_name, file_size, uploaded_by) VALUES (%L, %L, %L, %s, %L)',
    (SELECT id FROM tasks WHERE title = 'Attachment Test Task'),
    'test/path/outsider.pdf',
    'outsider.pdf',
    256,
    tests.get_user_id('att_outsider')
  ),
  '42501',
  NULL,
  'INSERT: outsider cannot upload attachments'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── SELECT policy ─────────────────────────────────────────────────────

-- Test 4: Project member can see attachments
SELECT tests.authenticate_as('att_proj_member');
SELECT is(
  (SELECT count(*)::int FROM task_attachments
   WHERE task_id = (SELECT id FROM tasks WHERE title = 'Attachment Test Task')),
  1,
  'SELECT: project member can see attachments'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 5: Workspace owner can see attachments
SELECT tests.authenticate_as('att_ws_owner');
SELECT is(
  (SELECT count(*)::int FROM task_attachments
   WHERE task_id = (SELECT id FROM tasks WHERE title = 'Attachment Test Task')),
  1,
  'SELECT: workspace owner can see attachments'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 6: Outsider cannot see attachments
SELECT tests.authenticate_as('att_outsider');
SELECT is(
  (SELECT count(*)::int FROM task_attachments
   WHERE task_id = (SELECT id FROM tasks WHERE title = 'Attachment Test Task')),
  0,
  'SELECT: outsider cannot see attachments'
);
SELECT tests.clear_authentication();
RESET ROLE;

-- ── DELETE policy ─────────────────────────────────────────────────────

-- Test 7: Uploader can delete own attachment
SELECT tests.authenticate_as('att_proj_member');
DELETE FROM task_attachments WHERE file_name = 'file.pdf';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM task_attachments WHERE file_name = 'file.pdf'),
  0,
  'DELETE: uploader can delete own attachment'
);

-- Re-add attachment for next test (as lead this time)
SELECT tests.authenticate_as('att_proj_lead');
INSERT INTO task_attachments (task_id, file_path, file_name, file_size, uploaded_by)
VALUES (
  (SELECT id FROM tasks WHERE title = 'Attachment Test Task'),
  'test/path/lead-file.pdf',
  'lead-file.pdf',
  2048,
  tests.get_user_id('att_proj_lead')
);
SELECT tests.clear_authentication();
RESET ROLE;

-- Test 8: Workspace owner can delete any attachment
SELECT tests.authenticate_as('att_ws_owner');
DELETE FROM task_attachments WHERE file_name = 'lead-file.pdf';
SELECT tests.clear_authentication();
RESET ROLE;

SELECT is(
  (SELECT count(*)::int FROM task_attachments WHERE file_name = 'lead-file.pdf'),
  0,
  'DELETE: workspace owner can delete any attachment'
);

SELECT * FROM finish();
ROLLBACK;

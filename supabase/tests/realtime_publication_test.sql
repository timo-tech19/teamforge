-- Test that the tasks table is included in the supabase_realtime publication.

BEGIN;
SELECT plan(1);

-- Verify tasks is in the supabase_realtime publication
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tasks'
  ),
  1,
  'tasks table is included in supabase_realtime publication'
);

SELECT * FROM finish();
ROLLBACK;

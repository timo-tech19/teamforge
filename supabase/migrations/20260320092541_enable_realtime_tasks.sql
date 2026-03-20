-- Enable Supabase Realtime on the tasks table.
-- This adds the table to the supabase_realtime publication so the
-- Realtime server broadcasts INSERT/UPDATE/DELETE events via WAL.
-- RLS is enforced per-event — clients only receive rows they can access.
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

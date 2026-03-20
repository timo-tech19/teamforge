-- Enable REPLICA IDENTITY FULL on tasks so Realtime UPDATE events
-- include the full old row in payload.old (not just the primary key).
-- This lets the client compare old vs new values — e.g. detecting
-- when assigned_to changes to show an assignment toast.
ALTER TABLE tasks REPLICA IDENTITY FULL;

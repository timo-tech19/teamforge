-- Enum types for TeamForge
-- These define the fixed set of values for roles, statuses, and priorities.
-- Using Postgres enums instead of text columns gives us type safety at the
-- database level — invalid values are rejected before they ever hit your app.

create type workspace_role as enum ('owner', 'admin', 'member', 'viewer');

create type member_status as enum ('pending', 'active');

create type project_role as enum ('lead', 'member', 'viewer');

create type project_status as enum ('active', 'paused', 'archived');

create type task_status as enum ('backlog', 'todo', 'in_progress', 'in_review', 'done');

create type task_priority as enum ('low', 'medium', 'high', 'urgent');

create type activity_action as enum (
  'task_created',
  'task_updated',
  'task_deleted',
  'comment_added',
  'member_invited',
  'member_removed',
  'project_created',
  'project_archived'
);

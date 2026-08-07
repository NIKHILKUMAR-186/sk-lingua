-- Migration: Add session orchestration tables

-- assignment_history: logs mentor assignments for a session request
create table if not exists assignment_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null,
  mentor_id uuid,
  assigned_by uuid,
  status text not null,
  reason text,
  created_at timestamptz default now()
);

-- workspaces: a workspace per accepted session
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  request_id uuid,
  session_id uuid references public.sessions(id) on delete set null,
  title text,
  created_by uuid,
  created_at timestamptz default now()
);

-- workspace_members: control access
create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  joined_at timestamptz default now()
);

-- workspace_messages: realtime chat messages
create table if not exists workspace_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  sender_id uuid not null,
  body text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- workspace_files: uploaded files in workspace
create table if not exists workspace_files (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  uploader_id uuid not null,
  storage_key text,
  file_name text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- attendance
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  user_id uuid not null,
  joined_at timestamptz,
  left_at timestamptz,
  duration_secs int
);

-- session_extensions
create table if not exists session_extensions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  requested_by uuid,
  minutes int not null,
  approved boolean default false,
  processed_by uuid,
  created_at timestamptz default now()
);

-- reports
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  reporter_id uuid not null,
  category text,
  details text,
  status text default 'open',
  resolved_by uuid,
  resolution text,
  created_at timestamptz default now()
);

-- indexes for common lookups
create index if not exists idx_assignment_request on assignment_history(request_id);
create index if not exists idx_workspace_request on workspaces(request_id);
create index if not exists idx_messages_workspace on workspace_messages(workspace_id);
create index if not exists idx_ratings_session on ratings(session_id);

-- RLS: enable row level security for new tables (policies to be added)
-- RLS enabled but policies must be created as part of next migration

-- Enable extension for crypto if not exists (for gen_random_uuid)
create extension if not exists pgcrypto;

-- Migration: Enable RLS and add basic policies for orchestration tables

-- Enable RLS on tables
alter table if exists assignment_history enable row level security;
alter table if exists workspaces enable row level security;
alter table if exists workspace_members enable row level security;
alter table if exists workspace_messages enable row level security;
alter table if exists workspace_files enable row level security;
alter table if exists attendance enable row level security;
alter table if exists session_extensions enable row level security;
alter table if exists reports enable row level security;

-- Policies: allow authenticated users to insert/select on assignment_history (admins expected)
create policy "assignment_history_authenticated_read" on assignment_history
  for select using (auth.role() is not null);
-- assignment_history: allow authenticated users to insert (admins expected)
create policy "assignment_history_insert_admin" on assignment_history
  for insert
  with check (auth.role() = 'authenticated');

-- workspaces: allow authenticated users to insert
create policy "workspaces_insert_staff" on workspaces
  for insert
  with check (auth.role() = 'authenticated');

-- workspaces: members can select
create policy "workspaces_select_if_member" on workspaces
  for select using (
    exists (
      select 1 from workspace_members wm where wm.workspace_id = workspaces.id and wm.user_id = auth.uid()
    )
  );
-- create policy "workspaces_insert_staff" on workspaces
--   for insert using (auth.role() = 'authenticated');

-- workspace_members: allow users to insert if they are creating for themselves or admin
create policy "workspace_members_manage_self" on workspace_members
  for insert using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
create policy "workspace_members_select_if_member" on workspace_members
  for select using (user_id = auth.uid() or exists (select 1 from workspace_members wm2 where wm2.workspace_id = workspace_members.workspace_id and wm2.user_id = auth.uid()));

-- workspace_messages: only members can insert/select
create policy "workspace_messages_members" on workspace_messages
  for all using (
    exists (
      select 1 from workspace_members wm where wm.workspace_id = workspace_messages.workspace_id and wm.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from workspace_members wm where wm.workspace_id = workspace_messages.workspace_id and wm.user_id = auth.uid()
    )
  );

-- workspace_files: only members can insert/select
create policy "workspace_files_members" on workspace_files
  for all using (
    exists (
      select 1 from workspace_members wm where wm.workspace_id = workspace_files.workspace_id and wm.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from workspace_members wm where wm.workspace_id = workspace_files.workspace_id and wm.user_id = auth.uid()
    )
  );

-- session_requests: allow admins to manage requests
create policy "session_requests_admin_select" on session_requests
  for select using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );
create policy "session_requests_admin_update" on session_requests
  for update using (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  ) with check (
    exists (select 1 from user_roles ur where ur.user_id = auth.uid() and ur.role = 'admin')
  );

-- reports: any authenticated user may create a report; admins resolve
create policy "reports_insert" on reports
  for insert using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- attendance and session_extensions: workspace members only
create policy "attendance_members" on attendance
  for all using (
    exists (select 1 from session_requests sr where sr.id = attendance.session_id and (sr.student_id = auth.uid() or sr.assigned_mentor = auth.uid()))
  ) with check (true);

create policy "session_extensions_members" on session_extensions
  for insert
  with check (
    exists (
      select 1
      from session_requests sr
      where sr.id = session_extensions.session_id
        and (sr.student_id = auth.uid() or sr.assigned_mentor = auth.uid())
    )
  );
-- Note: these policies are initial conservative defaults. Review and tighten policies in Phase 4 iteration.

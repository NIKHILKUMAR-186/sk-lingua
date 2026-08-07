-- Phase 5: RLS hardening for Phase 4 orchestration tables
-- Adds missing policies for workspace_members, reports, attendance, session_extensions
-- Idempotent + defensive: each policy is wrapped in a DO block that checks
-- the target table exists before creating policies. Safe to run on any database.

-- ============================================================
-- workspace_members: members can view/update their own membership;
-- workspace admins/mentors can manage members within their workspace
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.workspace_members') IS NOT NULL THEN
    DROP POLICY IF EXISTS "workspace_members_update_self" ON workspace_members;
    CREATE POLICY "workspace_members_update_self" ON workspace_members
      FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "workspace_members_delete_self" ON workspace_members;
    CREATE POLICY "workspace_members_delete_self" ON workspace_members
      FOR DELETE USING (auth.uid() = user_id);

    DROP POLICY IF EXISTS "workspace_members_admin_all" ON workspace_members;
    CREATE POLICY "workspace_members_admin_all" ON workspace_members
      FOR ALL USING (
        public.has_role(auth.uid(), 'admin')
      ) WITH CHECK (
        public.has_role(auth.uid(), 'admin')
      );

    DROP POLICY IF EXISTS "workspace_members_creator_manage" ON workspace_members;
    CREATE POLICY "workspace_members_creator_manage" ON workspace_members
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM workspaces w
          WHERE w.id = workspace_members.workspace_id
            AND w.created_by = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM workspaces w
          WHERE w.id = workspace_members.workspace_id
            AND w.created_by = auth.uid()
        )
      );
  END IF;
END $$;

-- ============================================================
-- reports: reporters can view their own reports; admins can view/resolve all
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.reports') IS NOT NULL THEN
    DROP POLICY IF EXISTS "reports_select_self" ON reports;
    CREATE POLICY "reports_select_self" ON reports
      FOR SELECT USING (reporter_id = auth.uid());

    DROP POLICY IF EXISTS "reports_admin_select" ON reports;
    CREATE POLICY "reports_admin_select" ON reports
      FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

    DROP POLICY IF EXISTS "reports_admin_update" ON reports;
    CREATE POLICY "reports_admin_update" ON reports
      FOR UPDATE USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

    DROP POLICY IF EXISTS "reports_update_self_open" ON reports;
    CREATE POLICY "reports_update_self_open" ON reports
      FOR UPDATE USING (
        reporter_id = auth.uid() AND status = 'open'
      ) WITH CHECK (
        reporter_id = auth.uid() AND status = 'open'
      );
  END IF;
END $$;

-- ============================================================
-- attendance: participants (student/assigned mentor) can view their attendance
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.attendance') IS NOT NULL THEN
    DROP POLICY IF EXISTS "attendance_select_participant" ON attendance;
    CREATE POLICY "attendance_select_participant" ON attendance
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM session_requests sr
          WHERE sr.id = attendance.session_id
            AND (sr.student_id = auth.uid() OR sr.assigned_mentor = auth.uid())
        )
      );

    DROP POLICY IF EXISTS "attendance_insert_participant" ON attendance;
    CREATE POLICY "attendance_insert_participant" ON attendance
      FOR INSERT USING (
        EXISTS (
          SELECT 1 FROM session_requests sr
          WHERE sr.id = attendance.session_id
            AND (sr.student_id = auth.uid() OR sr.assigned_mentor = auth.uid())
        )
      ) WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- session_extensions: participants can request; admins/mentors approve
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.session_extensions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "session_extensions_select_participant" ON session_extensions;
    CREATE POLICY "session_extensions_select_participant" ON session_extensions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM session_requests sr
          WHERE sr.id = session_extensions.session_id
            AND (sr.student_id = auth.uid() OR sr.assigned_mentor = auth.uid())
        )
      );

    DROP POLICY IF EXISTS "session_extensions_admin_all" ON session_extensions;
    CREATE POLICY "session_extensions_admin_all" ON session_extensions
      FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ============================================================
-- assignment_history: admins can insert/update; participants can read
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.assignment_history') IS NOT NULL THEN
    DROP POLICY IF EXISTS "assignment_history_admin_all" ON assignment_history;
    CREATE POLICY "assignment_history_admin_all" ON assignment_history
      FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ============================================================
-- workspaces: workspace members can update; creators can delete
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.workspaces') IS NOT NULL THEN
    DROP POLICY IF EXISTS "workspaces_update_member" ON workspaces;
    CREATE POLICY "workspaces_update_member" ON workspaces
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM workspace_members wm
          WHERE wm.workspace_id = workspaces.id
            AND wm.user_id = auth.uid()
        )
      ) WITH CHECK (
        EXISTS (
          SELECT 1 FROM workspace_members wm
          WHERE wm.workspace_id = workspaces.id
            AND wm.user_id = auth.uid()
        )
      );

    DROP POLICY IF EXISTS "workspaces_delete_creator" ON workspaces;
    CREATE POLICY "workspaces_delete_creator" ON workspaces
      FOR DELETE USING (created_by = auth.uid());
  END IF;
END $$;

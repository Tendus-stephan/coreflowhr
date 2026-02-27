-- Site-wide RLS tightening: ensure no user can read or overwrite another user's/workspace's data.
-- 1) Helper for "Admin or Recruiter in workspace"
-- 2) Profiles & notifications: strictly own data only
-- 3) Candidates, interviews, offers: write (INSERT/UPDATE/DELETE) only owner or workspace Admin/Recruiter
-- 4) activity_log: INSERT only as self
-- 5) clients, email_templates, user_settings: workspace or own scoping

-- Helper: true if current user is Admin or Recruiter in this workspace (bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_workspace_admin_or_recruiter(ws_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = ws_id AND user_id = auth.uid() AND role IN ('Admin', 'Recruiter')
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_workspace_admin_or_recruiter(UUID) TO authenticated;

-- ========== PROFILES: only own row ==========
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- ========== NOTIFICATIONS: only own (recipient) ==========
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== CANDIDATES: read already restricted by 20260228330000; restrict writes to owner or workspace Admin/Recruiter ==========
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'candidates' AND column_name = 'workspace_id') THEN
    DROP POLICY IF EXISTS "Users can insert own candidates" ON public.candidates;
    CREATE POLICY "Users can insert own candidates" ON public.candidates FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        AND (workspace_id IS NULL OR public.is_workspace_member(workspace_id))
      );
    DROP POLICY IF EXISTS "Users can update own candidates" ON public.candidates;
    CREATE POLICY "Users can update own candidates" ON public.candidates FOR UPDATE
      USING (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.is_workspace_admin_or_recruiter(workspace_id))
      )
      WITH CHECK (true);
    DROP POLICY IF EXISTS "Users can delete own candidates" ON public.candidates;
    CREATE POLICY "Users can delete own candidates" ON public.candidates FOR DELETE
      USING (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.is_workspace_admin_or_recruiter(workspace_id))
      );
  END IF;
END $$;

-- ========== INTERVIEWS: same pattern ==========
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'interviews' AND column_name = 'workspace_id') THEN
    DROP POLICY IF EXISTS "Users can insert own interviews" ON public.interviews;
    CREATE POLICY "Users can insert own interviews" ON public.interviews FOR INSERT
      WITH CHECK (
        user_id = auth.uid()
        AND (workspace_id IS NULL OR public.is_workspace_member(workspace_id))
      );
    DROP POLICY IF EXISTS "Users can update own interviews" ON public.interviews;
    CREATE POLICY "Users can update own interviews" ON public.interviews FOR UPDATE
      USING (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.is_workspace_admin_or_recruiter(workspace_id))
      )
      WITH CHECK (true);
    DROP POLICY IF EXISTS "Users can delete own interviews" ON public.interviews;
    CREATE POLICY "Users can delete own interviews" ON public.interviews FOR DELETE
      USING (
        user_id = auth.uid()
        OR (workspace_id IS NOT NULL AND public.is_workspace_admin_or_recruiter(workspace_id))
      );
  END IF;
END $$;

-- ========== OFFERS: write only owner or workspace Admin/Recruiter (via offer's workspace from candidate->job or job_id) ==========
-- Offers have job_id and optional candidate_id. We scope by workspace: allow if user is owner or if the offer's job is in a workspace where user is Admin/Recruiter.
DROP POLICY IF EXISTS "Users can create their offers" ON public.offers;
DROP POLICY IF EXISTS "Users can update their offers" ON public.offers;
DROP POLICY IF EXISTS "Users can delete their offers" ON public.offers;
CREATE POLICY "Users can create their offers" ON public.offers FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their offers" ON public.offers FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = offers.job_id AND j.workspace_id IS NOT NULL AND public.is_workspace_admin_or_recruiter(j.workspace_id)
    )
  )
  WITH CHECK (true);
CREATE POLICY "Users can delete their offers" ON public.offers FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = offers.job_id AND j.workspace_id IS NOT NULL AND public.is_workspace_admin_or_recruiter(j.workspace_id)
    )
  );

-- ========== ACTIVITY_LOG: only insert as self; no delete for users ==========
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_log') THEN
    ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_log;
    CREATE POLICY "Users can insert own activity" ON public.activity_log FOR INSERT WITH CHECK (user_id = auth.uid());
    -- Ensure no permissive DELETE policy for normal users (leave no policy = deny)
    DROP POLICY IF EXISTS "Users can delete own activity" ON public.activity_log;
  END IF;
END $$;

-- ========== USER_SETTINGS: only own rows ==========
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.user_settings;
CREATE POLICY "Users can view own settings" ON public.user_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON public.user_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ========== CLIENTS: own or same workspace ==========
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'workspace_id') THEN
    CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT
      USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)));
    CREATE POLICY "Users can insert their own clients" ON public.clients FOR INSERT
      WITH CHECK (auth.uid() = user_id AND (workspace_id IS NULL OR public.is_workspace_member(workspace_id)));
    CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE
      USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)))
      WITH CHECK (true);
    CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE
      USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_admin_or_recruiter(workspace_id)));
  ELSE
    CREATE POLICY "Users can view their own clients" ON public.clients FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert their own clients" ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update their own clients" ON public.clients FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can delete their own clients" ON public.clients FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- ========== EMAIL_TEMPLATES: workspace-scoped ==========
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'email_templates' AND column_name = 'workspace_id') THEN
    ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own templates" ON public.email_templates;
    DROP POLICY IF EXISTS "Users can insert own templates" ON public.email_templates;
    DROP POLICY IF EXISTS "Users can update own templates" ON public.email_templates;
    DROP POLICY IF EXISTS "Users can delete own templates" ON public.email_templates;
    CREATE POLICY "Users can view own templates" ON public.email_templates FOR SELECT
      USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)));
    CREATE POLICY "Users can insert own templates" ON public.email_templates FOR INSERT
      WITH CHECK (auth.uid() = user_id AND (workspace_id IS NULL OR public.is_workspace_member(workspace_id)));
    CREATE POLICY "Users can update own templates" ON public.email_templates FOR UPDATE
      USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)))
      WITH CHECK (true);
    CREATE POLICY "Users can delete own templates" ON public.email_templates FOR DELETE
      USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_admin_or_recruiter(workspace_id)));
  END IF;
END $$;

-- ========== INTEGRATIONS: workspace-scoped if column exists, else own ==========
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'integrations' AND column_name = 'workspace_id') THEN
    ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Users can insert own integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Users can update own integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Users can delete own integrations" ON public.integrations;
    CREATE POLICY "Users can view own integrations" ON public.integrations FOR SELECT
      USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)));
    CREATE POLICY "Users can insert own integrations" ON public.integrations FOR INSERT
      WITH CHECK (auth.uid() = user_id AND (workspace_id IS NULL OR public.is_workspace_member(workspace_id)));
    CREATE POLICY "Users can update own integrations" ON public.integrations FOR UPDATE
      USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id)))
      WITH CHECK (true);
    CREATE POLICY "Users can delete own integrations" ON public.integrations FOR DELETE
      USING (auth.uid() = user_id OR (workspace_id IS NOT NULL AND public.is_workspace_admin_or_recruiter(workspace_id)));
  ELSE
    ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Users can view own integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Users can insert own integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Users can update own integrations" ON public.integrations;
    DROP POLICY IF EXISTS "Users can delete own integrations" ON public.integrations;
    CREATE POLICY "Users can view own integrations" ON public.integrations FOR SELECT USING (auth.uid() = user_id);
    CREATE POLICY "Users can insert own integrations" ON public.integrations FOR INSERT WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can update own integrations" ON public.integrations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    CREATE POLICY "Users can delete own integrations" ON public.integrations FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

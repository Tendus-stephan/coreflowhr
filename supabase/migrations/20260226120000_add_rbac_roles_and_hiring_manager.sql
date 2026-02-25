-- RBAC: role on profiles, hiring_manager_id on jobs, and RLS for Hiring Manager visibility
-- Existing users remain single-tenant; role defaults to Admin.

-- 1. Ensure profiles.role supports Admin, Recruiter, HiringManager (keep existing column, set default)
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'Admin';

-- Allow only these role values (optional; uncomment if you want strict enum)
-- ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
--   CHECK (role IN ('Admin', 'Recruiter', 'HiringManager'));

-- 2. Jobs: add hiring manager (nullable; when set, Hiring Manager role can view this job and its candidates)
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS hiring_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jobs_hiring_manager_id ON public.jobs(hiring_manager_id);

-- 3. RLS: Hiring managers can SELECT jobs where they are the hiring manager
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
CREATE POLICY "Users can view own jobs" ON public.jobs
  FOR SELECT USING (
    auth.uid() = user_id OR auth.uid() = hiring_manager_id
  );

-- 4. Candidates: Hiring managers can SELECT candidates for jobs where they are hiring manager
DROP POLICY IF EXISTS "Users can view own candidates" ON public.candidates;
CREATE POLICY "Users can view own candidates" ON public.candidates
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.jobs J
      WHERE J.id = candidates.job_id AND J.hiring_manager_id = auth.uid()
    )
  );

-- 5. Interviews: Hiring managers can SELECT interviews for candidates on their jobs
DROP POLICY IF EXISTS "Users can view own interviews" ON public.interviews;
CREATE POLICY "Users can view own interviews" ON public.interviews
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.candidates C
      JOIN public.jobs J ON J.id = C.job_id
      WHERE C.id = interviews.candidate_id AND J.hiring_manager_id = auth.uid()
    )
  );

-- 6. Offers: Hiring managers can SELECT offers for candidates on their jobs
DROP POLICY IF EXISTS "Users can view their offers" ON public.offers;
DROP POLICY IF EXISTS "Users can view own offers" ON public.offers;
CREATE POLICY "Users can view their offers" ON public.offers
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.candidates C
      JOIN public.jobs J ON J.id = C.job_id
      WHERE C.id = offers.candidate_id AND J.hiring_manager_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE remain owner-only (user_id = auth.uid()) for jobs, candidates, interviews, offers
-- so Hiring Managers can only view and submit feedback, not create/delete.

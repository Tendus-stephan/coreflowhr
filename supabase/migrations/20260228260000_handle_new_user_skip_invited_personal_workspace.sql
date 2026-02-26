-- Refine handle_new_user so invited users do NOT get their own personal workspace as Admin.
-- Goal: only non-invited signups get a personal workspace; invited users belong to an existing workspace and are never Admin there.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_workspace_name TEXT;
  v_has_pending_invite BOOLEAN := FALSE;
BEGIN
  -- Insert profile if it doesn't exist (handle duplicate signups)
  INSERT INTO public.profiles (id, name, email_notifications)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    true
  )
  ON CONFLICT (id) DO NOTHING;

  -- Detect if this email has a pending workspace invite.
  -- Invited users should NOT get a personal workspace where they are owner/Admin.
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.workspace_invites wi
      WHERE LOWER(TRIM(wi.email)) = LOWER(TRIM(NEW.email))
        AND wi.expires_at > NOW()
        AND wi.accepted_at IS NULL
    ) INTO v_has_pending_invite;
  END IF;

  -- Only auto-create a personal workspace when the user was NOT invited into an existing workspace.
  IF NOT v_has_pending_invite THEN
    -- Create workspace for new user and add them as Admin (so they are never \"Viewer\" by default)
    SELECT id INTO v_workspace_id FROM public.workspaces WHERE created_by = NEW.id LIMIT 1;
    IF v_workspace_id IS NULL THEN
      v_workspace_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'name'), ''),
        (SELECT name FROM public.profiles WHERE id = NEW.id),
        CASE WHEN NEW.email IS NOT NULL AND NEW.email <> '' THEN split_part(NEW.email, '@', 1) ELSE NULL END,
        'My Workspace'
      );
      INSERT INTO public.workspaces (name, created_by)
      VALUES (v_workspace_name, NEW.id)
      RETURNING id INTO v_workspace_id;
    END IF;
    IF v_workspace_id IS NOT NULL THEN
      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      VALUES (v_workspace_id, NEW.id, 'Admin')
      ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'Admin';
    END IF;
  END IF;

  -- Create default settings with 'Free' plan (handle duplicates)
  INSERT INTO public.user_settings (user_id, billing_plan_name)
  VALUES (NEW.id, 'Free')
  ON CONFLICT (user_id) DO NOTHING;

  -- Create default email templates (handle duplicates - use user-specific IDs)
  INSERT INTO public.email_templates (id, user_id, title, "desc", type, subject, content)
  VALUES
    (NEW.id::text || '_screening', NEW.id, 'Screening Outreach', 'Sent when candidate is sourced', 'Sourcing',
     'Application Invitation – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nWe are writing to express our interest in your professional profile...'),
    (NEW.id::text || '_interview', NEW.id, 'Interview Invitation', 'Sent to schedule interviews', 'Interview',
     'Interview Invitation – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nThank you for your interest in the {job_title} position at {company_name}. We were impressed with your application and would like to invite you for an interview.\n\n{interview_details}\n\nPlease confirm your availability by replying to this email. If you have any questions or need to reschedule, please don''t hesitate to reach out.\n\nWe look forward to meeting with you!\n\nBest regards,\n{interviewer_name}\n{company_name}'),
    (NEW.id::text || '_reschedule', NEW.id, 'Interview Reschedule', 'Sent when interview is rescheduled', 'Reschedule',
     'Interview Rescheduled – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nWe wanted to inform you that your interview for the {job_title} position at {company_name} has been rescheduled.\n\n**Previous Interview Time:**\n{previous_interview_time}\n\n**New Interview Time:**\n{new_interview_time}\n\n{meeting_link}\n{address}\n\nIf you have any questions or concerns about this change, please don''t hesitate to reach out to us.\n\nWe apologize for any inconvenience and look forward to speaking with you at the new scheduled time.\n\nBest regards,\nRecruiter'),
    (NEW.id::text || '_rejection', NEW.id, 'Rejection Letter', 'Sent to rejected candidates', 'Rejection',
     'Application Status Update – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nThank you for your interest...'),
    (NEW.id::text || '_offer', NEW.id, 'Offer Letter', 'Sent with job offers', 'Offer',
     'Formal Job Offer – {position_title} at {company_name}',
     'Dear {candidate_name},\n\nWe are delighted to extend a formal job offer for the {position_title} position at {company_name}.\n\nOffer Details:\nPosition: {position_title}\nSalary: {salary}\nStart Date: {start_date}\nExpires: {expires_at}\n\n{benefits}\n\nWe were impressed with your qualifications and believe you will be a valuable addition to our team.\n\nPlease review the offer details and let us know if you have any questions. We look forward to welcoming you to {company_name}!\n\nBest regards,\n{company_name}'),
    (NEW.id::text || '_hired', NEW.id, 'Hired Letter', 'Sent to hired candidates', 'Hired',
     'Welcome to {company_name} – Onboarding Information',
     'Dear {candidate_name},\n\nOn behalf of {company_name}...')
  ON CONFLICT (id) DO NOTHING;

  -- Create default integrations (handle duplicates - use user-specific IDs)
  INSERT INTO public.integrations (id, user_id, name, "desc", active, logo)
  VALUES
    (NEW.id::text || '_gcal', NEW.id, 'Google Calendar', 'Sync interviews bi-directionally.', false, 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg'),
    (NEW.id::text || '_meet', NEW.id, 'Google Meet', 'Auto-generate video links.', false, 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Meet_icon_%282020%29.svg')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- One-off fix for existing invited users who wrongly got their own personal workspace as Admin.
-- For now, specifically fix tendusdera03@gmail.com so they no longer own or admin a personal workspace.
DO $$
DECLARE
  v_user_id UUID;
  v_ws_id UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = 'tendusdera03@gmail.com';
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_ws_id IN
    SELECT id FROM public.workspaces WHERE created_by = v_user_id
  LOOP
    -- If this \"personal\" workspace has no data yet, delete it entirely.
    IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE workspace_id = v_ws_id)
       AND NOT EXISTS (SELECT 1 FROM public.candidates WHERE workspace_id = v_ws_id)
       AND NOT EXISTS (SELECT 1 FROM public.interviews WHERE workspace_id = v_ws_id)
       AND NOT EXISTS (SELECT 1 FROM public.offers WHERE workspace_id = v_ws_id) THEN
      DELETE FROM public.workspace_members WHERE workspace_id = v_ws_id;
      DELETE FROM public.workspaces WHERE id = v_ws_id;
    ELSE
      -- Otherwise, ensure this user is not Admin and not the owner.
      UPDATE public.workspace_members
      SET role = 'Viewer'
      WHERE workspace_id = v_ws_id AND user_id = v_user_id;

      UPDATE public.workspaces
      SET created_by = NULL
      WHERE id = v_ws_id AND created_by = v_user_id;
    END IF;
  END LOOP;
END $$;


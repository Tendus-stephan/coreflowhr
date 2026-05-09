-- Fix 1: Previous migration (20260506000000) accidentally overwrote handle_new_user
-- with a version that lost the invited-user skip logic from 20260228260000.
-- This restores the correct function: invite-aware + sets workspace_id on templates/integrations.

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

  -- Only auto-create a personal workspace when the user was NOT invited.
  IF NOT v_has_pending_invite THEN
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

  -- Create default email templates — include workspace_id so workspace members can read them
  INSERT INTO public.email_templates (id, user_id, workspace_id, title, "desc", type, subject, content)
  VALUES
    (NEW.id::text || '_screening', NEW.id, v_workspace_id, 'Screening Outreach', 'Sent when candidate moves to Screening', 'Screening',
     'Application Invitation – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nWe are writing to express our interest in your professional profile...'),
    (NEW.id::text || '_interview', NEW.id, v_workspace_id, 'Interview Invitation', 'Sent to schedule interviews', 'Interview',
     'Interview Invitation – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nThank you for your interest in the {job_title} position at {company_name}. We were impressed with your application and would like to invite you for an interview.\n\n{interview_details}\n\nPlease confirm your availability by replying to this email. If you have any questions or need to reschedule, please don''t hesitate to reach out.\n\nWe look forward to meeting with you!\n\nBest regards,\n{interviewer_name}\n{company_name}'),
    (NEW.id::text || '_reschedule', NEW.id, v_workspace_id, 'Interview Reschedule', 'Sent when interview is rescheduled', 'Reschedule',
     'Interview Rescheduled – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nWe wanted to inform you that your interview for the {job_title} position at {company_name} has been rescheduled.\n\n**Previous Interview Time:**\n{previous_interview_time}\n\n**New Interview Time:**\n{new_interview_time}\n\n{meeting_link}\n{address}\n\nIf you have any questions or concerns about this change, please don''t hesitate to reach out to us.\n\nWe apologize for any inconvenience and look forward to speaking with you at the new scheduled time.\n\nBest regards,\nRecruiter'),
    (NEW.id::text || '_rejection', NEW.id, v_workspace_id, 'Rejection Letter', 'Sent to rejected candidates', 'Rejection',
     'Application Status Update – {job_title} Position at {company_name}',
     'Dear {candidate_name},\n\nThank you for your interest...'),
    (NEW.id::text || '_offer', NEW.id, v_workspace_id, 'Offer Letter', 'Sent with job offers', 'Offer',
     'Formal Job Offer – {position_title} at {company_name}',
     'Dear {candidate_name},\n\nWe are delighted to extend a formal job offer for the {position_title} position at {company_name}.\n\nOffer Details:\nPosition: {position_title}\nSalary: {salary}\nStart Date: {start_date}\nExpires: {expires_at}\n\n{benefits}\n\nWe were impressed with your qualifications and believe you will be a valuable addition to our team.\n\nPlease review the offer details and let us know if you have any questions. We look forward to welcoming you to {company_name}!\n\nBest regards,\n{company_name}'),
    (NEW.id::text || '_hired', NEW.id, v_workspace_id, 'Hired Letter', 'Sent to hired candidates', 'Hired',
     'Welcome to {company_name} – Onboarding Information',
     'Dear {candidate_name},\n\nOn behalf of {company_name}...')
  ON CONFLICT (id) DO NOTHING;

  -- Create default integrations — include workspace_id so workspace members can read them
  INSERT INTO public.integrations (id, user_id, workspace_id, name, "desc", active, logo)
  VALUES
    (NEW.id::text || '_gcal', NEW.id, v_workspace_id, 'Google Calendar', 'Sync interviews bi-directionally.', false, 'https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg'),
    (NEW.id::text || '_meet', NEW.id, v_workspace_id, 'Google Meet', 'Auto-generate video links.', false, 'https://upload.wikimedia.org/wikipedia/commons/9/9b/Google_Meet_icon_%282020%29.svg')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Fix 2: SECURITY DEFINER RPC so non-admin workspace members can always read
-- the admin's active integrations, bypassing RLS entirely.
-- Used as the fallback in getIntegrations() when the caller has no active integrations.

CREATE OR REPLACE FUNCTION public.get_workspace_admin_integrations(p_workspace_id UUID)
RETURNS TABLE(name TEXT, active BOOLEAN, connected_date TIMESTAMPTZ, config JSONB)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Only workspace members may call this
  IF NOT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT i.name, i.active, i.connected_date, i.config
  FROM public.integrations i
  JOIN public.workspace_members wm ON wm.user_id = i.user_id
  WHERE wm.workspace_id = p_workspace_id
    AND wm.role = 'Admin'
    AND i.active = true;
END;
$$;

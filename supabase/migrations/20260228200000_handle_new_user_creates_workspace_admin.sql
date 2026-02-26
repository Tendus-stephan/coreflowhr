-- ROOT CAUSE: handle_new_user() never created a workspace or workspace_members row.
-- New users (including paying) had 0 rows in workspace_members, so the app defaulted to 'Viewer'.
-- Fix: create a workspace and add the new user as Admin on every signup.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_workspace_id UUID;
  v_workspace_name TEXT;
BEGIN
  -- Insert profile if it doesn't exist (handle duplicate signups)
  INSERT INTO public.profiles (id, name, email_notifications)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    true
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create workspace for new user and add them as Admin (so they are never "Viewer" by default)
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

-- One-time backfill: give every existing user who has no workspace_members row a workspace and Admin role
DO $$
DECLARE
  r RECORD;
  v_workspace_id UUID;
  v_name TEXT;
BEGIN
  FOR r IN
    SELECT u.id AS uid
    FROM auth.users u
    WHERE NOT EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.user_id = u.id)
  LOOP
    SELECT id INTO v_workspace_id FROM public.workspaces WHERE created_by = r.uid LIMIT 1;
    IF v_workspace_id IS NULL THEN
      SELECT COALESCE(NULLIF(TRIM(p.name), ''), split_part(u.email, '@', 1), 'My Workspace')
        INTO v_name
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE u.id = r.uid;
      v_name := COALESCE(v_name, 'My Workspace');
      INSERT INTO public.workspaces (name, created_by)
      VALUES (v_name, r.uid)
      RETURNING id INTO v_workspace_id;
    END IF;
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (v_workspace_id, r.uid, 'Admin')
    ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = 'Admin';
  END LOOP;

  -- Ensure every workspace owner has role Admin (fixes those overwritten by invite-accept)
  UPDATE public.workspace_members wm
  SET role = 'Admin'
  FROM public.workspaces w
  WHERE w.id = wm.workspace_id
    AND w.created_by = wm.user_id
    AND wm.role IS DISTINCT FROM 'Admin';
END $$;

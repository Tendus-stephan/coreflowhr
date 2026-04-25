-- Seed "Interview - Sourced" email template for all existing users who don't already have one.
-- This template is used when scheduling interviews with imported/CV-uploaded candidates,
-- so the language reflects sourcing ("We came across your profile...") rather than application
-- ("Thank you for your application...").

INSERT INTO public.email_templates (id, user_id, title, "desc", type, subject, content)
SELECT
  u.id::text || '_interview_sourced',
  u.id,
  'Interview Invitation (Imported)',
  'Sent to candidates who were imported or sourced — not direct applicants',
  'Interview - Sourced',
  'Interview Invitation – {job_title} at {company_name}',
  E'Dear {candidate_name},\n\nWe came across your profile and were impressed by your background. We would love to learn more about your experience and explore a potential opportunity as {job_title} at {company_name}.\n\n{interview_details}\n\nPlease confirm your availability by replying to this email. If you have any questions or need to reschedule, please don''t hesitate to reach out.\n\nWe look forward to connecting with you!\n\nBest regards,\n{interviewer_name}\n{company_name}'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_templates et
  WHERE et.user_id = u.id AND et.type = 'Interview - Sourced'
)
ON CONFLICT (id) DO NOTHING;


-- Update the handle_new_user trigger to also seed the sourced template for new users.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_workspace_id UUID;
  existing_invite_token TEXT;
BEGIN
  -- Skip workspace creation for invited users (they'll join an existing workspace)
  BEGIN
    existing_invite_token := current_setting('app.invite_token', true);
  EXCEPTION WHEN OTHERS THEN
    existing_invite_token := NULL;
  END;

  IF existing_invite_token IS NOT NULL AND existing_invite_token != '' THEN
    RETURN NEW;
  END IF;

  -- Create a personal workspace for the new user
  INSERT INTO public.workspaces (id, name, owner_id)
  VALUES (gen_random_uuid(), COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)) || '''s Workspace', NEW.id)
  RETURNING id INTO new_workspace_id;

  -- Add user as admin of their workspace
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'admin')
  ON CONFLICT (workspace_id, user_id) DO NOTHING;

  -- Seed default email templates
  INSERT INTO public.email_templates (id, user_id, title, "desc", type, subject, content)
  VALUES
    (NEW.id::text || '_screening', NEW.id, 'Screening Outreach', 'Sent when candidate moves to Screening', 'Screening',
     'Application Invitation – {job_title} Position at {company_name}',
     E'Dear {candidate_name},\n\nWe are writing to express our interest in your professional profile for the {job_title} position at {company_name}.\n\nWe would love to learn more about your background and discuss how your skills might align with our needs.\n\nBest regards,\n{your_name}\n{company_name}'),

    (NEW.id::text || '_interview', NEW.id, 'Interview Invitation', 'Sent to schedule interviews with applicants', 'Interview',
     'Interview Invitation – {job_title} Position at {company_name}',
     E'Dear {candidate_name},\n\nThank you for your interest in the {job_title} position at {company_name}. We were impressed with your application and would like to invite you for an interview.\n\n{interview_details}\n\nPlease confirm your availability by replying to this email. If you have any questions or need to reschedule, please don''t hesitate to reach out.\n\nWe look forward to meeting with you!\n\nBest regards,\n{interviewer_name}\n{company_name}'),

    (NEW.id::text || '_interview_sourced', NEW.id, 'Interview Invitation (Imported)', 'Sent to candidates who were imported or sourced — not direct applicants', 'Interview - Sourced',
     'Interview Invitation – {job_title} at {company_name}',
     E'Dear {candidate_name},\n\nWe came across your profile and were impressed by your background. We would love to learn more about your experience and explore a potential opportunity as {job_title} at {company_name}.\n\n{interview_details}\n\nPlease confirm your availability by replying to this email. If you have any questions or need to reschedule, please don''t hesitate to reach out.\n\nWe look forward to connecting with you!\n\nBest regards,\n{interviewer_name}\n{company_name}'),

    (NEW.id::text || '_reschedule', NEW.id, 'Interview Reschedule', 'Sent when interview is rescheduled', 'Reschedule',
     'Interview Rescheduled – {job_title} Position at {company_name}',
     E'Dear {candidate_name},\n\nWe wanted to inform you that your interview for the {job_title} position at {company_name} has been rescheduled.\n\n**Previous Interview Time:**\n{previous_interview_time}\n\n**New Interview Time:**\n{new_interview_time}\n\n{meeting_link}\n{address}\n\nIf you have any questions or concerns about this change, please don''t hesitate to reach out to us.\n\nWe apologize for any inconvenience and look forward to speaking with you at the new scheduled time.\n\nBest regards,\nRecruiter'),

    (NEW.id::text || '_rejection', NEW.id, 'Rejection Letter', 'Sent to rejected candidates', 'Rejection',
     'Application Status Update – {job_title} Position at {company_name}',
     E'Dear {candidate_name},\n\nThank you for your interest in the {job_title} position at {company_name} and for taking the time to go through our selection process.\n\nAfter careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.\n\nWe appreciate your interest in {company_name} and wish you all the best in your job search.\n\nBest regards,\n{your_name}\n{company_name}'),

    (NEW.id::text || '_offer', NEW.id, 'Offer Letter', 'Sent with job offers', 'Offer',
     'Formal Job Offer – {position_title} at {company_name}',
     E'Dear {candidate_name},\n\nWe are delighted to extend a formal job offer for the {position_title} position at {company_name}.\n\nOffer Details:\nPosition: {position_title}\nSalary: {salary}\nStart Date: {start_date}\nExpires: {expires_at}\n\n{benefits}\n\nWe were impressed with your qualifications and believe you will be a valuable addition to our team.\n\nPlease review the offer details and let us know if you have any questions. We look forward to welcoming you to {company_name}!\n\nBest regards,\n{company_name}'),

    (NEW.id::text || '_hired', NEW.id, 'Hired Letter', 'Sent to hired candidates', 'Hired',
     'Welcome to {company_name} – Onboarding Information',
     E'Dear {candidate_name},\n\nOn behalf of everyone at {company_name}, we are thrilled to welcome you to the team!\n\nWe look forward to having you on board and are excited about the contributions you will make.\n\nBest regards,\n{your_name}\n{company_name}')
  ON CONFLICT (id) DO NOTHING;

  -- Create default integrations
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
$$;

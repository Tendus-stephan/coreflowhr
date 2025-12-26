-- Migration: Fix handle_new_user() to handle duplicate signups gracefully
-- This prevents "Database error saving new user" when users try to sign up again

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert profile if it doesn't exist (handle duplicate signups)
  INSERT INTO public.profiles (id, name, email_notifications)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
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
    -- Log error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;



-- Add Reschedule template for existing users who don't have it
-- This template is created automatically for new users in handle_new_user(),
-- but existing users need it added manually

INSERT INTO public.email_templates (id, user_id, title, "desc", type, subject, content)
SELECT 
  id::text || '_reschedule',
  id,
  'Interview Reschedule',
  'Sent when interview is rescheduled',
  'Reschedule',
  'Interview Rescheduled – {job_title} Position at {company_name}',
  'Dear {candidate_name},

We wanted to inform you that your interview for the {job_title} position at {company_name} has been rescheduled.

**Previous Interview Time:**
{previous_interview_time}

**New Interview Time:**
{new_interview_time}

{meeting_link}
{address}

If you have any questions or concerns about this change, please don''t hesitate to reach out to us.

We apologize for any inconvenience and look forward to speaking with you at the new scheduled time.

Best regards,
Recruiter'
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 
  FROM public.email_templates 
  WHERE email_templates.user_id = auth.users.id 
    AND email_templates.type = 'Reschedule'
)
ON CONFLICT (id) DO NOTHING;




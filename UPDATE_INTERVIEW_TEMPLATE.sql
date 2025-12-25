-- Update the default interview email template with a better format
-- This should be run for existing users or added to the schema trigger

UPDATE email_templates
SET 
  subject = 'Interview Invitation – {job_title} Position at {company_name}',
  content = 'Dear {candidate_name},

Thank you for your interest in the {job_title} position at {company_name}. We were impressed with your application and would like to invite you for an interview.

{interview_details}

Please confirm your availability by replying to this email. If you have any questions or need to reschedule, please don''t hesitate to reach out.

We look forward to meeting with you!

Best regards,
{interviewer_name}
{company_name}'
WHERE id = 'interview' AND type = 'Interview';

-- If the template doesn't exist, this will create it for new users via the trigger
-- For existing users, run the UPDATE above














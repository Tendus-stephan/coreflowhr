-- Migration to add Counter Offer email templates for existing users
-- Run this in Supabase SQL Editor for existing users to have the new templates

-- Add Offer Accepted template
INSERT INTO public.email_templates (id, user_id, title, "desc", type, subject, content)
SELECT 
    p.id || '_offer_accepted' as id,
    p.id as user_id,
    'Offer Accepted' as title,
    'Sent when recruiter accepts counter offer' as "desc",
    'Offer Accepted' as type,
    'Counter Offer Accepted – {position_title} at {company_name}' as subject,
    'Dear {candidate_name},

We are pleased to inform you that we have accepted your counter offer for the {position_title} position at {company_name}!

Final Offer Details:
Position: {position_title}
Salary: {salary} ({salary_amount} {salary_currency} {salary_period})
Start Date: {start_date}
Expires: {expires_at}

Benefits:
{benefits_list}

We are excited to move forward with these terms and look forward to welcoming you to {company_name}!

Please confirm your acceptance and we will proceed with the next steps.

Best regards,
{your_name}
{company_name}' as content
FROM public.profiles p
ON CONFLICT (id) DO NOTHING;

-- Add Offer Declined template
INSERT INTO public.email_templates (id, user_id, title, "desc", type, subject, content)
SELECT 
    p.id || '_offer_declined' as id,
    p.id as user_id,
    'Offer Declined' as title,
    'Sent when recruiter declines counter offer' as "desc",
    'Offer Declined' as type,
    'Counter Offer Update – {position_title} at {company_name}' as subject,
    'Dear {candidate_name},

Thank you for your counter offer regarding the {position_title} position at {company_name}.

After careful consideration, we are unable to accept the terms of your counter offer at this time. However, our original offer of {salary} ({salary_amount} {salary_currency} {salary_period}) remains available if you would like to proceed.

We understand this may be disappointing, and we appreciate your interest in joining {company_name}. If you have any questions or would like to discuss further, please don''t hesitate to reach out.

Best regards,
{your_name}
{company_name}' as content
FROM public.profiles p
ON CONFLICT (id) DO NOTHING;

-- Add Counter Offer Response template
INSERT INTO public.email_templates (id, user_id, title, "desc", type, subject, content)
SELECT 
    p.id || '_counter_offer_response' as id,
    p.id as user_id,
    'Counter Offer Response' as title,
    'Sent when recruiter responds with new terms' as "desc",
    'Counter Offer Response' as type,
    'Updated Offer Terms – {position_title} at {company_name}' as subject,
    'Dear {candidate_name},

Thank you for your counter offer. We appreciate your interest in the {position_title} position at {company_name}.

After reviewing your request, we would like to propose the following updated terms:

Updated Offer Details:
Position: {position_title}
Salary: {salary} ({salary_amount} {salary_currency} {salary_period})
Start Date: {start_date}
Expires: {expires_at}

Benefits:
{benefits_list}

{notes}

We hope these terms work for you. Please let us know if you would like to proceed or if you have any further questions.

Best regards,
{your_name}
{company_name}' as content
FROM public.profiles p
ON CONFLICT (id) DO NOTHING;


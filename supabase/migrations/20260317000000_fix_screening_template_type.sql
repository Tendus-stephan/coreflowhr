-- Fix Screening Outreach template type: was incorrectly set to 'Sourcing', should be 'Screening'
-- This allows users to select it when creating Screening stage workflows
UPDATE public.email_templates
SET type = 'Screening',
    "desc" = 'Sent when candidate moves to Screening'
WHERE title = 'Screening Outreach'
  AND type = 'Sourcing';

-- Also fix the create_workflow_after_template trigger function if it exists
CREATE OR REPLACE FUNCTION create_workflow_after_template()
RETURNS TRIGGER AS $$
DECLARE
    workflow_name TEXT;
    trigger_stage TEXT;
BEGIN
    -- Map template types/ids to workflows
    IF NEW.type = 'Screening' OR NEW.id = 'screening' THEN
        workflow_name := 'Send Screening Email';
        trigger_stage := 'Screening';
    ELSIF NEW.type = 'Interview' OR NEW.id = 'interview' THEN
        workflow_name := 'Send Interview Email';
        trigger_stage := 'Interview';
    ELSIF NEW.type = 'Offer' OR NEW.id = 'offer' THEN
        workflow_name := 'Send Offer Email';
        trigger_stage := 'Offer';
    ELSIF NEW.type = 'Rejection' OR NEW.id = 'rejection' THEN
        workflow_name := 'Send Rejection Email';
        trigger_stage := 'Rejected';
    ELSIF NEW.type = 'Hired' OR NEW.id = 'hired' THEN
        workflow_name := 'Send Hired Email';
        trigger_stage := 'Hired';
    ELSE
        RETURN NEW;
    END IF;

    -- Insert workflow if it doesn't already exist for this user+stage
    INSERT INTO public.email_workflows (user_id, name, trigger_stage, template_id, is_active)
    VALUES (NEW.user_id, workflow_name, trigger_stage, NEW.id, false)
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

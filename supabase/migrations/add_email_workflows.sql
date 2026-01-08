-- Create email_workflows table
CREATE TABLE IF NOT EXISTS email_workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Workflow configuration
    name TEXT NOT NULL,
    trigger_stage TEXT CHECK (trigger_stage IN ('New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected')) NOT NULL,
    email_template_id TEXT REFERENCES email_templates(id) ON DELETE CASCADE NOT NULL,
    
    -- Conditions (optional filters)
    min_match_score INTEGER, -- Only trigger if match score >= this
    source_filter TEXT[], -- Only trigger for specific sources
    
    -- Settings
    enabled BOOLEAN DEFAULT true,
    delay_minutes INTEGER DEFAULT 0, -- Delay before sending
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create workflow_executions table (track when workflows ran)
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES email_workflows(id) ON DELETE CASCADE NOT NULL,
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
    email_log_id UUID REFERENCES email_logs(id) ON DELETE SET NULL,
    status TEXT CHECK (status IN ('pending', 'sent', 'failed', 'skipped')) DEFAULT 'pending',
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    error_message TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_workflows_user_id ON email_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_email_workflows_trigger_stage ON email_workflows(trigger_stage);
CREATE INDEX IF NOT EXISTS idx_email_workflows_enabled ON email_workflows(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_candidate_id ON workflow_executions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);

-- Enable RLS
ALTER TABLE email_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_workflows
CREATE POLICY "Users can view their own workflows"
    ON email_workflows FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own workflows"
    ON email_workflows FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workflows"
    ON email_workflows FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workflows"
    ON email_workflows FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for workflow_executions
CREATE POLICY "Users can view executions for their workflows"
    ON workflow_executions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM email_workflows
            WHERE email_workflows.id = workflow_executions.workflow_id
            AND email_workflows.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create executions for their workflows"
    ON workflow_executions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM email_workflows
            WHERE email_workflows.id = workflow_executions.workflow_id
            AND email_workflows.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update executions for their workflows"
    ON workflow_executions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM email_workflows
            WHERE email_workflows.id = workflow_executions.workflow_id
            AND email_workflows.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM email_workflows
            WHERE email_workflows.id = workflow_executions.workflow_id
            AND email_workflows.user_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_email_workflows_updated_at
    BEFORE UPDATE ON email_workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_email_workflows_updated_at();

-- Function to create default workflows for all stages (except New) after email template is created
CREATE OR REPLACE FUNCTION create_workflow_after_template()
RETURNS TRIGGER AS $$
DECLARE
    workflow_name TEXT;
    trigger_stage TEXT;
BEGIN
    -- Map template types/ids to workflows
    IF NEW.type = 'Sourcing' OR NEW.id = 'screening' THEN
        workflow_name := 'Send Screening Email';
        trigger_stage := 'Screening';
    ELSIF NEW.type = 'Interview' OR NEW.id = 'interview' THEN
        workflow_name := 'Send Interview Email';
        trigger_stage := 'Interview';
        -- Note: Interview workflows are created but disabled by default
        -- Interviews are manually scheduled, not automatically triggered
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
        -- Not a template we create workflows for
        RETURN NEW;
    END IF;
    
    -- Check if user already has a workflow for this stage with this exact name
    IF NOT EXISTS (
        SELECT 1 FROM email_workflows
        WHERE user_id = NEW.user_id
        AND trigger_stage = trigger_stage
        AND LOWER(name) = LOWER(workflow_name)
    ) THEN
        INSERT INTO email_workflows (
            user_id,
            name,
            trigger_stage,
            email_template_id,
            enabled,
            delay_minutes
        )
        VALUES (
            NEW.user_id,
            workflow_name,
            trigger_stage,
            NEW.id,
            -- Interview workflows are disabled by default (manually scheduled, not automatic)
            CASE WHEN trigger_stage = 'Interview' THEN false ELSE true END,
            0
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create default workflows when templates are created
CREATE TRIGGER create_default_workflow_after_template
    AFTER INSERT ON email_templates
    FOR EACH ROW
    WHEN (
        NEW.type IN ('Sourcing', 'Interview', 'Offer', 'Rejection', 'Hired') 
        OR NEW.id IN ('screening', 'interview', 'offer', 'rejection', 'hired')
    )
    EXECUTE FUNCTION create_workflow_after_template();



-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE NOT NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Offer details
    position_title TEXT NOT NULL,
    start_date DATE,
    salary_amount DECIMAL(10, 2),
    salary_currency TEXT DEFAULT 'USD',
    salary_period TEXT CHECK (salary_period IN ('hourly', 'monthly', 'yearly')) DEFAULT 'yearly',
    benefits TEXT[], -- Array of benefits
    notes TEXT,
    
    -- Status tracking
    status TEXT CHECK (status IN ('draft', 'sent', 'viewed', 'negotiating', 'accepted', 'declined', 'expired')) DEFAULT 'draft',
    sent_at TIMESTAMP WITH TIME ZONE,
    viewed_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Response details
    response TEXT, -- Candidate's response/notes
    negotiation_history JSONB, -- Track negotiation rounds
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create offer_templates table
CREATE TABLE IF NOT EXISTS offer_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL, -- HTML template with placeholders
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offers_candidate_id ON offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_offers_job_id ON offers(job_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_expires_at ON offers(expires_at);
CREATE INDEX IF NOT EXISTS idx_offers_user_id ON offers(user_id);
CREATE INDEX IF NOT EXISTS idx_offer_templates_user_id ON offer_templates(user_id);

-- RLS Policies for offers
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their offers"
    ON offers FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their offers"
    ON offers FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their offers"
    ON offers FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their offers"
    ON offers FOR DELETE
    USING (user_id = auth.uid());

-- RLS Policies for offer_templates
ALTER TABLE offer_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their offer templates"
    ON offer_templates FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their offer templates"
    ON offer_templates FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their offer templates"
    ON offer_templates FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their offer templates"
    ON offer_templates FOR DELETE
    USING (user_id = auth.uid());

-- Function to update updated_at timestamp for offers
CREATE OR REPLACE FUNCTION update_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at for offers
CREATE TRIGGER update_offers_updated_at
    BEFORE UPDATE ON offers
    FOR EACH ROW
    EXECUTE FUNCTION update_offers_updated_at();

-- Function to update updated_at timestamp for offer_templates
CREATE OR REPLACE FUNCTION update_offer_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at for offer_templates
CREATE TRIGGER update_offer_templates_updated_at
    BEFORE UPDATE ON offer_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_offer_templates_updated_at();





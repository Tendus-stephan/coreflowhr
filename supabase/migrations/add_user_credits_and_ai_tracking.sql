-- Migration: Add user credits table and AI analysis tracking
-- This adds support for purchasing additional credits beyond plan limits
-- and tracks AI analysis usage per user

-- Create user_credits table
CREATE TABLE IF NOT EXISTS public.user_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    credit_type TEXT CHECK (credit_type IN ('candidates', 'jobs', 'ai_analysis')) NOT NULL,
    amount INTEGER DEFAULT 0 NOT NULL CHECK (amount >= 0),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id ON public.user_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_user_credits_type ON public.user_credits(credit_type);
CREATE INDEX IF NOT EXISTS idx_user_credits_expires ON public.user_credits(expires_at);

-- Enable RLS
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own credits
CREATE POLICY "Users can view their own credits"
    ON public.user_credits FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own credits (for purchases)
CREATE POLICY "Users can insert their own credits"
    ON public.user_credits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own credits
CREATE POLICY "Users can update their own credits"
    ON public.user_credits FOR UPDATE
    USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own credits
CREATE POLICY "Users can delete their own credits"
    ON public.user_credits FOR DELETE
    USING (auth.uid() = user_id);

-- Add AI analysis tracking to user_settings
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS ai_analysis_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_analysis_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for AI analysis tracking
CREATE INDEX IF NOT EXISTS idx_user_settings_ai_reset ON public.user_settings(ai_analysis_reset_date);

-- Function to reset AI analysis count monthly
CREATE OR REPLACE FUNCTION reset_ai_analysis_count()
RETURNS void AS $$
BEGIN
    UPDATE public.user_settings
    SET 
        ai_analysis_count = 0,
        ai_analysis_reset_date = NOW()
    WHERE 
        ai_analysis_reset_date < DATE_TRUNC('month', NOW()) - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE public.user_credits IS 'Stores purchased credits for additional usage beyond plan limits';
COMMENT ON COLUMN public.user_credits.credit_type IS 'Type of credit: candidates, jobs, or ai_analysis';
COMMENT ON COLUMN public.user_credits.amount IS 'Number of credits available';
COMMENT ON COLUMN public.user_credits.expires_at IS 'When credits expire (NULL for non-expiring)';

COMMENT ON COLUMN public.user_settings.ai_analysis_count IS 'Number of AI analyses used in current month';
COMMENT ON COLUMN public.user_settings.ai_analysis_reset_date IS 'Date when AI analysis count was last reset (monthly)';

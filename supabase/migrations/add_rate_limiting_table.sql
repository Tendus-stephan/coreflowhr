-- Migration: Add rate limiting table for API endpoints
-- Run this in Supabase SQL Editor

-- Table to track API request rates
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    endpoint TEXT NOT NULL,
    identifier TEXT NOT NULL, -- IP address, user ID, or token
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(endpoint, identifier, window_start)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup 
ON rate_limits(endpoint, identifier, window_start);

-- Index for cleanup (old records)
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start 
ON rate_limits(window_start);

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
    endpoint_param TEXT,
    identifier_param TEXT,
    max_requests_param INTEGER DEFAULT 10,
    window_minutes_param INTEGER DEFAULT 60
)
RETURNS JSON AS $$
DECLARE
    current_window TIMESTAMP WITH TIME ZONE;
    request_count INTEGER;
    result JSON;
BEGIN
    -- Calculate current time window (round down to nearest window)
    current_window := date_trunc('hour', NOW()) + 
        (EXTRACT(MINUTE FROM NOW())::INTEGER / window_minutes_param) * 
        (window_minutes_param || ' minutes')::INTERVAL;
    
    -- Get or create rate limit record
    INSERT INTO rate_limits (endpoint, identifier, window_start, request_count)
    VALUES (endpoint_param, identifier_param, current_window, 1)
    ON CONFLICT (endpoint, identifier, window_start)
    DO UPDATE SET 
        request_count = rate_limits.request_count + 1,
        updated_at = NOW()
    RETURNING rate_limits.request_count INTO request_count;
    
    -- Check if limit exceeded
    IF request_count > max_requests_param THEN
        RETURN json_build_object(
            'allowed', false,
            'remaining', 0,
            'reset_at', current_window + (window_minutes_param || ' minutes')::INTERVAL,
            'message', format('Rate limit exceeded. Maximum %s requests per %s minutes.', max_requests_param, window_minutes_param)
        );
    END IF;
    
    RETURN json_build_object(
        'allowed', true,
        'remaining', GREATEST(0, max_requests_param - request_count),
        'reset_at', current_window + (window_minutes_param || ' minutes')::INTERVAL
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM rate_limits
    WHERE window_start < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits() TO authenticated;

-- Note: Set up a cron job or scheduled task to run cleanup_rate_limits() periodically



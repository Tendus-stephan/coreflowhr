-- Migration: Add atomic offer acceptance/decline functions
-- This ensures offer status and candidate stage updates happen atomically
-- Run this in Supabase SQL Editor

-- Function to atomically accept an offer
CREATE OR REPLACE FUNCTION accept_offer_atomic(offer_token_param TEXT, response_text TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  offer_record RECORD;
  candidate_record RECORD;
  result JSON;
BEGIN
  -- Lock the offer row to prevent concurrent modifications
  SELECT * INTO offer_record
  FROM offers
  WHERE offer_token = offer_token_param
  FOR UPDATE;
  
  -- Check if offer exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired offer link'
    );
  END IF;
  
  -- Check if token is expired
  IF offer_record.offer_token_expires_at IS NOT NULL AND 
     offer_record.offer_token_expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This offer link has expired. Please contact the recruiter.'
    );
  END IF;
  
  -- Check if already responded
  IF offer_record.status IN ('accepted', 'declined') THEN
    RETURN json_build_object(
      'success', false,
      'error', format('This offer has already been %s.', offer_record.status)
    );
  END IF;
  
  -- Update offer status atomically
  UPDATE offers
  SET 
    status = 'accepted',
    responded_at = NOW(),
    response = response_text
  WHERE offer_token = offer_token_param
    AND status NOT IN ('accepted', 'declined') -- Prevent race condition
  RETURNING * INTO offer_record;
  
  -- Check if update succeeded (might have been updated by another request)
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Offer has already been responded to'
    );
  END IF;
  
  -- Move candidate to Hired stage atomically
  IF offer_record.candidate_id IS NOT NULL THEN
    UPDATE candidates
    SET stage = 'Hired'
    WHERE id = offer_record.candidate_id
    RETURNING * INTO candidate_record;
  END IF;
  
  -- Return success with offer data
  RETURN json_build_object(
    'success', true,
    'offer_id', offer_record.id,
    'candidate_id', offer_record.candidate_id,
    'status', offer_record.status
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An error occurred while processing the offer acceptance'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to atomically decline an offer
CREATE OR REPLACE FUNCTION decline_offer_atomic(offer_token_param TEXT, response_text TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  offer_record RECORD;
  candidate_record RECORD;
BEGIN
  -- Lock the offer row to prevent concurrent modifications
  SELECT * INTO offer_record
  FROM offers
  WHERE offer_token = offer_token_param
  FOR UPDATE;
  
  -- Check if offer exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired offer link'
    );
  END IF;
  
  -- Check if token is expired
  IF offer_record.offer_token_expires_at IS NOT NULL AND 
     offer_record.offer_token_expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'This offer link has expired. Please contact the recruiter.'
    );
  END IF;
  
  -- Check if already responded
  IF offer_record.status IN ('accepted', 'declined') THEN
    RETURN json_build_object(
      'success', false,
      'error', format('This offer has already been %s.', offer_record.status)
    );
  END IF;
  
  -- Update offer status atomically
  UPDATE offers
  SET 
    status = 'declined',
    responded_at = NOW(),
    response = response_text
  WHERE offer_token = offer_token_param
    AND status NOT IN ('accepted', 'declined') -- Prevent race condition
  RETURNING * INTO offer_record;
  
  -- Check if update succeeded
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Offer has already been responded to'
    );
  END IF;
  
  -- Move candidate to Rejected stage atomically
  IF offer_record.candidate_id IS NOT NULL THEN
    UPDATE candidates
    SET stage = 'Rejected'
    WHERE id = offer_record.candidate_id
    RETURNING * INTO candidate_record;
  END IF;
  
  -- Return success with offer data
  RETURN json_build_object(
    'success', true,
    'offer_id', offer_record.id,
    'candidate_id', offer_record.candidate_id,
    'status', offer_record.status
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'An error occurred while processing the offer decline'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users (for internal API calls)
-- Note: These functions should be called with service role key for security
GRANT EXECUTE ON FUNCTION accept_offer_atomic(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_offer_atomic(TEXT, TEXT) TO authenticated;

-- Add unique constraint to workflow_executions to prevent duplicate executions
-- This prevents race conditions when multiple workflows try to execute simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_executions_unique 
ON workflow_executions(workflow_id, candidate_id) 
WHERE status = 'sent';

-- Note: This index allows multiple 'pending' or 'failed' executions but only one 'sent' execution
-- per workflow-candidate combination, preventing duplicate emails


-- Migration: Add atomic candidate stage update function
-- This ensures stage update and workflow execution are properly coordinated
-- Run this in Supabase SQL Editor

-- Function to atomically update candidate stage
CREATE OR REPLACE FUNCTION update_candidate_stage_atomic(
    candidate_id_param UUID,
    new_stage_param TEXT,
    user_id_param UUID
)
RETURNS JSON AS $$
DECLARE
    candidate_record RECORD;
    old_stage TEXT;
    result JSON;
BEGIN
    -- Lock the candidate row to prevent concurrent modifications
    SELECT * INTO candidate_record
    FROM candidates
    WHERE id = candidate_id_param
      AND user_id = user_id_param
    FOR UPDATE;
    
    -- Check if candidate exists
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Candidate not found or access denied'
        );
    END IF;
    
    -- Get old stage
    old_stage := candidate_record.stage;
    
    -- Validate stage transition (basic validation)
    -- Note: More complex validation can be added here
    IF new_stage_param NOT IN ('New', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected') THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Invalid stage'
        );
    END IF;
    
    -- Update candidate stage atomically
    UPDATE candidates
    SET stage = new_stage_param,
        updated_at = NOW()
    WHERE id = candidate_id_param
      AND user_id = user_id_param
    RETURNING * INTO candidate_record;
    
    -- Check if update succeeded
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to update candidate stage'
        );
    END IF;
    
    -- Return success with candidate data
    RETURN json_build_object(
        'success', true,
        'candidate_id', candidate_record.id,
        'old_stage', old_stage,
        'new_stage', candidate_record.stage,
        'stage_changed', old_stage != new_stage_param
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'An error occurred while updating candidate stage'
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION update_candidate_stage_atomic(UUID, TEXT, UUID) TO authenticated;



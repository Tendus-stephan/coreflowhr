-- Add atomic offer acceptance/decline RPCs (required for Accept/Decline on public offer link)
-- SECURITY DEFINER so the function runs with definer rights and can update offers/candidates by token

CREATE OR REPLACE FUNCTION public.accept_offer_atomic(offer_token_param TEXT, response_text TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  offer_record RECORD;
  candidate_record RECORD;
BEGIN
  SELECT * INTO offer_record
  FROM offers
  WHERE offer_token = offer_token_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired offer link');
  END IF;

  IF offer_record.offer_token_expires_at IS NOT NULL AND offer_record.offer_token_expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'This offer link has expired. Please contact the recruiter.');
  END IF;

  IF offer_record.status IN ('accepted', 'declined') THEN
    RETURN json_build_object('success', false, 'error', format('This offer has already been %s.', offer_record.status));
  END IF;

  UPDATE offers
  SET status = 'accepted', responded_at = NOW(), response = response_text
  WHERE offer_token = offer_token_param AND status NOT IN ('accepted', 'declined')
  RETURNING * INTO offer_record;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Offer has already been responded to');
  END IF;

  IF offer_record.candidate_id IS NOT NULL THEN
    UPDATE candidates SET stage = 'Hired' WHERE id = offer_record.candidate_id RETURNING * INTO candidate_record;
  END IF;

  RETURN json_build_object('success', true, 'offer_id', offer_record.id, 'candidate_id', offer_record.candidate_id, 'status', offer_record.status);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'An error occurred while processing the offer acceptance');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decline_offer_atomic(offer_token_param TEXT, response_text TEXT DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  offer_record RECORD;
  candidate_record RECORD;
BEGIN
  SELECT * INTO offer_record
  FROM offers
  WHERE offer_token = offer_token_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid or expired offer link');
  END IF;

  IF offer_record.offer_token_expires_at IS NOT NULL AND offer_record.offer_token_expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'This offer link has expired. Please contact the recruiter.');
  END IF;

  IF offer_record.status IN ('accepted', 'declined') THEN
    RETURN json_build_object('success', false, 'error', format('This offer has already been %s.', offer_record.status));
  END IF;

  UPDATE offers
  SET status = 'declined', responded_at = NOW(), response = response_text
  WHERE offer_token = offer_token_param AND status NOT IN ('accepted', 'declined')
  RETURNING * INTO offer_record;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Offer has already been responded to');
  END IF;

  IF offer_record.candidate_id IS NOT NULL THEN
    UPDATE candidates SET stage = 'Rejected' WHERE id = offer_record.candidate_id RETURNING * INTO candidate_record;
  END IF;

  RETURN json_build_object('success', true, 'offer_id', offer_record.id, 'candidate_id', offer_record.candidate_id, 'status', offer_record.status);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'An error occurred while processing the offer decline');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow both authenticated (app) and anon (public offer link) to call these
GRANT EXECUTE ON FUNCTION public.accept_offer_atomic(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_offer_atomic(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.decline_offer_atomic(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_offer_atomic(TEXT, TEXT) TO anon;

-- 5) Source quality: candidates in range by source; counts who reached Interview, Offer, Hired; hire rate %; sorted by hire rate desc.
CREATE OR REPLACE FUNCTION public.report_source_quality(
  p_date_from TIMESTAMPTZ,
  p_date_to TIMESTAMPTZ,
  p_job_ids UUID[] DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  WITH candidates_in_range AS (
    SELECT c.id, c.source
    FROM public.candidates c
    WHERE c.created_at >= p_date_from AND c.created_at <= p_date_to
      AND (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids))
      AND c.source IS NOT NULL AND c.source <> ''
  ),
  by_source AS (
    SELECT
      cr.source,
      COUNT(DISTINCT cr.id) AS total,
      COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM public.candidate_stage_history h WHERE h.candidate_id = cr.id AND h.to_stage = 'Interview') THEN cr.id END) AS interview_count,
      COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM public.candidate_stage_history h WHERE h.candidate_id = cr.id AND h.to_stage = 'Offer') THEN cr.id END) AS offer_count,
      COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM public.candidate_stage_history h WHERE h.candidate_id = cr.id AND h.to_stage = 'Hired') THEN cr.id END) AS hired_count
    FROM candidates_in_range cr
    GROUP BY cr.source
  ),
  with_hire_rate AS (
    SELECT
      source,
      total,
      interview_count,
      offer_count,
      hired_count,
      CASE WHEN total > 0 THEN ROUND((hired_count::NUMERIC / total * 100), 1) ELSE 0 END AS hire_rate_pct
    FROM by_source
  )
  SELECT COALESCE(
    jsonb_agg(row ORDER BY (row->>'hire_rate_pct')::NUMERIC DESC NULLS LAST, (row->>'total')::INT DESC),
    '[]'::JSONB
  ) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'source', source,
      'total', total,
      'interview_count', interview_count,
      'offer_count', offer_count,
      'hired_count', hired_count,
      'hire_rate_pct', hire_rate_pct
    ) AS row
    FROM with_hire_rate
  ) t;

  RETURN jsonb_build_object('rows', COALESCE(v_result, '[]'::JSONB));
END;
$$;

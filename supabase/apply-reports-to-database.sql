-- Run this in Supabase Dashboard → SQL Editor to create report functions (and stage history if missing).
-- Fixes: "Could not find the function public.report_offer_acceptance(...) in the schema cache"

-- 1) Stage history table + trigger (skip if you already ran this migration)
CREATE TABLE IF NOT EXISTS public.candidate_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_candidate_stage_history_candidate_id ON public.candidate_stage_history(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_stage_history_changed_at ON public.candidate_stage_history(changed_at);
CREATE INDEX IF NOT EXISTS idx_candidate_stage_history_to_stage ON public.candidate_stage_history(to_stage);

CREATE OR REPLACE FUNCTION public.track_candidate_stage_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    INSERT INTO public.candidate_stage_history (candidate_id, from_stage, to_stage, changed_at)
    VALUES (NEW.id, OLD.stage, NEW.stage, timezone('utc', now()));
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS after_candidate_stage_change ON public.candidates;
CREATE TRIGGER after_candidate_stage_change AFTER UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.track_candidate_stage_change();

ALTER TABLE public.candidate_stage_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view stage history for visible candidates" ON public.candidate_stage_history;
CREATE POLICY "Users can view stage history for visible candidates" ON public.candidate_stage_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.candidates C
    JOIN public.jobs J ON J.id = C.job_id
    WHERE C.id = candidate_stage_history.candidate_id
      AND ( C.user_id = auth.uid() OR J.hiring_manager_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.job_assignments ja WHERE ja.job_id = J.id AND ja.user_id = auth.uid())
        OR ( J.workspace_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = J.workspace_id AND wm.user_id = auth.uid() AND wm.role IN ('Admin', 'Recruiter'))
        ))
  )
);

-- 2) Report functions (all five)
CREATE OR REPLACE FUNCTION public.report_time_to_hire(p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ, p_job_ids UUID[] DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg_days NUMERIC;
  v_prev_avg_days NUMERIC;
  v_trend_pct NUMERIC;
  v_weekly JSONB;
  v_period_days INT;
  v_prev_from TIMESTAMPTZ;
  v_prev_to TIMESTAMPTZ;
BEGIN
  v_period_days := GREATEST(1, (EXTRACT(EPOCH FROM (p_date_to - p_date_from)) / 86400)::INT);
  v_prev_to := p_date_from;
  v_prev_from := p_date_from - (v_period_days || ' days')::INTERVAL;

  v_avg_days := (
    SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (hired_at - created_at)) / 86400)::NUMERIC, 1), 0)
    FROM (
      SELECT c.id, c.created_at,
        COALESCE(
          (SELECT MIN(h.changed_at) FROM public.candidate_stage_history h WHERE h.candidate_id = c.id AND h.to_stage = 'Hired' AND h.changed_at >= p_date_from AND h.changed_at <= p_date_to),
          CASE WHEN c.stage = 'Hired' AND c.updated_at >= p_date_from AND c.updated_at <= p_date_to THEN c.updated_at END
        ) AS hired_at
      FROM public.candidates c
      WHERE (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids))
        AND (
          EXISTS (SELECT 1 FROM public.candidate_stage_history h WHERE h.candidate_id = c.id AND h.to_stage = 'Hired' AND h.changed_at >= p_date_from AND h.changed_at <= p_date_to)
          OR (c.stage = 'Hired' AND c.updated_at >= p_date_from AND c.updated_at <= p_date_to)
        )
    ) hired_in_range
    WHERE hired_at IS NOT NULL
  );
  v_avg_days := COALESCE(v_avg_days, 0);

  v_prev_avg_days := (
    SELECT COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (hired_at - created_at)) / 86400)::NUMERIC, 1), 0)
    FROM (
      SELECT c.id, c.created_at,
        COALESCE(
          (SELECT MIN(h.changed_at) FROM public.candidate_stage_history h WHERE h.candidate_id = c.id AND h.to_stage = 'Hired' AND h.changed_at >= v_prev_from AND h.changed_at < v_prev_to),
          CASE WHEN c.stage = 'Hired' AND c.updated_at >= v_prev_from AND c.updated_at < v_prev_to THEN c.updated_at END
        ) AS hired_at
      FROM public.candidates c
      WHERE (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids))
        AND (
          EXISTS (SELECT 1 FROM public.candidate_stage_history h WHERE h.candidate_id = c.id AND h.to_stage = 'Hired' AND h.changed_at >= v_prev_from AND h.changed_at < v_prev_to)
          OR (c.stage = 'Hired' AND c.updated_at >= v_prev_from AND c.updated_at < v_prev_to)
        )
    ) hired_prev
    WHERE hired_at IS NOT NULL
  );
  v_prev_avg_days := COALESCE(v_prev_avg_days, 0);
  v_trend_pct := CASE WHEN v_prev_avg_days > 0 THEN ROUND(((v_prev_avg_days - v_avg_days) / v_prev_avg_days * 100)::NUMERIC, 1) ELSE 0 END;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('week', week_start::TEXT, 'avg_days', avg_days) ORDER BY week_start), '[]'::JSONB)
  INTO v_weekly
  FROM (
    SELECT week_start, ROUND(AVG(days)::NUMERIC, 1) AS avg_days
    FROM (
      SELECT
        date_trunc('week', COALESCE(
          (SELECT MIN(h.changed_at) FROM public.candidate_stage_history h WHERE h.candidate_id = c.id AND h.to_stage = 'Hired' AND h.changed_at >= p_date_from AND h.changed_at <= p_date_to),
          CASE WHEN c.stage = 'Hired' AND c.updated_at >= p_date_from AND c.updated_at <= p_date_to THEN c.updated_at END
        ))::DATE AS week_start,
        EXTRACT(EPOCH FROM (COALESCE(
          (SELECT MIN(h.changed_at) FROM public.candidate_stage_history h WHERE h.candidate_id = c.id AND h.to_stage = 'Hired' AND h.changed_at >= p_date_from AND h.changed_at <= p_date_to),
          CASE WHEN c.stage = 'Hired' AND c.updated_at >= p_date_from AND c.updated_at <= p_date_to THEN c.updated_at END
        ) - c.created_at) / 86400) AS days
      FROM public.candidates c
      WHERE (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids))
        AND (
          EXISTS (SELECT 1 FROM public.candidate_stage_history h WHERE h.candidate_id = c.id AND h.to_stage = 'Hired' AND h.changed_at >= p_date_from AND h.changed_at <= p_date_to)
          OR (c.stage = 'Hired' AND c.updated_at >= p_date_from AND c.updated_at <= p_date_to)
        )
    ) hired_with_days
    WHERE week_start IS NOT NULL
    GROUP BY week_start
  ) by_week;

  RETURN jsonb_build_object('avg_days', v_avg_days, 'trend_pct', v_trend_pct, 'weekly_series', COALESCE(v_weekly, '[]'::JSONB));
END; $$;

CREATE OR REPLACE FUNCTION public.report_pipeline_conversion(p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ, p_job_ids UUID[] DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_screening INT; v_interview INT; v_offer INT; v_hired INT; v_c2i_pct NUMERIC; v_i2o_pct NUMERIC; v_o2h_pct NUMERIC;
BEGIN
  SELECT COUNT(DISTINCT h.candidate_id) INTO v_screening FROM public.candidate_stage_history h JOIN public.candidates c ON c.id = h.candidate_id WHERE h.to_stage = 'Screening' AND h.changed_at >= p_date_from AND h.changed_at <= p_date_to AND (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids));
  SELECT COUNT(DISTINCT h.candidate_id) INTO v_interview FROM public.candidate_stage_history h JOIN public.candidates c ON c.id = h.candidate_id WHERE h.to_stage = 'Interview' AND h.changed_at >= p_date_from AND h.changed_at <= p_date_to AND (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids));
  SELECT COUNT(DISTINCT h.candidate_id) INTO v_offer FROM public.candidate_stage_history h JOIN public.candidates c ON c.id = h.candidate_id WHERE h.to_stage = 'Offer' AND h.changed_at >= p_date_from AND h.changed_at <= p_date_to AND (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids));
  SELECT COUNT(DISTINCT h.candidate_id) INTO v_hired FROM public.candidate_stage_history h JOIN public.candidates c ON c.id = h.candidate_id WHERE h.to_stage = 'Hired' AND h.changed_at >= p_date_from AND h.changed_at <= p_date_to AND (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids));
  v_c2i_pct := CASE WHEN v_screening > 0 THEN ROUND((v_interview::NUMERIC / v_screening * 100), 1) ELSE 0 END;
  v_i2o_pct := CASE WHEN v_interview > 0 THEN ROUND((v_offer::NUMERIC / v_interview * 100), 1) ELSE 0 END;
  v_o2h_pct := CASE WHEN v_offer > 0 THEN ROUND((v_hired::NUMERIC / v_offer * 100), 1) ELSE 0 END;
  RETURN jsonb_build_object('screening_count', v_screening, 'interview_count', v_interview, 'offer_count', v_offer, 'hired_count', v_hired, 'conversion_screening_to_interview_pct', v_c2i_pct, 'conversion_interview_to_offer_pct', v_i2o_pct, 'conversion_offer_to_hired_pct', v_o2h_pct);
END; $$;

CREATE OR REPLACE FUNCTION public.report_offer_acceptance(p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ, p_job_ids UUID[] DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_sent INT; v_viewed INT; v_accepted INT; v_declined INT; v_negotiating INT; v_denom INT; v_rate_pct NUMERIC; v_prev_accepted INT; v_prev_denom INT; v_prev_rate_pct NUMERIC; v_trend_pct NUMERIC; v_period_days INT; v_prev_from TIMESTAMPTZ; v_prev_to TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) FILTER (WHERE status = 'sent'), COUNT(*) FILTER (WHERE status = 'viewed'), COUNT(*) FILTER (WHERE status = 'accepted'), COUNT(*) FILTER (WHERE status = 'declined'), COUNT(*) FILTER (WHERE status = 'negotiating')
  INTO v_sent, v_viewed, v_accepted, v_declined, v_negotiating FROM public.offers WHERE created_at >= p_date_from AND created_at <= p_date_to AND (p_job_ids IS NULL OR job_id = ANY(p_job_ids));
  v_denom := v_sent + v_viewed + v_accepted + v_declined + v_negotiating;
  v_rate_pct := CASE WHEN v_denom > 0 THEN ROUND((v_accepted::NUMERIC / v_denom * 100), 1) ELSE 0 END;
  v_period_days := GREATEST(1, (EXTRACT(EPOCH FROM (p_date_to - p_date_from)) / 86400)::INT); v_prev_to := p_date_from; v_prev_from := p_date_from - (v_period_days || ' days')::INTERVAL;
  SELECT COUNT(*) FILTER (WHERE status = 'accepted'), COUNT(*) FILTER (WHERE status IN ('sent','viewed','accepted','declined','negotiating')) INTO v_prev_accepted, v_prev_denom FROM public.offers WHERE created_at >= v_prev_from AND created_at < v_prev_to AND (p_job_ids IS NULL OR job_id = ANY(p_job_ids));
  v_prev_rate_pct := CASE WHEN v_prev_denom > 0 THEN ROUND((v_prev_accepted::NUMERIC / v_prev_denom * 100), 1) ELSE 0 END;
  v_trend_pct := ROUND((v_rate_pct - v_prev_rate_pct)::NUMERIC, 1);
  RETURN jsonb_build_object('acceptance_rate_pct', v_rate_pct, 'trend_pct', v_trend_pct, 'counts', jsonb_build_object('sent', v_sent, 'viewed', v_viewed, 'accepted', v_accepted, 'declined', v_declined, 'negotiating', v_negotiating));
END; $$;

CREATE OR REPLACE FUNCTION public.report_interview_offer_ratio(p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ, p_job_ids UUID[] DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_interview_count INT; v_offer_count INT; v_ratio NUMERIC; v_prev_interview_count INT; v_prev_offer_count INT; v_prev_ratio NUMERIC; v_trend_pct NUMERIC; v_period_days INT; v_prev_from TIMESTAMPTZ; v_prev_to TIMESTAMPTZ;
BEGIN
  SELECT COUNT(*) INTO v_interview_count FROM public.interviews i JOIN public.candidates c ON c.id = i.candidate_id WHERE i.date >= (p_date_from)::DATE AND i.date <= (p_date_to)::DATE AND (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids));
  SELECT COUNT(*) INTO v_offer_count FROM public.offers WHERE created_at >= p_date_from AND created_at <= p_date_to AND (p_job_ids IS NULL OR job_id = ANY(p_job_ids));
  v_ratio := CASE WHEN v_offer_count > 0 THEN ROUND((v_interview_count::NUMERIC / v_offer_count), 1) ELSE 0 END;
  v_period_days := GREATEST(1, (EXTRACT(EPOCH FROM (p_date_to - p_date_from)) / 86400)::INT); v_prev_to := p_date_from; v_prev_from := p_date_from - (v_period_days || ' days')::INTERVAL;
  SELECT COUNT(*) INTO v_prev_interview_count FROM public.interviews i JOIN public.candidates c ON c.id = i.candidate_id WHERE i.date >= (v_prev_from)::DATE AND i.date < (v_prev_to)::DATE AND (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids));
  SELECT COUNT(*) INTO v_prev_offer_count FROM public.offers WHERE created_at >= v_prev_from AND created_at < v_prev_to AND (p_job_ids IS NULL OR job_id = ANY(p_job_ids));
  v_prev_ratio := CASE WHEN v_prev_offer_count > 0 THEN ROUND((v_prev_interview_count::NUMERIC / v_prev_offer_count), 1) ELSE 0 END;
  v_trend_pct := CASE WHEN v_prev_ratio > 0 THEN ROUND(((v_ratio - v_prev_ratio) / v_prev_ratio * 100)::NUMERIC, 1) ELSE 0 END;
  RETURN jsonb_build_object('interview_count', v_interview_count, 'offer_count', v_offer_count, 'ratio', v_ratio, 'trend_pct', v_trend_pct);
END; $$;

CREATE OR REPLACE FUNCTION public.report_source_quality(p_date_from TIMESTAMPTZ, p_date_to TIMESTAMPTZ, p_job_ids UUID[] DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result JSONB;
BEGIN
  WITH candidates_in_range AS (
    SELECT c.id, c.source FROM public.candidates c
    WHERE c.created_at >= p_date_from AND c.created_at <= p_date_to AND (p_job_ids IS NULL OR c.job_id = ANY(p_job_ids)) AND c.source IS NOT NULL AND c.source <> ''
  ),
  by_source AS (
    SELECT cr.source, COUNT(DISTINCT cr.id) AS total,
      COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM public.candidate_stage_history h WHERE h.candidate_id = cr.id AND h.to_stage = 'Interview') THEN cr.id END) AS interview_count,
      COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM public.candidate_stage_history h WHERE h.candidate_id = cr.id AND h.to_stage = 'Offer') THEN cr.id END) AS offer_count,
      COUNT(DISTINCT CASE WHEN EXISTS (SELECT 1 FROM public.candidate_stage_history h WHERE h.candidate_id = cr.id AND h.to_stage = 'Hired') THEN cr.id END) AS hired_count
    FROM candidates_in_range cr GROUP BY cr.source
  ),
  with_hire_rate AS (SELECT source, total, interview_count, offer_count, hired_count, CASE WHEN total > 0 THEN ROUND((hired_count::NUMERIC / total * 100), 1) ELSE 0 END AS hire_rate_pct FROM by_source)
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'hire_rate_pct')::NUMERIC DESC NULLS LAST, (row->>'total')::INT DESC), '[]'::JSONB) INTO v_result
  FROM (SELECT jsonb_build_object('source', source, 'total', total, 'interview_count', interview_count, 'offer_count', offer_count, 'hired_count', hired_count, 'hire_rate_pct', hire_rate_pct) AS row FROM with_hire_rate) t;
  RETURN jsonb_build_object('rows', COALESCE(v_result, '[]'::JSONB));
END; $$;

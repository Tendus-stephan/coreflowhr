-- supabase/migrations/20260510120000_add_scheduling_links.sql

CREATE TABLE IF NOT EXISTS public.scheduling_links (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token                TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(24), 'hex'),
  workspace_id         UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  candidate_id         UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  job_id               UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  interview_type       TEXT NOT NULL DEFAULT 'Video Call',  -- 'Video Call' | 'Phone Screen' | 'In-Person'
  duration_minutes     INTEGER NOT NULL DEFAULT 30,
  date_range_start     DATE NOT NULL,
  date_range_end       DATE NOT NULL,
  available_hours_start TIME NOT NULL DEFAULT '09:00',
  available_hours_end   TIME NOT NULL DEFAULT '17:00',
  buffer_minutes       INTEGER NOT NULL DEFAULT 0,
  message              TEXT,
  status               TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'booked', 'expired')),
  booked_at            TIMESTAMPTZ,
  booked_slot          TIMESTAMPTZ,       -- UTC datetime of the chosen slot
  booked_by_name       TEXT,
  booked_by_email      TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduling_links_candidate ON public.scheduling_links(candidate_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_links_workspace  ON public.scheduling_links(workspace_id);
CREATE INDEX IF NOT EXISTS idx_scheduling_links_token      ON public.scheduling_links(token);

-- RLS
ALTER TABLE public.scheduling_links ENABLE ROW LEVEL SECURITY;

-- Workspace members can create and read their workspace's links
CREATE POLICY "workspace members manage scheduling links"
  ON public.scheduling_links FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Public read by token (candidate page — unauthenticated)
CREATE POLICY "public read scheduling link by token"
  ON public.scheduling_links FOR SELECT
  USING (true);   -- token is the secret; row is unguessable

-- SECURITY DEFINER RPC so the edge function can update status without auth
CREATE OR REPLACE FUNCTION public.book_scheduling_slot(
  p_token          TEXT,
  p_booked_slot    TIMESTAMPTZ,
  p_name           TEXT,
  p_email          TEXT
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  link_rec RECORD;
BEGIN
  SELECT * INTO link_rec FROM public.scheduling_links
  WHERE token = p_token FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Link not found');
  END IF;

  IF link_rec.status <> 'active' THEN
    RETURN json_build_object('success', false, 'error', 'Link already booked or expired');
  END IF;

  -- Check slot is still within date range
  IF p_booked_slot::DATE < link_rec.date_range_start OR p_booked_slot::DATE > link_rec.date_range_end THEN
    RETURN json_build_object('success', false, 'error', 'Slot outside available range');
  END IF;

  UPDATE public.scheduling_links
  SET status = 'booked', booked_at = NOW(),
      booked_slot = p_booked_slot, booked_by_name = p_name, booked_by_email = p_email
  WHERE token = p_token;

  RETURN json_build_object('success', true,
    'candidate_id', link_rec.candidate_id,
    'job_id', link_rec.job_id,
    'created_by', link_rec.created_by,
    'workspace_id', link_rec.workspace_id,
    'interview_type', link_rec.interview_type,
    'duration_minutes', link_rec.duration_minutes,
    'message', link_rec.message
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_scheduling_slot(TEXT, TIMESTAMPTZ, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.book_scheduling_slot(TEXT, TIMESTAMPTZ, TEXT, TEXT) TO authenticated;

-- Offer reference number, workspace sequence + logo, profiles.job_title
-- 1) offers.reference_number, workspaces.offer_sequence_counter
-- 2) workspaces.company_logo_url
-- 3) profiles.job_title if missing

-- Offers: reference number (nullable; generated on insert when workspace_id set)
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS reference_number TEXT;

-- Workspaces: sequence for per-workspace reference numbers; logo URL
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS offer_sequence_counter INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.workspaces
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT;

-- Profiles: job title for recruiter closing (optional)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title TEXT;

-- Function: generate next reference for a workspace (format CF-YYYY-NNNNN). Call within transaction.
CREATE OR REPLACE FUNCTION public.generate_offer_reference(p_workspace_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n INTEGER;
BEGIN
  UPDATE public.workspaces
  SET offer_sequence_counter = offer_sequence_counter + 1
  WHERE id = p_workspace_id
  RETURNING offer_sequence_counter INTO n;
  IF n IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN 'CF-' || to_char(now() AT TIME ZONE 'UTC', 'YYYY') || '-' || lpad(n::text, 5, '0');
END;
$$;

-- Trigger function: set reference_number on insert when workspace_id is set (fallback: leave null on error)
CREATE OR REPLACE FUNCTION public.set_offer_reference_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.workspace_id IS NOT NULL AND (NEW.reference_number IS NULL OR NEW.reference_number = '') THEN
    BEGIN
      NEW.reference_number := public.generate_offer_reference(NEW.workspace_id);
    EXCEPTION WHEN OTHERS THEN
      NEW.reference_number := NULL;
    END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_offer_reference_trigger ON public.offers;
CREATE TRIGGER set_offer_reference_trigger
  BEFORE INSERT ON public.offers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_offer_reference_on_insert();

COMMENT ON COLUMN public.offers.reference_number IS 'Generated on create (e.g. CF-2026-00142). Null if generation failed.';
COMMENT ON COLUMN public.workspaces.offer_sequence_counter IS 'Incremented per new offer in this workspace for reference numbers.';
COMMENT ON COLUMN public.workspaces.company_logo_url IS 'Public URL of workspace logo in storage (company-assets bucket).';

-- Backfill workspace_id on interviews that were inserted without it.
-- The ScheduleInterviewModal was calling supabase.insert() directly
-- and never stamped workspace_id, so those rows have workspace_id = NULL.
-- Match via the interview creator's workspace membership.

UPDATE public.interviews i
SET workspace_id = wm.workspace_id
FROM public.workspace_members wm
WHERE wm.user_id = i.user_id
  AND i.workspace_id IS NULL;

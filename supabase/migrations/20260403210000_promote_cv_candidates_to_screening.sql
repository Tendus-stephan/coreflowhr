-- Promote all existing candidates who have a CV file but are still in
-- Waitlist ('New') stage to Screening.
-- Rule: CV present = Screening, no CV = Waitlist.
-- This is a one-time backfill; new imports are handled in application code.

UPDATE candidates
SET stage = 'Screening'
WHERE stage = 'New'
  AND cv_file_url IS NOT NULL
  AND cv_file_url <> '';

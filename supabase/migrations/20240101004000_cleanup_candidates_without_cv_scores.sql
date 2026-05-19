-- Clean up AI match scores for candidates who don't have CVs uploaded
-- This ensures that only candidates with uploaded CVs have AI match scores
-- Newly sourced candidates should not have scores until they upload their CV

UPDATE candidates
SET ai_match_score = NULL
WHERE cv_file_url IS NULL 
  AND ai_match_score IS NOT NULL;

-- Optional: Also clean up AI analysis for candidates without CVs if needed
-- UPDATE candidates
-- SET ai_analysis = NULL
-- WHERE cv_file_url IS NULL 
--   AND ai_analysis IS NOT NULL;





ALTER TABLE candidates DROP CONSTRAINT IF EXISTS candidates_source_check;
ALTER TABLE candidates
ADD CONSTRAINT candidates_source_check
CHECK (source IN (
  'ai_sourced', 'direct_application', 'email_application',
  'referral', 'scraped', 'linkedin_extension'
));

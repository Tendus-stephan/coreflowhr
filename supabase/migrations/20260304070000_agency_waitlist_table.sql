-- Migration 7: Agency waitlist table
CREATE TABLE IF NOT EXISTS agency_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agency_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow public insert (anyone can join waitlist)
CREATE POLICY "Anyone can join agency waitlist" ON agency_waitlist
  FOR INSERT WITH CHECK (TRUE);

-- Only service role can read
CREATE POLICY "Service role reads waitlist" ON agency_waitlist
  FOR SELECT USING (FALSE);

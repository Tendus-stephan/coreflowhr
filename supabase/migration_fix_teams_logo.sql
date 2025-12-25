-- Migration to fix Microsoft Teams logo URL for existing users
-- Run this in Supabase SQL Editor to update existing integration records

UPDATE integrations
SET logo = '/assets/images/teams-logo.png'
WHERE id = 'teams';

-- Verify the update
SELECT id, name, logo 
FROM integrations 
WHERE id = 'teams';


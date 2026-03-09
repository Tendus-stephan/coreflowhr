-- Migration: Add provider tracking to sourcing_jobs table
ALTER TABLE sourcing_jobs
  ADD COLUMN IF NOT EXISTS sourcing_provider TEXT DEFAULT 'pdl';

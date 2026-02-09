-- Migration: Update jobs constraint to allow 'atlas' and 'scout'
-- Ref: jobs_job_type_check violation for 'atlas'

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_job_type_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_job_type_check CHECK (job_type IN ('chaos', 'strike', 'replay', 'scout', 'atlas'));

COMMENT ON COLUMN jobs.job_type IS 'Type of agent to run: chaos, strike, replay, scout, or atlas';

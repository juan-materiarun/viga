-- 1. FIX SCHEMA: Add missing columns for Chaos Agent
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS selector TEXT;
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS screenshot_start_url TEXT;
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS screenshot_end_url TEXT;

-- 2. FIX RLS: Enable Public Read Access (for Dashboard visibility)
ALTER TABLE test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_journeys ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Public Read Access" ON test_logs;
DROP POLICY IF EXISTS "Public Read Access" ON test_steps;
DROP POLICY IF EXISTS "Public Read Access" ON test_suites;
DROP POLICY IF EXISTS "Public Read Access" ON test_journeys;
DROP POLICY IF EXISTS "Enable read for everyone" ON test_logs;
DROP POLICY IF EXISTS "Enable read for everyone" ON test_steps;

-- Create permissive policies
CREATE POLICY "Public Read Access" ON test_logs FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON test_steps FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON test_suites FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON test_journeys FOR SELECT USING (true);

-- Allow UPDATE on test_steps (for LocatorEditor)
DROP POLICY IF EXISTS "Public Update Access" ON test_steps;
CREATE POLICY "Public Update Access" ON test_steps FOR UPDATE USING (true);

-- Allow INSERT for authenticated/anon if needed (optional, safer to restrict to service role usually, but enabling for now to be safe)
CREATE POLICY "Public Insert Access" ON test_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Insert Access" ON test_steps FOR INSERT WITH CHECK (true);

-- Enable RLS (idempotent)
ALTER TABLE test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_journeys ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Public Read Access" ON test_logs;
DROP POLICY IF EXISTS "Public Read Access" ON test_steps;
DROP POLICY IF EXISTS "Public Read Access" ON test_suites;
DROP POLICY IF EXISTS "Public Read Access" ON test_journeys;
DROP POLICY IF EXISTS "Enable read for everyone" ON test_logs;
DROP POLICY IF EXISTS "Enable read for everyone" ON test_steps;

-- Create permissive policies for SELECT
CREATE POLICY "Public Read Access" ON test_logs FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON test_steps FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON test_suites FOR SELECT USING (true);
CREATE POLICY "Public Read Access" ON test_journeys FOR SELECT USING (true);

-- Allow UPDATE on test_steps (for LocatorEditor)
CREATE POLICY "Public Update Access" ON test_steps FOR UPDATE USING (true);

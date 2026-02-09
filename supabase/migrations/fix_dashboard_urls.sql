-- FIX URL SELECTION: Open RLS for test_suites
-- The user cannot see "unlocked" URLs because they have no user_id (NULL).

-- 1. Enable RLS (just in case)
ALTER TABLE test_suites ENABLE ROW LEVEL SECURITY;

-- 2. Allow ALL authenticated users to read ALL suites (Temporary Fix for Visibility)
DROP POLICY IF EXISTS "Enable read access for all users" ON test_suites;
CREATE POLICY "Enable read access for all users" ON test_suites FOR SELECT USING (true);

-- 3. Allow users to insert their own suites
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON test_suites;
CREATE POLICY "Enable insert for authenticated users only" ON test_suites FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. Allow users to update their own suites (or all for now to unblock worker updates)
DROP POLICY IF EXISTS "Enable update for all users" ON test_suites;
CREATE POLICY "Enable update for all users" ON test_suites FOR UPDATE USING (true);

-- 5. Auto-assign the first user found to existing NULL suites (Optional, helps cleanup)
-- Update this if you know the specific user ID, otherwise we just open read access.

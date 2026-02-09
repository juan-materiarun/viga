-- FIX PROFILES RLS: Ensure users can see their own profile
-- This solves the "PGRST116" error in the Dashboard.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 1. View Profile
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

-- 2. Update Profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 3. Billing/Service Access (Optional, usually handled by Service Role)
-- Service role always bypasses RLS, so no verification policy needed for backend.

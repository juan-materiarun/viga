-- FIX TEST STEPS: Add missing 'step_number' column
-- The worker crashes because it tries to insert 'step_number', but the table doesn't have it.

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS test_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    title TEXT,
    status TEXT DEFAULT 'pending',
    result TEXT,
    error TEXT,
    screenshot_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add 'step_number' column safely
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_steps' AND column_name = 'step_number') THEN 
        ALTER TABLE test_steps ADD COLUMN step_number INTEGER DEFAULT 0; 
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_steps' AND column_name = 'expected_result') THEN 
        ALTER TABLE test_steps ADD COLUMN expected_result TEXT; 
    END IF;
END $$;

-- 3. Basic RLS
ALTER TABLE test_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON test_steps;
CREATE POLICY "Enable read access for all users" ON test_steps FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON test_steps;
CREATE POLICY "Enable insert for all users" ON test_steps FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON test_steps;
CREATE POLICY "Enable update for all users" ON test_steps FOR UPDATE USING (true);

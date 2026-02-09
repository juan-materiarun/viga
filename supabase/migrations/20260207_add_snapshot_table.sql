CREATE TABLE IF NOT EXISTS discovered_elements_snapshot (
    suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    state_hash TEXT NOT NULL,
    action_id UUID REFERENCES ui_actions(id) ON DELETE CASCADE,
    selector TEXT NOT NULL,
    canonical_name TEXT,
    was_executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (suite_id, state_hash, action_id)
);

-- Enable RLS (optional, good practice)
ALTER TABLE discovered_elements_snapshot ENABLE ROW LEVEL SECURITY;

-- Allow worker full access (assuming service role or authenticated user)
-- Drop policy if it exists to allow re-running this script safely
DROP POLICY IF EXISTS "Allow all for authenticated" ON discovered_elements_snapshot;

CREATE POLICY "Allow all for authenticated" ON discovered_elements_snapshot
    FOR ALL
    USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

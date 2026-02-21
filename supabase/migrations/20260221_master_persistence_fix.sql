-- MASTER PERSISTENCE FIX: Consolidating all missing columns for VIGA Worker
-- This migration ensures that the database matches the worker's expectations for reasoning, tracking, and stability.

-- 1. JOBS TABLE: Add worker tracking
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS worker_id TEXT;

-- 2. TEST STEPS TABLE: Add columns for advanced reasoning and tracking
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS observation TEXT;
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS action_id UUID;
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS validation_result JSONB;
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS xpath TEXT;
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS action_payload TEXT;

-- 2.1 UI ACTIONS: Strong Semantic Persistence
ALTER TABLE ui_actions ADD COLUMN IF NOT EXISTS semantic_type TEXT;
ALTER TABLE ui_actions ADD COLUMN IF NOT EXISTS confidence_score FLOAT DEFAULT 0;
ALTER TABLE ui_actions ADD COLUMN IF NOT EXISTS last_page_type TEXT;
ALTER TABLE ui_actions ADD COLUMN IF NOT EXISTS last_purpose TEXT;
ALTER TABLE ui_actions ADD COLUMN IF NOT EXISTS locked_by_suite UUID;

-- 3. ENSURE INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_test_steps_action_id ON test_steps(action_id);
CREATE INDEX IF NOT EXISTS idx_test_steps_suite_id_order ON test_steps(suite_id, created_at);

-- 4. DISCOVERED ELEMENTS SNAPSHOT (Memory Table for Agent)
CREATE TABLE IF NOT EXISTS discovered_elements_snapshot (
    suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    state_hash TEXT NOT NULL,
    action_id UUID, -- Not necessarily a foreign key if ui_actions is being refactored
    selector TEXT NOT NULL,
    canonical_name TEXT,
    was_executed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (suite_id, state_hash, action_id)
);

-- RLS for discovered_elements_snapshot
ALTER TABLE discovered_elements_snapshot ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Full Access" ON discovered_elements_snapshot;
CREATE POLICY "Public Full Access" ON discovered_elements_snapshot FOR ALL USING (true) WITH CHECK (true);

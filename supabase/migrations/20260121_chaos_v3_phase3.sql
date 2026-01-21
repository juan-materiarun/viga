-- Migration: Chaos v3 Phase 3 - Discovered Elements & Multi-State
-- Enables persistent tracking of discovered elements and multi-state exploration

-- 1. Create discovered_elements_snapshot table
-- This table stores a read-only "map" of what the agent sees in each state
CREATE TABLE IF NOT EXISTS discovered_elements_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
  action_id UUID REFERENCES ui_actions(id) ON DELETE SET NULL,
  state_hash TEXT NOT NULL,
  selector TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  was_executed BOOLEAN DEFAULT false,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint to avoid duplicate rows for same scan/action
  UNIQUE(suite_id, state_hash, action_id)
);

CREATE INDEX IF NOT EXISTS idx_discovered_elements_suite ON discovered_elements_snapshot(suite_id);
CREATE INDEX IF NOT EXISTS idx_discovered_elements_state ON discovered_elements_snapshot(state_hash);

-- 2. Enable RLS
ALTER TABLE discovered_elements_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to discovered_elements" ON discovered_elements_snapshot
  FOR ALL USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE discovered_elements_snapshot IS 'Read-only snapshot of UI elements discovered by Chaos Agent per state.';

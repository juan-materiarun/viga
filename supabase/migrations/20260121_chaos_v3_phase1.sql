-- Migration: Chaos v3 Phase 1 - Action Categories & Global State
-- This enables experimental v3 features while maintaining v2 compatibility

-- 1. Add action_category to ui_actions
ALTER TABLE ui_actions ADD COLUMN IF NOT EXISTS action_category TEXT DEFAULT 'STANDARD';

-- Create enum-like constraint
ALTER TABLE ui_actions ADD CONSTRAINT action_category_check 
  CHECK (action_category IN ('STANDARD', 'GLOBAL_STATE', 'NAVIGATION', 'FORM_SUBMIT'));

-- 2. Create global_state_snapshot table
CREATE TABLE IF NOT EXISTS global_state_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
  state_key TEXT NOT NULL, -- 'theme', 'language', 'sidebar_collapsed'
  state_value TEXT NOT NULL, -- 'dark', 'es', 'true'
  action_id UUID REFERENCES ui_actions(id) ON DELETE SET NULL,
  set_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_global_state_suite ON global_state_snapshot(suite_id);
CREATE INDEX IF NOT EXISTS idx_global_state_key ON global_state_snapshot(state_key);

-- 3. Add narrative fields to test_suites
ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS narrative TEXT;
ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS objective TEXT;

-- 4. Enable RLS
ALTER TABLE global_state_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to global_state_snapshot" ON global_state_snapshot
  FOR ALL USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE global_state_snapshot IS 'Tracks global UI state changes (theme, language) for v3 multi-state exploration.';
COMMENT ON COLUMN ui_actions.action_category IS 'Action type: STANDARD (normal), GLOBAL_STATE (reversible theme/lang), NAVIGATION, FORM_SUBMIT.';

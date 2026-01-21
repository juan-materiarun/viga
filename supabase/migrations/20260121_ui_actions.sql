-- Migration: Create ui_actions table for persistent semantic action catalog
-- Run this in Supabase SQL Editor

-- 1. Create the ui_actions table
CREATE TABLE IF NOT EXISTS ui_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Semantic Identity (Core Fingerprint)
  fingerprint TEXT UNIQUE NOT NULL,
  
  -- Semantic Properties
  role TEXT,
  aria_label TEXT,
  aria_pressed TEXT,
  input_type TEXT,
  tag TEXT NOT NULL,
  
  -- Context
  url_pattern TEXT NOT NULL,
  container_context TEXT DEFAULT 'main',
  
  -- Human-Readable
  canonical_name TEXT NOT NULL,
  
  -- Selector Fallbacks (Array of selectors)
  selectors JSONB DEFAULT '[]'::jsonb,
  
  -- Lifecycle
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  execution_count INT DEFAULT 0,
  
  -- Behavior Signature (optional, for advanced matching)
  dom_delta_signature TEXT
);

-- 2. Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_ui_actions_fingerprint ON ui_actions(fingerprint);
CREATE INDEX IF NOT EXISTS idx_ui_actions_url_pattern ON ui_actions(url_pattern);
CREATE INDEX IF NOT EXISTS idx_ui_actions_role ON ui_actions(role);

-- 3. Create a table to track which actions have been executed in which states
-- This prevents re-execution of the same action in the same DOM state
CREATE TABLE IF NOT EXISTS action_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES ui_actions(id) ON DELETE CASCADE,
  state_hash TEXT NOT NULL,
  step_id UUID REFERENCES test_steps(id) ON DELETE SET NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate executions in same state within same suite
  UNIQUE(suite_id, action_id, state_hash)
);

CREATE INDEX IF NOT EXISTS idx_action_executions_suite ON action_executions(suite_id);
CREATE INDEX IF NOT EXISTS idx_action_executions_action ON action_executions(action_id);

-- 4. Enable RLS (Row Level Security) - optional but recommended
ALTER TABLE ui_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_executions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role has full access to ui_actions" ON ui_actions
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to action_executions" ON action_executions
  FOR ALL USING (true) WITH CHECK (true);

-- 5. Add comment for documentation
COMMENT ON TABLE ui_actions IS 'Persistent catalog of semantic UI actions discovered across all test runs. Actions are identified by fingerprint (hash of semantic properties) and reused across executions.';
COMMENT ON TABLE action_executions IS 'Tracks which actions have been executed in which DOM states to prevent loops and enable cumulative learning.';

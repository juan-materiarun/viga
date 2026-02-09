-- FIX V3 FULL: Complete Schema for Atlas Agent
-- Creates ALL dependencies in correct order.
-- Safe to run even if some tables exist.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. BASE TABLES (Dependencies)
-- ==========================================

-- UI Locators (from V4 Foundation)
CREATE TABLE IF NOT EXISTS ui_locators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID, 
    fingerprint TEXT NOT NULL,
    name TEXT,
    description TEXT,
    selectors JSONB,
    status TEXT DEFAULT 'new',
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    screenshot_url TEXT,
    
    UNIQUE(project_id, fingerprint) -- Note: If project_id is NULL, uniqueness is per-row
);

CREATE INDEX IF NOT EXISTS idx_locators_fingerprint ON ui_locators(fingerprint);
ALTER TABLE ui_locators ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role has full access to ui_locators" ON ui_locators;
CREATE POLICY "Service role has full access to ui_locators" ON ui_locators FOR ALL USING (true) WITH CHECK (true);

-- UI Actions (from UI Actions migration)
CREATE TABLE IF NOT EXISTS ui_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT UNIQUE NOT NULL,
  role TEXT,
  aria_label TEXT,
  aria_pressed TEXT,
  input_type TEXT,
  tag TEXT NOT NULL,
  url_pattern TEXT NOT NULL,
  container_context TEXT DEFAULT 'main',
  canonical_name TEXT NOT NULL,
  selectors JSONB DEFAULT '[]'::jsonb,
  first_seen_at TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  execution_count INT DEFAULT 0,
  dom_delta_signature TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_ui_actions_fingerprint ON ui_actions(fingerprint);
ALTER TABLE ui_actions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role has full access to ui_actions" ON ui_actions;
CREATE POLICY "Service role has full access to ui_actions" ON ui_actions FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 2. ATLAS AGENT TABLES
-- ==========================================

-- Test Journeys (Atlas Version)
CREATE TABLE IF NOT EXISTS test_journeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    intent TEXT,
    status TEXT DEFAULT 'proposed',
    is_happy_path BOOLEAN DEFAULT true,
    is_edge_case BOOLEAN DEFAULT false,
    risk_score INTEGER DEFAULT 0,
    step_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Test Case Steps (Atlas Version)
CREATE TABLE IF NOT EXISTS test_case_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL REFERENCES test_journeys(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    intent TEXT NOT NULL,
    action_type TEXT NOT NULL,
    payload TEXT,
    locator_id UUID REFERENCES ui_locators(id),
    original_action_id UUID REFERENCES ui_actions(id),
    expected_observation TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(journey_id, step_order)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_journeys_suite ON test_journeys(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_case_steps_journey ON test_case_steps(journey_id);

-- RLS
ALTER TABLE test_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_steps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to test_journeys" ON test_journeys;
DROP POLICY IF EXISTS "Service role has full access to test_case_steps" ON test_case_steps;

CREATE POLICY "Service role has full access to test_journeys" ON test_journeys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role has full access to test_case_steps" ON test_case_steps FOR ALL USING (true) WITH CHECK (true);

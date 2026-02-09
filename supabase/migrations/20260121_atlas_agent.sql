-- Migration: ATLAS Agent - Post-Exploration Synthesis Tables
-- Stores journeys and test cases derived from Chaos exploration graphs

-- 1. Test Journeys (High-level synthesized paths)
CREATE TABLE IF NOT EXISTS test_journeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suite_id UUID NOT NULL REFERENCES test_suites(id) ON DELETE CASCADE,
    
    -- Metadata
    name TEXT NOT NULL, -- "User Login Flow"
    intent TEXT, -- "Verify that a user can log in with valid credentials"
    status TEXT DEFAULT 'proposed', -- 'proposed', 'approved', 'rejected'
    
    -- Analysis
    is_happy_path BOOLEAN DEFAULT true,
    is_edge_case BOOLEAN DEFAULT false,
    risk_score INTEGER DEFAULT 0, -- 0-100
    
    -- Stats
    step_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Test Case Steps (Ordered steps for a journey)
CREATE TABLE IF NOT EXISTS test_case_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL REFERENCES test_journeys(id) ON DELETE CASCADE,
    
    step_order INTEGER NOT NULL,
    
    -- Action Details
    intent TEXT NOT NULL, -- "Enter email address"
    action_type TEXT NOT NULL, -- "click", "fill", "navigate"
    payload TEXT, -- "user@example.com"
    
    -- References
    locator_id UUID REFERENCES ui_locators(id),
    original_action_id UUID REFERENCES ui_actions(id),
    
    -- Expected Outcome
    expected_observation TEXT, -- "Dashboard should be visible"
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(journey_id, step_order)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_test_journeys_suite ON test_journeys(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_case_steps_journey ON test_case_steps(journey_id);

-- RLS
ALTER TABLE test_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to test_journeys" ON test_journeys
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to test_case_steps" ON test_case_steps
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE test_journeys IS 'Synthesized user journeys discovered by Atlas from Chaos exploration graphs.';
COMMENT ON TABLE test_case_steps IS 'Sequential steps for a specific test journey, mapped to reusable locators.';

-- FIX V2: Safe creation of Atlas Agent tables
-- Handles case where tables or policies already exist

-- 1. Test Journeys
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

-- 2. Test Case Steps
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

-- Indexes (Safe)
CREATE INDEX IF NOT EXISTS idx_test_journeys_suite ON test_journeys(suite_id);
CREATE INDEX IF NOT EXISTS idx_test_case_steps_journey ON test_case_steps(journey_id);

-- RLS
ALTER TABLE test_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_case_steps ENABLE ROW LEVEL SECURITY;

-- Policies (Drop first to avoid 'already exists' error)
DROP POLICY IF EXISTS "Service role has full access to test_journeys" ON test_journeys;
DROP POLICY IF EXISTS "Service role has full access to test_case_steps" ON test_case_steps;

CREATE POLICY "Service role has full access to test_journeys" ON test_journeys
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access to test_case_steps" ON test_case_steps
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE test_journeys IS 'Synthesized user journeys discovered by Atlas from Chaos exploration graphs.';
COMMENT ON TABLE test_case_steps IS 'Sequential steps for a specific test journey.';

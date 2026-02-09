-- Migration to add journey_id to test_steps
ALTER TABLE test_steps ADD COLUMN IF NOT EXISTS journey_id UUID REFERENCES test_journeys(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_test_steps_journey ON test_steps(journey_id);

-- VIGA Production Performance Indexes
-- Optimizes realtime queries and journey lookups

-- Speed up Execution Room realtime queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_steps_suite_created 
    ON test_steps(suite_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_logs_suite_timestamp 
    ON test_logs(suite_id, timestamp DESC);

-- Speed up journey graph lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journey_states_suite_hash 
    ON journey_states(suite_id, state_hash);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ui_actions_fingerprint 
    ON ui_actions(fingerprint);

-- Speed up suite status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_status_created 
    ON test_suites(status, created_at DESC);

-- Speed up job queue queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_test_suites_status_updated 
    ON test_suites(status, updated_at DESC)
    WHERE status IN ('pending', 'running');

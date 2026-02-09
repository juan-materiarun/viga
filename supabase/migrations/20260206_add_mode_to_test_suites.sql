-- Add mode column to test_suites to support agent types (chaos, strike, atlas)
ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'chaos';

-- Add comment
COMMENT ON COLUMN test_suites.mode IS 'Agent mode: chaos, strike, or atlas';

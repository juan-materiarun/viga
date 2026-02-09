-- Add generated_code to test_suites
ALTER TABLE test_suites ADD COLUMN IF NOT EXISTS generated_code text;

-- Add comment
COMMENT ON COLUMN test_suites.generated_code IS 'Auto-generated Playwright test script based on this run';

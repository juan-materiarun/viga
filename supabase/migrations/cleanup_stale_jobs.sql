UPDATE test_suites 
SET status = 'failed', 
    updated_at = NOW() 
WHERE status = 'running';

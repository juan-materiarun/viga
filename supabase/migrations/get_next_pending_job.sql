-- Create a function to safely claim the next pending job
-- This uses FOR UPDATE SKIP LOCKED to allow multiple workers to poll concurrently without race conditions
CREATE OR REPLACE FUNCTION get_next_pending_job()
RETURNS SETOF jobs AS $$
DECLARE
    claimed_job jobs%ROWTYPE;
BEGIN
    UPDATE jobs
    SET status = 'running',
        started_at = NOW(),
        updated_at = NOW()
    WHERE id = (
        SELECT id
        FROM jobs
        WHERE status = 'pending'
        ORDER BY created_at ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
    )
    RETURNING * INTO claimed_job;

    RETURN NEXT claimed_job;
END;
$$ LANGUAGE plpgsql;

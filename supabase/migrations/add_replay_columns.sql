-- Add columns for Execution Replay (Start/End Screenshots)

DO $$ 
BEGIN 
    -- 1. Snapshot BEFORE action (The state before we messed it up)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_steps' AND column_name = 'screenshot_start_url') THEN 
        ALTER TABLE test_steps ADD COLUMN screenshot_start_url TEXT; 
    END IF;

    -- 2. Snapshot AFTER action (The result / The Chaos)
    -- We already have 'screenshot_url', we can treat it as the "result" or "end", 
    -- but adding an explicit 'screenshot_end_url' aliased to it or separate might be cleaner.
    -- For now, let's keep 'screenshot_url' as the primary result, and 'screenshot_end_url' as an explicit alias if needed,
    -- but to avoid confusion, let's just add 'screenshot_end_url' and eventually migrate 'screenshot_url' usage or keep both.
    -- DECISION: Let's use 'screenshot_end_url' for the replay specific flow to be explicit.
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'test_steps' AND column_name = 'screenshot_end_url') THEN 
        ALTER TABLE test_steps ADD COLUMN screenshot_end_url TEXT; 
    END IF;

END $$;

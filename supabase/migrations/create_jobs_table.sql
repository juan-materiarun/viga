-- Create jobs table for worker queue
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  job_type TEXT NOT NULL CHECK (job_type IN ('chaos', 'strike', 'replay')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  url TEXT NOT NULL,
  goal TEXT, -- for strike jobs
  credentials JSONB, -- for chaos/replay jobs
  steps JSONB, -- for replay jobs
  progress JSONB, -- current execution progress
  result JSONB, -- final result
  error TEXT, -- error message if failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON jobs(created_at);
CREATE INDEX IF NOT EXISTS idx_jobs_suite_id ON jobs(suite_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs(user_id);

-- Add RLS policies (if needed)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything
CREATE POLICY "Service role can manage all jobs" ON jobs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own jobs
CREATE POLICY "Users can view own jobs" ON jobs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE jobs IS 'Job queue for VIGA worker - stores pending/running/completed automation tasks';
COMMENT ON COLUMN jobs.job_type IS 'Type of agent to run: chaos, strike, or replay';
COMMENT ON COLUMN jobs.status IS 'Current job status: pending, running, completed, or failed';
COMMENT ON COLUMN jobs.progress IS 'Real-time progress updates from worker';
COMMENT ON COLUMN jobs.result IS 'Final execution result';

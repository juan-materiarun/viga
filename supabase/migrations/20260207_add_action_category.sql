ALTER TABLE ui_actions
ADD COLUMN IF NOT EXISTS action_category TEXT DEFAULT 'STANDARD';

-- Optional: Create an index on this new column for faster filtering
CREATE INDEX IF NOT EXISTS idx_ui_actions_category ON ui_actions(action_category);

-- Migration: Add metadata column to ui_actions
-- This stores semantic intent and other inferred properies

ALTER TABLE ui_actions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN ui_actions.metadata IS 'Additional semantic metadata like intent (DOWNLOAD, SUBMIT, etc.) and other inferred properties.';

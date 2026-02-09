-- VIGA V4 Foundation Migration
-- "Locators as First-Class Objects" & "Visual Branching"

-- 1. UI Locators (The Assets)
-- Replaces/Augments 'ui_actions', but designed for persistence and editing.
CREATE TABLE IF NOT EXISTS ui_locators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID, -- References projects(id) removed for simplified deployment
    fingerprint TEXT NOT NULL, -- Semantic hash (stable)
    name TEXT, -- Editable human name (e.g. "Login Button")
    description TEXT, -- AI generated description
    selectors JSONB, -- { "css": "...", "xpath": "...", "ai": "..." }
    status TEXT DEFAULT 'new', -- new, verified, broken, ignored
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    screenshot_url TEXT,
    
    UNIQUE(project_id, fingerprint)
);

-- 2. App States (The Map)
CREATE TABLE IF NOT EXISTS app_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID, -- References projects(id) removed for simplified deployment
    state_hash TEXT NOT NULL,
    url TEXT,
    title TEXT,
    screenshot_url TEXT,
    description TEXT, -- AI Analysis of the screen
    node_metadata JSONB, -- Entropy info, element counts
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(project_id, state_hash)
);

-- 3. Test Journeys (The Flows)
CREATE TABLE IF NOT EXISTS test_journeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID, -- References projects(id) removed for simplified deployment
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft', -- draft, active, archived
    layer TEXT DEFAULT 'exploratory', -- exploratory, regression, core
    is_deterministic BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Journey Steps (The Graph Edges)
CREATE TABLE IF NOT EXISTS journey_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID REFERENCES test_journeys(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    
    -- The interaction
    locator_id UUID REFERENCES ui_locators(id),
    action_type TEXT NOT NULL, -- click, type, hover, assert
    payload TEXT, -- "user@example.com"
    
    -- Expectations
    expected_state_id UUID REFERENCES app_states(id), -- Expected destination
    assertions JSONB, -- { "text_contains": "Welcome" }
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_locators_fingerprint ON ui_locators(fingerprint);
CREATE INDEX IF NOT EXISTS idx_journey_steps_journey ON journey_steps(journey_id);

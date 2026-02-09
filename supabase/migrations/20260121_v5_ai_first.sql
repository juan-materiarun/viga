-- VIGA V5: AI-First Architecture
-- Semantic Application Models + Journey Graphs

-- 1. Application Models (Persistent Semantic Understanding)
CREATE TABLE IF NOT EXISTS app_models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    app_type TEXT NOT NULL, -- 'dashboard', 'marketing', 'saas', 'editor', 'ecommerce'
    domain TEXT, -- 'analytics', 'content_management', 'crm', etc.
    entities JSONB, -- ["projects", "users", "reports"]
    input_expectations JSONB, -- {"email": "email", "password": "password", "url": "url"}
    semantic_summary TEXT, -- LLM-generated description
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(suite_id)
);

-- 2. Journey States (Screen Snapshots)
CREATE TABLE IF NOT EXISTS journey_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    state_hash TEXT NOT NULL, -- Semantic hash (URL pattern + key elements)
    semantic_description TEXT, -- LLM: "Login screen with email/password fields"
    screen_type TEXT, -- 'form', 'dashboard', 'list', 'detail', 'modal'
    key_elements JSONB, -- Semantic elements present
    screenshot_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(suite_id, state_hash)
);

-- 3. Journey Transitions (State Graph Edges)
CREATE TABLE IF NOT EXISTS journey_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    from_state_id UUID REFERENCES journey_states(id) ON DELETE CASCADE,
    to_state_id UUID REFERENCES journey_states(id) ON DELETE CASCADE,
    action_id UUID REFERENCES ui_actions(id) ON DELETE SET NULL,
    action_intent TEXT, -- LLM: "Submit login form"
    effect_description TEXT, -- LLM: "Navigated to dashboard"
    was_explored BOOLEAN DEFAULT false,
    exploration_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(suite_id, from_state_id, action_id)
);

-- 4. Semantic Actions (Replaces fuzzy matching)
CREATE TABLE IF NOT EXISTS semantic_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
    semantic_id TEXT NOT NULL, -- Hash of (intent + screen_context + element_role)
    intent TEXT NOT NULL, -- LLM: "Submit login credentials"
    screen_context TEXT, -- "login_screen"
    element_role TEXT, -- "submit_button"
    canonical_name TEXT, -- LLM-generated: "Submit Login Form"
    locator_id UUID REFERENCES ui_locators(id),
    payload_template JSONB, -- For inputs: {"type": "email", "example": "user@test.com"}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(suite_id, semantic_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journey_states_suite ON journey_states(suite_id);
CREATE INDEX IF NOT EXISTS idx_journey_transitions_suite ON journey_transitions(suite_id);
CREATE INDEX IF NOT EXISTS idx_journey_transitions_unexplored ON journey_transitions(suite_id, was_explored) WHERE was_explored = false;
CREATE INDEX IF NOT EXISTS idx_semantic_actions_suite ON semantic_actions(suite_id, semantic_id);

-- VIGA: Sistema de Memoria para Exploración Inteligente
-- Permite al agente recordar tareas pendientes y no olvidar funciones por explorar

-- Cola de Exploración (Tareas Pendientes)
CREATE TABLE IF NOT EXISTS exploration_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  action_intent TEXT NOT NULL,
  element_selector TEXT,
  element_index INTEGER,
  parent_url TEXT, -- De dónde venimos (para volver)
  depth INTEGER DEFAULT 0, -- Profundidad en el árbol de exploración
  priority INTEGER DEFAULT 5, -- 10=alta, 5=media, 1=baja
  discovered_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'skipped')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Memoria de Exploración (Ya Completado)
CREATE TABLE IF NOT EXISTS exploration_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suite_id UUID REFERENCES test_suites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  action_taken TEXT NOT NULL,
  element_description TEXT,
  result TEXT NOT NULL, -- 'success', 'failed', 'no_change'
  screenshot_url TEXT,
  new_elements_discovered INTEGER DEFAULT 0,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_exploration_queue_suite ON exploration_queue(suite_id, status, priority DESC);
CREATE INDEX IF NOT EXISTS idx_exploration_memory_suite ON exploration_memory(suite_id, url);

-- Función helper: Obtener siguiente tarea
CREATE OR REPLACE FUNCTION get_next_exploration_task(p_suite_id UUID)
RETURNS TABLE (
  task_id UUID,
  url TEXT,
  action_intent TEXT,
  element_selector TEXT,
  element_index INTEGER,
  parent_url TEXT,
  priority INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    exploration_queue.url,
    action_intent,
    element_selector,
    element_index,
    parent_url,
    exploration_queue.priority
  FROM exploration_queue
  WHERE suite_id = p_suite_id
    AND status = 'pending'
    AND attempts < 3
  ORDER BY priority DESC, discovered_at ASC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE exploration_queue IS 'Cola de tareas pendientes para exploración sistemática (BFS)';
COMMENT ON TABLE exploration_memory IS 'Registro de acciones completadas y sus resultados';

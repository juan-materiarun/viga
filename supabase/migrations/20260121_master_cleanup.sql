-- 🧹 MASTER CLEANUP SCRIPT (V5 CONSOLIDATED)
-- Ejecuta esto en SQL Editor para dejar la base 0km pero compatible con el "Premium Exploration Agent"

-------------------------------------------------------------------------
-- 1. ELIMINAR TABLAS BASURA (Nunca se usan, fueron tests o duplicados)
-------------------------------------------------------------------------
DROP TABLE IF EXISTS semantic_actions CASCADE;
DROP TABLE IF EXISTS app_states CASCADE;       -- Duplicado de journey_states
DROP TABLE IF EXISTS test_journeys CASCADE;    -- Nunca implementado
DROP TABLE IF EXISTS journey_steps CASCADE;    -- Nunca implementado
DROP TABLE IF EXISTS agent_logs CASCADE;       -- Usamos test_logs ahora
DROP TABLE IF EXISTS discovered_elements_snapshot CASCADE; -- Viejo V3 snapshot
DROP TABLE IF EXISTS global_state_snapshot CASCADE;        -- Viejo V3 snapshot

-------------------------------------------------------------------------
-- 2. RESETEAR DATOS (TRUNCATE) - Deja la estructura, borra el historial
-- ¡CUIDADO! Esto borra todos los tests pasados y locators aprendidos.
-------------------------------------------------------------------------

-- Core Execution Data
TRUNCATE TABLE test_logs CASCADE;
TRUNCATE TABLE test_steps CASCADE;
TRUNCATE TABLE test_suites CASCADE;
TRUNCATE TABLE jobs CASCADE;

-- Exploration Intelligence (Graph & Models)
TRUNCATE TABLE journey_transitions CASCADE;
TRUNCATE TABLE journey_states CASCADE;
TRUNCATE TABLE app_models CASCADE;

-- Learned Assets
TRUNCATE TABLE ui_locators CASCADE;
TRUNCATE TABLE ui_actions CASCADE;
TRUNCATE TABLE action_executions CASCADE;

-- Optional: Reset Profiles (Users)
-- TRUNCATE TABLE profiles CASCADE; -- Descomentar si querés borrar usuarios

-------------------------------------------------------------------------
-- ESTADO FINAL:
-- Solo quedan las tablas que el worker REALMENTE usa:
-- 1. test_suites, test_steps, test_logs, jobs (Ejecución)
-- 2. journey_states, journey_transitions (Grafo de Exploración)
-- 3. ui_locators, ui_actions (Conocimiento acumulado)
-- 4. app_models (Entendimiento de la app)
-------------------------------------------------------------------------

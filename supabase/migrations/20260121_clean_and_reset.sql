-- 🧹 VIGA MASTER RESET (VERSIÓN SEGURA)

-- 1. LIMPIEZA DE ESTRUCTURA VIEJA (Solo si existen)
DROP TABLE IF EXISTS semantic_actions CASCADE;
DROP TABLE IF EXISTS app_states CASCADE;
DROP TABLE IF EXISTS test_journeys CASCADE;
DROP TABLE IF EXISTS journey_steps CASCADE;
DROP TABLE IF EXISTS agent_logs CASCADE;
DROP TABLE IF EXISTS discovered_elements_snapshot CASCADE;
DROP TABLE IF EXISTS global_state_snapshot CASCADE;

-- 2. RESET DE DATOS (Solo borra el contenido de las tablas que SI existen)
DO $$ 
BEGIN
    -- Lista de tablas a vaciar (si existen)
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'test_logs') THEN TRUNCATE TABLE test_logs CASCADE; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'test_steps') THEN TRUNCATE TABLE test_steps CASCADE; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'test_suites') THEN TRUNCATE TABLE test_suites CASCADE; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'jobs') THEN TRUNCATE TABLE jobs CASCADE; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'journey_transitions') THEN TRUNCATE TABLE journey_transitions CASCADE; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'journey_states') THEN TRUNCATE TABLE journey_states CASCADE; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'app_models') THEN TRUNCATE TABLE app_models CASCADE; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ui_locators') THEN TRUNCATE TABLE ui_locators CASCADE; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ui_actions') THEN TRUNCATE TABLE ui_actions CASCADE; END IF;
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'action_executions') THEN TRUNCATE TABLE action_executions CASCADE; END IF;
END $$;
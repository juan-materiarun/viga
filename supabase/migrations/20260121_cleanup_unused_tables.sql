-- VIGA: Database Cleanup
-- Elimina tablas redundantes/no usadas

-- V5 tables (no usadas porque Chaos V5 no está en producción)
DROP TABLE IF EXISTS semantic_actions CASCADE;
DROP TABLE IF EXISTS journey_steps CASCADE;
DROP TABLE IF EXISTS test_journeys CASCADE;

-- V4 duplicate (app_states duplica journey_states)
DROP TABLE IF EXISTS app_states CASCADE;

-- Comentario: Mantenemos journey_states/journey_transitions/app_models
-- porque Chaos V5 las usa, pero el usuario puede eliminarlas si no va a usar V5

-- Si decides NO usar Chaos V5, también elimina estas:
-- DROP TABLE IF EXISTS journey_transitions CASCADE;
-- DROP TABLE IF EXISTS journey_states CASCADE;
-- DROP TABLE IF EXISTS app_models CASCADE;

-- ============================================================================
-- VELITO INTERACTIVE — Fix check constraint game_type (snake_case)
-- À exécuter sur le projet velito-hub.
-- ============================================================================
-- POURQUOI :
--   Le constraint initial n'acceptait que : quiz, blindtest, petitbac, geo.
--   Le code TypeScript utilise des conventions snake_case : petit_bac, blind_test.
--   Du coup les INSERT échouent quand on lance Petit Bac depuis la galerie.
--
-- FIX :
--   On drop l'ancien check, on recrée avec les noms snake_case.
--   Aucune donnée n'est perdue (juste le constraint).
-- ============================================================================

BEGIN;

-- Drop l'ancien constraint (le nom est généré par Postgres : sessions_game_type_check)
ALTER TABLE interactive.sessions
  DROP CONSTRAINT IF EXISTS sessions_game_type_check;

-- Recrée avec les valeurs snake_case + autres futurs jeux
ALTER TABLE interactive.sessions
  ADD CONSTRAINT sessions_game_type_check
  CHECK (game_type IN (
    'quiz',
    'petit_bac',
    'blind_test',
    'geo',
    'estim',
    'reflex',
    'loup_garou',
    'undercover'
  ));

COMMIT;

-- Vérification
SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'interactive'
  AND rel.relname = 'sessions'
  AND con.conname = 'sessions_game_type_check';

SELECT 'game_type check snake_case OK — petit_bac et blind_test acceptés' AS status;

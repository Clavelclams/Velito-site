-- ============================================================================
-- VELITO INTERACTIVE — Ajoute 'draw' au CHECK constraint game_type
-- À exécuter sur Supabase prod (projet velito-hub)
-- ============================================================================
-- POURQUOI :
--   Le constraint actuel n'accepte pas 'draw' → INSERT échoue silencieusement
--   quand on clique sur la card Dessin → l'utilisateur retombe sur
--   dashboard?error=session_create.
--
-- FIX :
--   Drop l'ancien constraint, recrée avec 'draw' inclus.
-- ============================================================================

BEGIN;

ALTER TABLE interactive.sessions
  DROP CONSTRAINT IF EXISTS sessions_game_type_check;

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
    'draw',
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

SELECT 'game_type check OK — draw accepté' AS status;

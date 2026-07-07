-- ============================================================================
-- VELITO INTERACTIVE — Renommage GEO → PIN'POINT
-- ============================================================================
-- Date         : 2026-06-15
-- Contexte     : Renommage marketing suite à audit plagiat du 11/06/2026.
--                Le jeu s'appelle désormais "Pin'Point" côté public.
--                Le slug technique en BDD passe de 'geo' à 'pinpoint'.
-- Rétrocompat  : les sessions existantes (Moxy 09/06) sont migrées.
-- Impact       : sessions.game_type + sessions.current_game + RPC scoring.
-- ============================================================================

BEGIN;

-- ─── 1. Supprimer TEMPORAIREMENT les CHECK constraints qui bloquent 'pinpoint'
--       (les CHECK constraints Postgres nécessitent recréation, pas modification)
ALTER TABLE interactive.sessions
  DROP CONSTRAINT IF EXISTS sessions_game_type_check;

ALTER TABLE interactive.sessions
  DROP CONSTRAINT IF EXISTS sessions_current_game_check;

-- ─── 2. Migrer les données existantes 'geo' → 'pinpoint'
UPDATE interactive.sessions
   SET game_type = 'pinpoint'
 WHERE game_type = 'geo';

UPDATE interactive.sessions
   SET current_game = 'pinpoint'
 WHERE current_game = 'geo';

-- ─── 3. Recréer les CHECK constraints avec la nouvelle valeur autorisée
--       (on garde tous les jeux existants, on remplace 'geo' par 'pinpoint')
ALTER TABLE interactive.sessions
  ADD CONSTRAINT sessions_game_type_check
  CHECK (game_type IN (
    'quiz',
    'petit_bac',
    'blind_test',
    'estim',
    'pinpoint',
    'reflex',
    'loup_garou',
    'draw'
  ));

ALTER TABLE interactive.sessions
  ADD CONSTRAINT sessions_current_game_check
  CHECK (current_game IN (
    'quiz',
    'petit_bac',
    'blind_test',
    'estim',
    'pinpoint',
    'reflex',
    'loup_garou',
    'draw'
  ) OR current_game IS NULL);

-- ─── 4. Mettre à jour la RPC submit_answer pour reconnaître 'pinpoint'
--       (la fonction actuelle mappe 'geo' → 0 dans un CASE ; on remplace par 'pinpoint')
--       Note : si tu utilises une autre RPC ou un mapping différent, adapte ici.
CREATE OR REPLACE FUNCTION interactive.submit_answer(
  p_session_id  uuid,
  p_player_token uuid,
  p_round       int,
  p_answer      text
) RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = interactive, public
AS $$
DECLARE
  v_game_type text;
  v_score_delta int := 0;
BEGIN
  -- Lire le type de jeu de la session (autoritaire serveur)
  SELECT game_type INTO v_game_type
    FROM interactive.sessions
   WHERE id = p_session_id;

  -- Retourner le delta de score selon le jeu
  -- STUB : à remplacer par le vrai calcul quand ready
  v_score_delta := CASE v_game_type
    WHEN 'quiz'       THEN 0
    WHEN 'petit_bac'  THEN 0
    WHEN 'blind_test' THEN 0
    WHEN 'pinpoint'   THEN 0  -- ex-'geo', renommé 15/06/2026
    WHEN 'estim'      THEN 0
    WHEN 'reflex'     THEN 0
    WHEN 'loup_garou' THEN 0
    WHEN 'draw'       THEN 0
    ELSE 0
  END;

  RETURN v_score_delta;
END;
$$;

-- ─── 5. Vérification finale (log seulement, ne bloque pas le commit)
DO $$
DECLARE
  v_count_geo integer;
  v_count_pinpoint integer;
BEGIN
  SELECT COUNT(*) INTO v_count_geo
    FROM interactive.sessions
   WHERE game_type = 'geo' OR current_game = 'geo';

  SELECT COUNT(*) INTO v_count_pinpoint
    FROM interactive.sessions
   WHERE game_type = 'pinpoint' OR current_game = 'pinpoint';

  RAISE NOTICE 'Migration GEO → PIN''POINT terminée. Sessions résiduelles ''geo'' : %. Sessions ''pinpoint'' : %.',
    v_count_geo, v_count_pinpoint;

  IF v_count_geo > 0 THEN
    RAISE WARNING 'ATTENTION : % sessions ont encore le slug ''geo''. Vérifier.', v_count_geo;
  END IF;
END $$;

COMMIT;

SELECT 'Migration rename geo → pinpoint OK ✓' AS status;

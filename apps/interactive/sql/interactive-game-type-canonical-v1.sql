-- ============================================================================
-- VELITO INTERACTIVE — Contrainte game_type CANONIQUE (fix Pin'Point)
-- ----------------------------------------------------------------------------
-- CORRIGÉ le 2026-07-08 après vérification du VRAI schéma en prod :
--   * la table interactive.sessions n'a PAS de colonne `current_game`
--     (uniquement game_type + current_state) → toute référence à current_game
--     faisait planter la migration ("column current_game does not exist") ;
--   * il faut DROP la contrainte AVANT de migrer geo→pinpoint, sinon l'UPDATE
--     est rejeté par l'ancienne contrainte (qui ne connaît pas 'pinpoint') ;
--   * la contrainte doit autoriser NULL (des sessions sans jeu choisi existent).
--
-- POURQUOI : le code utilise 'pinpoint', mais l'ancienne contrainte listait
-- 'geo' (et une valeur fantôme 'undercover') → toute session Pin'Point rejetée.
--
-- Effets : drop contrainte → migre geo→pinpoint → repose la contrainte avec les
-- valeurs canoniques (incl. 'laser' et NULL). Idempotent.
-- ============================================================================

BEGIN;

-- 1. On retire la contrainte AVANT de toucher aux données (sinon l'UPDATE casse).
ALTER TABLE interactive.sessions DROP CONSTRAINT IF EXISTS sessions_game_type_check;

-- 2. Migration des valeurs héritées vers le nommage canonique.
UPDATE interactive.sessions SET game_type = 'pinpoint'   WHERE game_type = 'geo';
UPDATE interactive.sessions SET game_type = 'petit_bac'  WHERE game_type = 'petitbac';
UPDATE interactive.sessions SET game_type = 'blind_test' WHERE game_type = 'blindtest';

-- 3. Contrainte canonique (NULL autorisé + 'laser' inclus).
ALTER TABLE interactive.sessions
  ADD CONSTRAINT sessions_game_type_check
  CHECK (game_type IS NULL OR game_type IN (
    'quiz','petit_bac','blind_test','pinpoint','estim','reflex','loup_garou','draw','laser'
  ));

COMMIT;

-- Vérification -----------------------------------------------------------------
SELECT game_type, count(*) AS n
FROM interactive.sessions
GROUP BY game_type
ORDER BY game_type;

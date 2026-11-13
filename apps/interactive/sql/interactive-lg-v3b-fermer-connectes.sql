-- ============================================================================
-- VELITO INTERACTIVE : Loup-Garou, fermer aussi aux joueurs connectés (13/11/2026)
-- PARTIE B : à exécuter APRÈS le déploiement du code qui lit par
-- lg_hote_roles / lg_hote_votes (sinon l'écran de l'animateur casse).
-- ============================================================================
-- Même règle que lg-v2 pour anon, appliquée maintenant à `authenticated` :
-- colonnes publiques seulement, plus d'écriture directe des votes (on vote
-- par lg_voter avec son jeton). L'animateur garde ses ÉCRITURES sur
-- lg_player_roles (insertion des rôles, morts, maire...) : ses mises à jour
-- filtrent sur player_id, colonne restée lisible.
-- Idempotente.
-- ============================================================================

BEGIN;

REVOKE SELECT ON interactive.lg_player_roles FROM authenticated;
GRANT SELECT (player_id, session_id, alive, is_mayor, death_reason, death_cycle, created_at)
  ON interactive.lg_player_roles TO authenticated;

REVOKE SELECT, INSERT, UPDATE ON interactive.lg_votes FROM authenticated;
GRANT SELECT (id, session_id, vote_round, voter_id, created_at, updated_at)
  ON interactive.lg_votes TO authenticated;

COMMIT;

-- VÉRIFICATIONS (false attendu partout) :
--   select has_column_privilege('authenticated','interactive.lg_player_roles','role','SELECT'),
--          has_column_privilege('authenticated','interactive.lg_votes','target_id','SELECT'),
--          has_table_privilege('authenticated','interactive.lg_votes','INSERT');
-- Retour arrière :
--   GRANT SELECT ON interactive.lg_player_roles TO authenticated;
--   GRANT SELECT, INSERT, UPDATE ON interactive.lg_votes TO authenticated;

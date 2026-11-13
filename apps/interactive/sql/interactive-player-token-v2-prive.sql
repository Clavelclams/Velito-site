-- ============================================================================
-- VELITO INTERACTIVE : le jeton joueur devient vraiment privé (13/11/2026)
-- À exécuter sur le projet velito-hub, APRÈS interactive-player-token-v1.sql.
-- ============================================================================
-- LA FAILLE (vérifiée en prod le 13/11/2026) :
--   La v1 promettait « jamais exposé à un autre joueur », mais la table
--   session_players était lisible en entier par tout le monde (policy
--   players_select_all + GRANT SELECT sur toute la table). Avec l'id d'un
--   joueur, visible dans le salon, on lisait son player_token, donc son rôle
--   secret au Loup-Garou, et on pouvait voter ou agir à sa place.
--
-- LA CORRECTION :
--   1. Droits PAR COLONNE (même méthode que Arena 009) : anon et
--      authenticated lisent toutes les colonnes SAUF player_token.
--      Realtime applique aussi les droits par colonne : le jeton ne part plus
--      dans les événements temps réel (à vérifier après exécution, voir bas).
--   2. Le joueur reçoit SON jeton une seule fois, au moment où il rejoint,
--      via la fonction rejoindre_session (qui fait l'INSERT et rend id + jeton).
--      Le navigateur le garde ensuite (localStorage). Plus aucun moyen de lire
--      le jeton de quelqu'un d'autre.
--
-- Les fonctions SECURITY DEFINER existantes (get_my_lg_role, etc.) lisent la
-- colonne avec les droits de leur propriétaire : elles continuent de marcher.
-- Idempotente.
-- ============================================================================

BEGIN;

-- 1. Droits par colonne --------------------------------------------------------
REVOKE SELECT ON interactive.session_players FROM anon, authenticated;
GRANT SELECT (id, session_id, user_id, pseudo, avatar_config, joined_at, score, eliminated_round)
  ON interactive.session_players TO anon, authenticated;

-- 2. Rejoindre une session et recevoir SON jeton ---------------------------------
-- Mêmes règles que la policy players_insert_during_lobby : on ne rejoint
-- qu'une session encore au salon. Le pseudo déjà pris lève l'erreur d'unicité
-- habituelle (23505), que l'application traduit.
CREATE OR REPLACE FUNCTION interactive.rejoindre_session(
  p_session_id uuid,
  p_pseudo     text,
  p_avatar     jsonb
)
RETURNS TABLE (id uuid, player_token uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = interactive, pg_temp
AS $$
DECLARE
  v_pseudo text := btrim(coalesce(p_pseudo, ''));
BEGIN
  IF char_length(v_pseudo) < 2 OR char_length(v_pseudo) > 24 THEN
    RAISE EXCEPTION 'Pseudo invalide (2 à 24 caractères).';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM interactive.sessions s WHERE s.id = p_session_id AND s.status = 'lobby') THEN
    RAISE EXCEPTION 'Cette partie a déjà commencé ou n''existe plus.';
  END IF;

  RETURN QUERY
  INSERT INTO interactive.session_players AS sp (session_id, pseudo, avatar_config)
  VALUES (p_session_id, v_pseudo, p_avatar)
  RETURNING sp.id, sp.player_token;
END;
$$;

REVOKE ALL ON FUNCTION interactive.rejoindre_session(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION interactive.rejoindre_session(uuid, text, jsonb) TO anon, authenticated;

COMMIT;

-- ============================================================================
-- VÉRIFICATIONS (après exécution)
--   1. false attendu deux fois :
--      select has_column_privilege('anon','interactive.session_players','player_token','SELECT'),
--             has_column_privilege('authenticated','interactive.session_players','player_token','SELECT');
--   2. true attendu : select has_column_privilege('anon','interactive.session_players','pseudo','SELECT');
--   3. Test réel : une partie de Loup-Garou à 2 téléphones ; dans les outils
--      du navigateur (onglet Réseau, WebSocket realtime), aucun message ne
--      doit contenir « player_token ».
-- Retour arrière :
--   GRANT SELECT ON interactive.session_players TO anon, authenticated;
--   DROP FUNCTION IF EXISTS interactive.rejoindre_session(uuid, text, jsonb);
-- ============================================================================

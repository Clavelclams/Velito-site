-- ============================================================================
-- VELITO INTERACTIVE : Loup-Garou, les secrets restent secrets (13/11/2026)
-- À exécuter APRÈS interactive-player-token-v2-prive.sql.
-- ============================================================================
-- CONSTAT EN PROD (13/11/2026), pour un joueur non connecté (rôle anon) :
--   1. lg_player_roles : la colonne `role` (et lover_of, potions...) était
--      lisible par tous. Une requête depuis la console d'un téléphone donnait
--      le rôle de tous les joueurs. Le commentaire de la v1 (« Realtime ne
--      gère pas les droits par colonne, on fait confiance au client ») est
--      faux : realtime.apply_rls vérifie has_column_privilege colonne par
--      colonne (vérifié dans la base le 13/11/2026).
--   2. lg_votes : target_id lisible par tous, donc les votes de nuit des
--      loups désignaient les loups.
--   3. lg_votes : n'importe qui pouvait voter AU NOM d'un autre joueur
--      (voter_id libre, aucun contrôle de jeton).
--
-- CORRECTION, pour anon :
--   - droits par colonne : seules les infos publiques restent lisibles
--     (vivant, maire, cause et tour de la mort ; qui a voté, pas pour qui) ;
--   - les loups découvrent leurs coéquipiers par lg_mes_loups (jeton exigé) ;
--   - on vote par lg_voter (jeton exigé) : plus d'écriture directe.
--
-- PAS ENCORE TRAITÉ (étape suivante, notée dans le suivi) : le rôle
-- `authenticated` garde l'accès complet, parce que l'animateur (connecté) en
-- a besoin dans ses actions serveur et sur l'écran TV. Un joueur connecté à
-- un compte Velito pourrait donc encore lire les rôles. Correctif prévu :
-- faire lire l'animateur par des fonctions qui vérifient qu'il est l'hôte,
-- puis retirer aussi ces colonnes à authenticated.
-- Idempotente.
-- ============================================================================

BEGIN;

-- 1. Rôles : colonnes publiques seulement ------------------------------------
REVOKE SELECT ON interactive.lg_player_roles FROM anon;
GRANT SELECT (player_id, session_id, alive, is_mayor, death_reason, death_cycle, created_at)
  ON interactive.lg_player_roles TO anon;

-- 2 et 3. Votes : on voit qui a voté, pas pour qui ; plus d'écriture directe --
REVOKE SELECT, INSERT, UPDATE ON interactive.lg_votes FROM anon;
GRANT SELECT (id, session_id, vote_round, voter_id, created_at, updated_at)
  ON interactive.lg_votes TO anon;

-- Vérifie qu'un jeton appartient bien au joueur (factorisé, usage interne).
CREATE OR REPLACE FUNCTION interactive.lg_jeton_valide(p_player_id uuid, p_token uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = interactive, pg_temp
AS $$
  SELECT EXISTS (SELECT 1 FROM interactive.session_players sp
                  WHERE sp.id = p_player_id AND sp.player_token = p_token);
$$;
REVOKE ALL ON FUNCTION interactive.lg_jeton_valide(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Coéquipiers loups : seulement si celui qui demande est loup (ou loup blanc).
-- Même règle que l'ancien code client : les loups voient les « wolf ».
CREATE OR REPLACE FUNCTION interactive.lg_mes_loups(p_player_id uuid, p_player_token uuid)
RETURNS TABLE (player_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = interactive, pg_temp
AS $$
DECLARE
  v_role text;
  v_session uuid;
BEGIN
  IF NOT interactive.lg_jeton_valide(p_player_id, p_player_token) THEN
    RAISE EXCEPTION 'Jeton joueur invalide.';
  END IF;
  SELECT pr.role, pr.session_id INTO v_role, v_session
    FROM interactive.lg_player_roles pr WHERE pr.player_id = p_player_id;
  IF v_role IS NULL OR v_role NOT IN ('wolf', 'white_wolf') THEN
    RETURN; -- pas loup : liste vide, sans dire pourquoi
  END IF;
  RETURN QUERY
    SELECT pr.player_id FROM interactive.lg_player_roles pr
     WHERE pr.session_id = v_session AND pr.role = 'wolf';
END;
$$;
REVOKE ALL ON FUNCTION interactive.lg_mes_loups(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION interactive.lg_mes_loups(uuid, uuid) TO anon, authenticated;

-- Voter : jeton exigé, partie en cours, même session pour le joueur et le vote.
-- Remplace l'ancien upsert direct (onConflict vote_round, voter_id).
CREATE OR REPLACE FUNCTION interactive.lg_voter(
  p_player_id    uuid,
  p_player_token uuid,
  p_session_id   uuid,
  p_vote_round   text,
  p_target_id    uuid,
  p_target2_id   uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = interactive, pg_temp
AS $$
BEGIN
  IF NOT interactive.lg_jeton_valide(p_player_id, p_player_token) THEN
    RAISE EXCEPTION 'Jeton joueur invalide.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM interactive.session_players sp
                  WHERE sp.id = p_player_id AND sp.session_id = p_session_id) THEN
    RAISE EXCEPTION 'Ce joueur n''est pas dans cette partie.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM interactive.sessions s WHERE s.id = p_session_id AND s.status = 'playing') THEN
    RAISE EXCEPTION 'La partie n''est pas en cours.';
  END IF;
  INSERT INTO interactive.lg_votes (session_id, vote_round, voter_id, target_id, target2_id)
  VALUES (p_session_id, p_vote_round, p_player_id, p_target_id, p_target2_id)
  ON CONFLICT (vote_round, voter_id)
  DO UPDATE SET target_id = EXCLUDED.target_id,
                target2_id = EXCLUDED.target2_id,
                updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION interactive.lg_voter(uuid, uuid, uuid, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION interactive.lg_voter(uuid, uuid, uuid, text, uuid, uuid) TO anon, authenticated;

COMMIT;

-- VÉRIFICATIONS (false attendu partout) :
--   select has_column_privilege('anon','interactive.lg_player_roles','role','SELECT'),
--          has_column_privilege('anon','interactive.lg_votes','target_id','SELECT'),
--          has_table_privilege('anon','interactive.lg_votes','INSERT');
-- Retour arrière :
--   GRANT SELECT ON interactive.lg_player_roles TO anon;
--   GRANT SELECT, INSERT, UPDATE ON interactive.lg_votes TO anon;
--   DROP FUNCTION IF EXISTS interactive.lg_voter(uuid, uuid, uuid, text, uuid, uuid);
--   DROP FUNCTION IF EXISTS interactive.lg_mes_loups(uuid, uuid);
--   DROP FUNCTION IF EXISTS interactive.lg_jeton_valide(uuid, uuid);

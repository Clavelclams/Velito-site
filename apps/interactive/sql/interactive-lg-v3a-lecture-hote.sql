-- ============================================================================
-- VELITO INTERACTIVE : Loup-Garou, l'animateur lit par des fonctions (13/11/2026)
-- PARTIE A, sans risque : à exécuter AVANT de pousser le code qui l'utilise.
-- La partie B (interactive-lg-v3b-fermer-connectes.sql) se lance APRÈS le
-- déploiement du code.
-- ============================================================================
-- POURQUOI : depuis lg-v2, les joueurs non connectés ne lisent plus les rôles
-- ni les cibles des votes. Mais le rôle `authenticated` gardait tout, parce
-- que l'animateur (connecté) en a besoin. Conséquence : un JOUEUR connecté à
-- un compte Velito pouvait encore tout lire.
--
-- Ces deux fonctions donnent les lignes complètes à l'animateur DE CETTE
-- PARTIE, et à personne d'autre (vérification sessions.host_user_id =
-- auth.uid()). Elles renvoient des lignes de table : le code peut garder ses
-- filtres habituels (.select(...).eq("vote_round", ...)) derrière l'appel.
-- Idempotente.
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION interactive.lg_hote_roles(p_session_id uuid)
RETURNS SETOF interactive.lg_player_roles
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = interactive, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM interactive.sessions s
     WHERE s.id = p_session_id AND s.host_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Réservé à l''animateur de cette partie.';
  END IF;
  RETURN QUERY SELECT * FROM interactive.lg_player_roles pr WHERE pr.session_id = p_session_id;
END;
$$;

CREATE OR REPLACE FUNCTION interactive.lg_hote_votes(p_session_id uuid)
RETURNS SETOF interactive.lg_votes
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = interactive, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM interactive.sessions s
     WHERE s.id = p_session_id AND s.host_user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Réservé à l''animateur de cette partie.';
  END IF;
  RETURN QUERY SELECT * FROM interactive.lg_votes v WHERE v.session_id = p_session_id;
END;
$$;

REVOKE ALL ON FUNCTION interactive.lg_hote_roles(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION interactive.lg_hote_votes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION interactive.lg_hote_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION interactive.lg_hote_votes(uuid) TO authenticated;

COMMIT;

-- Retour arrière :
--   DROP FUNCTION IF EXISTS interactive.lg_hote_roles(uuid);
--   DROP FUNCTION IF EXISTS interactive.lg_hote_votes(uuid);

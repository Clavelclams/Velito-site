-- ============================================================================
-- VELITO INTERACTIVE — Schéma interactive_lg pour Loup-Garou V2
-- À exécuter UNIQUEMENT au démarrage du sprint 1 du plan V2.
-- Prérequis : interactive-player-token-v1.sql doit avoir été exécuté.
-- ============================================================================
-- CE QUE CETTE MIGRATION CRÉE :
--   - Schéma interactive_lg (séparation propre des RLS Loup-Garou)
--   - Table games (état d'une partie : phase, round, etc.)
--   - Table player_roles (rôle SECRET de chaque joueur)
--   - Table events (log des actions du jeu — audit + rejouabilité)
--   - Table votes (votes nuit des loups + jour du village)
--   - RPC get_my_role(player_id, player_token) pour lecture authentifiée anon
--   - RPC submit_vote(...) pour soumettre un vote
--   - RLS strictes : seul le host et le joueur concerné voient les données
--   - Realtime sur games + events (pas sur player_roles — donnée privée)
--
-- POURQUOI SCHÉMA SÉPARÉ :
--   Mélanger les RLS Loup-Garou et les RLS publiques de Quiz/Petit Bac dans
--   le même schéma augmente le risque qu'une mauvaise policy fasse fuiter
--   un rôle. Schéma séparé = isolation propre, lecture publique impossible
--   par défaut.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Création du schéma
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS interactive_lg;

GRANT USAGE ON SCHEMA interactive_lg TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 2. Table games — état d'une partie Loup-Garou (1 ligne par session)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS interactive_lg.games CASCADE;

CREATE TABLE interactive_lg.games (
  session_id          uuid PRIMARY KEY REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  /** Phase principale : lobby, setup, night, day, ended. */
  phase               text NOT NULL DEFAULT 'lobby',
  /** Sous-étape (savior, seer, wolves, witch, reveal, debate, vote, etc.). */
  phase_step          text,
  night_number        int NOT NULL DEFAULT 0,
  day_number          int NOT NULL DEFAULT 0,
  /** Joueur élu maire (vote double, départage). */
  mayor_player_id     uuid REFERENCES interactive.session_players(id),
  /** Amoureux désignés par Cupidon (0 ou 2 ids). */
  cupid_lovers        uuid[],
  /** Camp gagnant : village | wolves | white_wolf | lovers (null tant que partie en cours). */
  winner_camp         text,
  phase_started_at    timestamptz DEFAULT now(),
  phase_duration_sec  int DEFAULT 30,
  created_at          timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE interactive_lg.games IS
  'État courant d''une partie Loup-Garou. 1 ligne par session.';

-- ----------------------------------------------------------------------------
-- 3. Table player_roles — rôle SECRET de chaque joueur
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS interactive_lg.player_roles CASCADE;

CREATE TABLE interactive_lg.player_roles (
  player_id                  uuid PRIMARY KEY REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  session_id                 uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  /** Le rôle : wolf, white_wolf, villager, seer, witch, hunter, cupid, savior, idiot, bear_keeper, scapegoat. */
  role                       text NOT NULL,
  alive                      boolean NOT NULL DEFAULT true,
  /** L'Idiot grillé perd son vote (passe à false). */
  can_vote                   boolean NOT NULL DEFAULT true,
  /** Pour l'historique post-mortem : wolves, witch, hunter, lover, village_vote, white_wolf. */
  death_reason               text,
  death_night                int,
  death_day                  int,
  -- État spécifique Sorcière
  witch_life_potion_used     boolean NOT NULL DEFAULT false,
  witch_death_potion_used    boolean NOT NULL DEFAULT false,
  -- État Salvateur (pas autorisé à protéger la même cible 2 nuits de suite)
  savior_last_protected      uuid,
  -- Chasseur : a-t-il déjà tiré sa balle ?
  hunter_shot_taken          boolean NOT NULL DEFAULT false,
  /** Position de table (1, 2, 3...) pour calculer le voisinage du Montreur d'Ours. */
  seat_order                 int NOT NULL,
  created_at                 timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_player_roles_session ON interactive_lg.player_roles(session_id);

COMMENT ON TABLE interactive_lg.player_roles IS
  'Rôle SECRET attribué à chaque joueur. LECTURE INTERDITE publiquement — utiliser RPC get_my_role().';

-- ----------------------------------------------------------------------------
-- 4. Table events — log des actions du jeu (audit + Realtime)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS interactive_lg.events CASCADE;

CREATE TABLE interactive_lg.events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  night_number int,
  day_number   int,
  /** Type d'event : ROLE_ASSIGNED, WOLF_VOTE, SEER_PEEK, WITCH_POTION, CUPID_LINK, BEAR_GROWL, DAY_VOTE, DEATH, GAME_END. */
  event_type   text NOT NULL,
  actor_id     uuid REFERENCES interactive.session_players(id),
  target_id    uuid REFERENCES interactive.session_players(id),
  /** Détails additionnels (potion type, role peeked, etc.). */
  payload      jsonb,
  /** Si true, l'event est annoncé publiquement (TV) ; sinon privé (action nocturne secrète). */
  is_public    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_session ON interactive_lg.events(session_id);
CREATE INDEX idx_events_session_public ON interactive_lg.events(session_id, is_public) WHERE is_public = true;

COMMENT ON TABLE interactive_lg.events IS
  'Log de TOUTES les actions du jeu. Permet rejouer, debug, audit. is_public sépare ce que la TV peut afficher.';

-- ----------------------------------------------------------------------------
-- 5. Table votes — votes nuit des loups + jour du village
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS interactive_lg.votes CASCADE;

CREATE TABLE interactive_lg.votes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  /** Round de vote : night_2_wolves, day_3_village, day_0_mayor. */
  vote_round     text NOT NULL,
  voter_id       uuid NOT NULL REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  target_id      uuid REFERENCES interactive.session_players(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vote_round, voter_id)
);

CREATE INDEX idx_votes_round ON interactive_lg.votes(session_id, vote_round);

COMMENT ON TABLE interactive_lg.votes IS
  'Votes en cours. UPSERT à chaque changement d''avis du votant. UNIQUE (round, voter) = 1 vote / joueur / round.';

-- ----------------------------------------------------------------------------
-- 6. RLS — strictes par défaut
-- ----------------------------------------------------------------------------
ALTER TABLE interactive_lg.games        ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactive_lg.player_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactive_lg.events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactive_lg.votes        ENABLE ROW LEVEL SECURITY;

-- ─── games ─── lecture publique (pour TV + écran joueur)
CREATE POLICY games_select_all ON interactive_lg.games
  FOR SELECT USING (true);

-- ─── games ─── UPDATE par host seulement
CREATE POLICY games_update_host ON interactive_lg.games
  FOR UPDATE USING (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

-- ─── games ─── INSERT par host seulement
CREATE POLICY games_insert_host ON interactive_lg.games
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

-- ─── player_roles ─── AUCUNE policy SELECT publique
-- → la lecture passe exclusivement par les RPC SECURITY DEFINER
-- ─── player_roles ─── UPDATE par host seulement
CREATE POLICY player_roles_update_host ON interactive_lg.player_roles
  FOR UPDATE USING (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

-- ─── player_roles ─── INSERT par host seulement (distribution des rôles)
CREATE POLICY player_roles_insert_host ON interactive_lg.player_roles
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

-- ─── events ─── SELECT public uniquement pour is_public = true
CREATE POLICY events_select_public ON interactive_lg.events
  FOR SELECT USING (is_public = true);

-- ─── events ─── INSERT/UPDATE par host
CREATE POLICY events_modify_host ON interactive_lg.events
  FOR ALL USING (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

-- ─── votes ─── SELECT public (pour décompte côté TV)
CREATE POLICY votes_select_all ON interactive_lg.votes
  FOR SELECT USING (true);

-- ─── votes ─── INSERT/UPDATE par les RPC submit_vote (qui valident le token)
-- Pas de policy directe pour anon → on passe par RPC SECURITY DEFINER
CREATE POLICY votes_modify_host ON interactive_lg.votes
  FOR ALL USING (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

-- ----------------------------------------------------------------------------
-- 7. RPC get_my_role — lecture authentifiée du rôle privé
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION interactive_lg.get_my_role(
  p_player_id     uuid,
  p_player_token  uuid
) RETURNS TABLE(
  role                     text,
  alive                    boolean,
  can_vote                 boolean,
  witch_life_potion_used   boolean,
  witch_death_potion_used  boolean,
  hunter_shot_taken        boolean,
  seat_order               int
) AS $$
BEGIN
  -- Validation du token : doit correspondre exactement au joueur
  IF NOT EXISTS (
    SELECT 1 FROM interactive.session_players sp
    WHERE sp.id = p_player_id AND sp.player_token = p_player_token
  ) THEN
    RAISE EXCEPTION 'Invalid player token';
  END IF;

  RETURN QUERY
    SELECT pr.role, pr.alive, pr.can_vote,
           pr.witch_life_potion_used, pr.witch_death_potion_used,
           pr.hunter_shot_taken, pr.seat_order
    FROM interactive_lg.player_roles pr
    WHERE pr.player_id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION interactive_lg.get_my_role(uuid, uuid) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. RPC submit_vote — soumission d'un vote authentifié
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION interactive_lg.submit_vote(
  p_session_id    uuid,
  p_player_id     uuid,
  p_player_token  uuid,
  p_vote_round    text,
  p_target_id     uuid
) RETURNS void AS $$
BEGIN
  -- Validation du token
  IF NOT EXISTS (
    SELECT 1 FROM interactive.session_players sp
    WHERE sp.id = p_player_id
      AND sp.player_token = p_player_token
      AND sp.session_id = p_session_id
  ) THEN
    RAISE EXCEPTION 'Invalid player token';
  END IF;

  -- Vérif que le joueur est vivant ET peut voter
  IF NOT EXISTS (
    SELECT 1 FROM interactive_lg.player_roles pr
    WHERE pr.player_id = p_player_id
      AND pr.alive = true
      AND pr.can_vote = true
  ) THEN
    RAISE EXCEPTION 'Player cannot vote';
  END IF;

  -- UPSERT du vote
  INSERT INTO interactive_lg.votes (session_id, vote_round, voter_id, target_id)
  VALUES (p_session_id, p_vote_round, p_player_id, p_target_id)
  ON CONFLICT (vote_round, voter_id)
    DO UPDATE SET target_id = EXCLUDED.target_id, updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION interactive_lg.submit_vote(uuid, uuid, uuid, text, uuid) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 9. Realtime
-- ----------------------------------------------------------------------------
-- games : oui (TV doit voir le changement de phase)
-- events : oui mais SEULEMENT is_public=true sera filtré côté client
-- player_roles : NON (données privées)
-- votes : oui (compteur de votes côté TV)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'interactive_lg' AND tablename = 'games'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive_lg.games;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'interactive_lg' AND tablename = 'events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive_lg.events;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'interactive_lg' AND tablename = 'votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive_lg.votes;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 10. Grants généraux (la sécurité repose sur RLS, pas sur les GRANTs)
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON interactive_lg.games        TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON interactive_lg.player_roles TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON interactive_lg.events       TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON interactive_lg.votes        TO anon, authenticated, service_role;

COMMIT;

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================
SELECT schemaname, tablename
FROM pg_tables
WHERE schemaname = 'interactive_lg'
ORDER BY tablename;

SELECT routine_schema, routine_name
FROM information_schema.routines
WHERE routine_schema = 'interactive_lg'
ORDER BY routine_name;

SELECT 'Loup-Garou v1 OK — schéma interactive_lg + 4 tables + 2 RPC + RLS' AS status;

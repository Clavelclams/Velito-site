-- ============================================================================
-- VELITO INTERACTIVE — Loup-Garou V1 COMPLET (V2.0a de la spec)
-- 7 rôles : Loup-Garou, Loup Blanc, Villageois, Voyante, Sorcière, Chasseur, Cupidon
-- + Maire élu
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS interactive.lg_votes CASCADE;
DROP TABLE IF EXISTS interactive.lg_events CASCADE;
DROP TABLE IF EXISTS interactive.lg_player_roles CASCADE;

CREATE TABLE interactive.lg_player_roles (
  player_id                 uuid PRIMARY KEY REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  session_id                uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  /** wolf | white_wolf | villager | seer | witch | hunter | cupid */
  role                      text NOT NULL CHECK (role IN ('wolf','white_wolf','villager','seer','witch','hunter','cupid')),
  alive                     boolean NOT NULL DEFAULT true,
  is_mayor                  boolean NOT NULL DEFAULT false,
  /** Si Cupidon a lié des amoureux : on stocke l'id de l'autre amoureux. */
  lover_of                  uuid REFERENCES interactive.session_players(id),
  /** Sorcière : potions */
  witch_life_potion_used    boolean NOT NULL DEFAULT false,
  witch_death_potion_used   boolean NOT NULL DEFAULT false,
  /** Chasseur : a déjà tiré ? */
  hunter_shot_taken         boolean NOT NULL DEFAULT false,
  death_reason              text,
  death_cycle               int,
  created_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lg_roles_session ON interactive.lg_player_roles(session_id);

ALTER TABLE interactive.lg_player_roles ENABLE ROW LEVEL SECURITY;

-- LECTURE : on expose alive + is_mayor (publics), mais pas le rôle des vivants.
-- Les morts révèlent leur rôle. Pour les vivants → passer par RPC get_my_lg_role.
DROP POLICY IF EXISTS lg_roles_select_safe ON interactive.lg_player_roles;
CREATE POLICY lg_roles_select_safe
  ON interactive.lg_player_roles
  FOR SELECT USING (true);
-- ⚠ Note : on lit toute la ligne côté client, mais le client ne doit afficher
-- "role" que si alive=false. Les RLS strictes par colonne ne sont pas supportées
-- nativement par Supabase Realtime → on fait confiance au client.
-- V2 : créer une VIEW publique qui masque le role si alive=true.

DROP POLICY IF EXISTS lg_roles_insert_host ON interactive.lg_player_roles;
CREATE POLICY lg_roles_insert_host
  ON interactive.lg_player_roles
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

DROP POLICY IF EXISTS lg_roles_update_host ON interactive.lg_player_roles;
CREATE POLICY lg_roles_update_host
  ON interactive.lg_player_roles
  FOR UPDATE USING (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

-- Votes : nuit_N_wolves, night_N_seer (cible), night_N_witch_save/kill, day_0_mayor, day_N_village
CREATE TABLE interactive.lg_votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  vote_round    text NOT NULL,
  voter_id      uuid NOT NULL REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  target_id     uuid REFERENCES interactive.session_players(id) ON DELETE SET NULL,
  /** Pour Cupidon : 2e cible. */
  target2_id    uuid REFERENCES interactive.session_players(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (vote_round, voter_id)
);

CREATE INDEX idx_lg_votes_round ON interactive.lg_votes(session_id, vote_round);

ALTER TABLE interactive.lg_votes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lg_votes_select_all ON interactive.lg_votes;
CREATE POLICY lg_votes_select_all ON interactive.lg_votes FOR SELECT USING (true);

DROP POLICY IF EXISTS lg_votes_insert ON interactive.lg_votes;
CREATE POLICY lg_votes_insert ON interactive.lg_votes
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM interactive.sessions WHERE id = session_id AND status = 'playing')
  );

DROP POLICY IF EXISTS lg_votes_update ON interactive.lg_votes;
CREATE POLICY lg_votes_update ON interactive.lg_votes
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM interactive.sessions WHERE id = session_id AND status = 'playing')
  );

-- Events : pour log des actions (Voyante peek, etc.)
CREATE TABLE interactive.lg_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  cycle_number  int,
  event_type    text NOT NULL,
  actor_id      uuid REFERENCES interactive.session_players(id),
  target_id     uuid REFERENCES interactive.session_players(id),
  payload       jsonb,
  is_public     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lg_events_session ON interactive.lg_events(session_id);

ALTER TABLE interactive.lg_events ENABLE ROW LEVEL SECURITY;
-- Lecture publique seulement is_public=true
DROP POLICY IF EXISTS lg_events_select_public ON interactive.lg_events;
CREATE POLICY lg_events_select_public ON interactive.lg_events
  FOR SELECT USING (is_public = true);

DROP POLICY IF EXISTS lg_events_modify_host ON interactive.lg_events;
CREATE POLICY lg_events_modify_host ON interactive.lg_events
  FOR ALL USING (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

-- ─── RPC : un joueur lit son rôle privé via son token ─────────────────────
CREATE OR REPLACE FUNCTION interactive.get_my_lg_role(
  p_player_id     uuid,
  p_player_token  uuid
) RETURNS TABLE(
  role text,
  alive boolean,
  is_mayor boolean,
  lover_of uuid,
  witch_life_potion_used boolean,
  witch_death_potion_used boolean,
  hunter_shot_taken boolean
) AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM interactive.session_players sp
    WHERE sp.id = p_player_id AND sp.player_token = p_player_token
  ) THEN
    RAISE EXCEPTION 'Invalid player token';
  END IF;

  RETURN QUERY
    SELECT pr.role, pr.alive, pr.is_mayor, pr.lover_of,
           pr.witch_life_potion_used, pr.witch_death_potion_used, pr.hunter_shot_taken
    FROM interactive.lg_player_roles pr
    WHERE pr.player_id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION interactive.get_my_lg_role(uuid, uuid) TO anon, authenticated;

-- ─── RPC : Voyante lit le rôle d'un joueur cible ──────────────────────────
CREATE OR REPLACE FUNCTION interactive.lg_seer_peek(
  p_session_id    uuid,
  p_seer_id       uuid,
  p_seer_token    uuid,
  p_target_id     uuid
) RETURNS TABLE(target_role text) AS $$
BEGIN
  -- Vérif token + que seer est bien voyante vivante
  IF NOT EXISTS (
    SELECT 1 FROM interactive.session_players sp
    WHERE sp.id = p_seer_id AND sp.player_token = p_seer_token
  ) THEN
    RAISE EXCEPTION 'Invalid player token';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM interactive.lg_player_roles pr
    WHERE pr.player_id = p_seer_id AND pr.role = 'seer' AND pr.alive = true
  ) THEN
    RAISE EXCEPTION 'Player is not an alive seer';
  END IF;

  -- Log l'event privé
  INSERT INTO interactive.lg_events (session_id, event_type, actor_id, target_id, is_public)
  VALUES (p_session_id, 'SEER_PEEK', p_seer_id, p_target_id, false);

  RETURN QUERY
    SELECT pr.role FROM interactive.lg_player_roles pr WHERE pr.player_id = p_target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION interactive.lg_seer_peek(uuid, uuid, uuid, uuid) TO anon, authenticated;

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='interactive' AND tablename='lg_votes') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.lg_votes;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='interactive' AND tablename='lg_player_roles') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.lg_player_roles;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='interactive' AND tablename='lg_events') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.lg_events;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON interactive.lg_player_roles TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON interactive.lg_votes TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON interactive.lg_events TO anon, authenticated, service_role;

COMMIT;

SELECT 'Loup-Garou v1 COMPLET OK — 3 tables + 2 RPC + RLS' AS status;

-- ============================================================================
-- VELITO INTERACTIVE — Géo V1 — Place le pin au plus proche de la cible
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS interactive.geo_answers CASCADE;

CREATE TABLE interactive.geo_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  player_id       uuid NOT NULL REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  round           int NOT NULL,
  /** Position cliquée par le joueur (lat/lng degrés WGS84). */
  guess_lat       numeric NOT NULL,
  guess_lng       numeric NOT NULL,
  /** Calculé au reveal — distance en km au point cible. */
  distance_km     numeric NOT NULL DEFAULT 0,
  points          int NOT NULL DEFAULT 0,
  rank            int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, round)
);

CREATE INDEX idx_geo_session ON interactive.geo_answers(session_id);
CREATE INDEX idx_geo_player  ON interactive.geo_answers(player_id);
CREATE INDEX idx_geo_round   ON interactive.geo_answers(session_id, round);

COMMENT ON TABLE interactive.geo_answers IS
  'Pins placés par les joueurs sur la carte. UPSERT à chaque déplacement du pin.';

ALTER TABLE interactive.geo_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS geo_select_all ON interactive.geo_answers;
CREATE POLICY geo_select_all
  ON interactive.geo_answers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS geo_insert_during_round ON interactive.geo_answers;
CREATE POLICY geo_insert_during_round
  ON interactive.geo_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND s.status = 'playing'
        AND (s.current_state->>'phase') = 'round'
        AND (s.current_state->>'round')::int = round
    )
  );

DROP POLICY IF EXISTS geo_update_during_round ON interactive.geo_answers;
CREATE POLICY geo_update_during_round
  ON interactive.geo_answers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND s.status = 'playing'
        AND (s.current_state->>'phase') = 'round'
        AND (s.current_state->>'round')::int = round
    )
    AND points = 0
  )
  WITH CHECK (points = 0);

DROP POLICY IF EXISTS geo_update_by_host ON interactive.geo_answers;
CREATE POLICY geo_update_by_host
  ON interactive.geo_answers
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT host_user_id FROM interactive.sessions WHERE id = session_id
    )
  );

DROP TRIGGER IF EXISTS trg_geo_updated_at ON interactive.geo_answers;
CREATE TRIGGER trg_geo_updated_at
  BEFORE UPDATE ON interactive.geo_answers
  FOR EACH ROW
  EXECUTE FUNCTION interactive.set_updated_at();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'interactive'
      AND tablename = 'geo_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.geo_answers;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON interactive.geo_answers TO anon, authenticated, service_role;

COMMIT;

SELECT 'Géo v1 OK — table + RLS + Realtime + trigger' AS status;

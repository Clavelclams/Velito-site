-- ============================================================================
-- VELITO INTERACTIVE — Réflexe V1 — Tap quand le signal apparaît
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS interactive.reflex_answers CASCADE;

CREATE TABLE interactive.reflex_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  player_id       uuid NOT NULL REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  round_index     int NOT NULL,
  /** Délai de réaction en ms (entre signal vert et tap). NULL = trop tard ou false start. */
  reaction_ms     int,
  /** True si le joueur a tapé avant le signal vert (=disqualifié sur ce round). */
  false_start     boolean NOT NULL DEFAULT false,
  points          int NOT NULL DEFAULT 0,
  rank            int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, round_index)
);

CREATE INDEX idx_reflex_session ON interactive.reflex_answers(session_id);
CREATE INDEX idx_reflex_round   ON interactive.reflex_answers(session_id, round_index);

ALTER TABLE interactive.reflex_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS reflex_select_all ON interactive.reflex_answers;
CREATE POLICY reflex_select_all ON interactive.reflex_answers FOR SELECT USING (true);

DROP POLICY IF EXISTS reflex_insert ON interactive.reflex_answers;
CREATE POLICY reflex_insert ON interactive.reflex_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive.sessions
      WHERE id = session_id AND status = 'playing'
    )
  );

DROP POLICY IF EXISTS reflex_update_by_host ON interactive.reflex_answers;
CREATE POLICY reflex_update_by_host ON interactive.reflex_answers
  FOR UPDATE USING (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'interactive' AND tablename = 'reflex_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.reflex_answers;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON interactive.reflex_answers TO anon, authenticated, service_role;

COMMIT;

SELECT 'Réflexe v1 OK — table + RLS + Realtime' AS status;

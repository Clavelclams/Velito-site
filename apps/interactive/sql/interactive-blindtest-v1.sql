-- ============================================================================
-- VELITO INTERACTIVE — Blind Test V1
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS interactive.blindtest_answers CASCADE;

CREATE TABLE interactive.blindtest_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  player_id       uuid NOT NULL REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  round_index     int NOT NULL,
  /** Réponse choisie : A / B / C / D */
  answer          text NOT NULL,
  is_correct      boolean NOT NULL DEFAULT false,
  points          int NOT NULL DEFAULT 0,
  answered_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, round_index)
);

CREATE INDEX idx_bt_session  ON interactive.blindtest_answers(session_id);
CREATE INDEX idx_bt_player   ON interactive.blindtest_answers(player_id);
CREATE INDEX idx_bt_round    ON interactive.blindtest_answers(session_id, round_index);

ALTER TABLE interactive.blindtest_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bt_select_all ON interactive.blindtest_answers;
CREATE POLICY bt_select_all ON interactive.blindtest_answers FOR SELECT USING (true);

DROP POLICY IF EXISTS bt_insert_during_round ON interactive.blindtest_answers;
CREATE POLICY bt_insert_during_round ON interactive.blindtest_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive.sessions
      WHERE id = session_id AND status = 'playing'
    )
  );

DROP POLICY IF EXISTS bt_update_during_round ON interactive.blindtest_answers;
CREATE POLICY bt_update_during_round ON interactive.blindtest_answers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND s.status = 'playing'
        AND (s.current_state->>'phase') = 'question'
        AND (s.current_state->>'roundIndex')::int = round_index
    )
    AND is_correct = false
    AND points = 0
  )
  WITH CHECK (is_correct = false AND points = 0);

DROP POLICY IF EXISTS bt_update_by_host ON interactive.blindtest_answers;
CREATE POLICY bt_update_by_host ON interactive.blindtest_answers
  FOR UPDATE USING (
    auth.uid() IN (SELECT host_user_id FROM interactive.sessions WHERE id = session_id)
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'interactive' AND tablename = 'blindtest_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.blindtest_answers;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON interactive.blindtest_answers TO anon, authenticated, service_role;

COMMIT;

SELECT 'Blind Test v1 OK — table + RLS + Realtime' AS status;

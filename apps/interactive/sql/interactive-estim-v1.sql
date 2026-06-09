-- ============================================================================
-- VELITO INTERACTIVE — Estim' V1 — Le plus proche du chiffre exact gagne
-- À exécuter sur le projet velito-hub.
-- ============================================================================
-- CE QUE CETTE MIGRATION CRÉE :
--   1. Table estim_answers — UNE ligne par (player × round) avec l'estimation
--   2. RLS — INSERT/UPDATE par anon pendant phase 'round', host UPDATE au reveal
--   3. Realtime enabled
--
-- DESIGN :
--   - Même pattern que petit_bac_answers
--   - Une estimation par round et par joueur (UPSERT)
--   - guess stocké en numeric pour supporter les grands nombres
-- ============================================================================

BEGIN;

DROP TABLE IF EXISTS interactive.estim_answers CASCADE;

CREATE TABLE interactive.estim_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  player_id       uuid NOT NULL REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  round           int NOT NULL,
  /** L'estimation du joueur (peut être très grand, ex: 50 milliards). */
  guess           numeric NOT NULL,
  /** Calculé au reveal côté serveur. */
  diff_absolute   numeric NOT NULL DEFAULT 0,
  diff_percent    numeric NOT NULL DEFAULT 0,
  points          int NOT NULL DEFAULT 0,
  /** Rang dans la liste des plus proches (1 = le plus proche). */
  rank            int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, round)
);

CREATE INDEX idx_estim_session ON interactive.estim_answers(session_id);
CREATE INDEX idx_estim_player  ON interactive.estim_answers(player_id);
CREATE INDEX idx_estim_round   ON interactive.estim_answers(session_id, round);

COMMENT ON TABLE interactive.estim_answers IS
  'Estimations Estim. UPSERT à chaque changement d''avis du joueur.';

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE interactive.estim_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS estim_select_all ON interactive.estim_answers;
CREATE POLICY estim_select_all
  ON interactive.estim_answers
  FOR SELECT USING (true);

-- INSERT par anon si session 'playing' + phase 'round' + round courant
DROP POLICY IF EXISTS estim_insert_during_round ON interactive.estim_answers;
CREATE POLICY estim_insert_during_round
  ON interactive.estim_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND s.status = 'playing'
        AND (s.current_state->>'phase') = 'round'
        AND (s.current_state->>'round')::int = round
    )
  );

-- UPDATE par anon pendant phase 'round' + même round + pas encore scoré
DROP POLICY IF EXISTS estim_update_during_round ON interactive.estim_answers;
CREATE POLICY estim_update_during_round
  ON interactive.estim_answers
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

-- UPDATE par host au reveal
DROP POLICY IF EXISTS estim_update_by_host ON interactive.estim_answers;
CREATE POLICY estim_update_by_host
  ON interactive.estim_answers
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT host_user_id FROM interactive.sessions WHERE id = session_id
    )
  );

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_estim_updated_at ON interactive.estim_answers;
CREATE TRIGGER trg_estim_updated_at
  BEFORE UPDATE ON interactive.estim_answers
  FOR EACH ROW
  EXECUTE FUNCTION interactive.set_updated_at();

-- Realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'interactive'
      AND tablename = 'estim_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.estim_answers;
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON interactive.estim_answers TO anon, authenticated, service_role;

COMMIT;

SELECT 'Estim v1 OK — table + RLS + Realtime + trigger' AS status;

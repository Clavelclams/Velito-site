-- ============================================================================
-- VELITO INTERACTIVE — Quiz state + answers : V1 — 31/05/2026
-- À exécuter APRÈS interactive-sessions-v1.sql sur le projet velito-hub.
-- ============================================================================
-- CE QUE CETTE MIGRATION CRÉE :
--   1. Colonne sessions.current_state (jsonb) — phase + questionIndex + timing
--   2. Table player_answers — UNE ligne par (player × question) avec réponse + correctness
--   3. RLS player_answers
--   4. Realtime enabled sur player_answers
--
-- DESIGN :
--   - current_state est un blob JSON pour pouvoir évoluer sans migrations (on
--     pourra ajouter streak, multiplier, etc. sans toucher au schéma)
--   - player_answers est normalisée (1 ligne = 1 vote) pour les agrégations
--     SQL faciles (COUNT, score par joueur, classement, etc.)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Étendre sessions avec un state JSON
-- ----------------------------------------------------------------------------
ALTER TABLE interactive.sessions
  ADD COLUMN IF NOT EXISTS current_state jsonb;

COMMENT ON COLUMN interactive.sessions.current_state IS
  'État courant du jeu : { phase, questionIndex, questionStartedAt, timeLimitSec }. JSON pour flexibilité.';

-- ----------------------------------------------------------------------------
-- 2. Table player_answers — une ligne par (player × question)
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS interactive.player_answers CASCADE;

CREATE TABLE interactive.player_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  player_id       uuid NOT NULL REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  question_index  int NOT NULL,
  /** L'answer key choisi par le joueur (ex: 'A','B','C','D') OR la valeur réelle. */
  answer          text NOT NULL,
  /** Calculé côté serveur au reveal — pas envoyé par le client (qui pourrait tricher). */
  is_correct      boolean NOT NULL DEFAULT false,
  /** Combien de points cette réponse a rapporté (dépend du timing). */
  points          int NOT NULL DEFAULT 0,
  answered_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, question_index)
);

CREATE INDEX idx_answers_session   ON interactive.player_answers(session_id);
CREATE INDEX idx_answers_player    ON interactive.player_answers(player_id);
CREATE INDEX idx_answers_question  ON interactive.player_answers(session_id, question_index);

COMMENT ON TABLE interactive.player_answers IS
  'Réponses des joueurs aux questions du Quiz. UNIQUE (player, question) → pas de double vote.';

-- ----------------------------------------------------------------------------
-- 3. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE interactive.player_answers ENABLE ROW LEVEL SECURITY;

-- Lecture publique (pour scoreboard + reveal des résultats)
DROP POLICY IF EXISTS answers_select_all ON interactive.player_answers;
CREATE POLICY answers_select_all
  ON interactive.player_answers
  FOR SELECT USING (true);

-- INSERT par anyone si la session est en mode 'playing' (le joueur soumet sa réponse)
DROP POLICY IF EXISTS answers_insert_during_playing ON interactive.player_answers;
CREATE POLICY answers_insert_during_playing
  ON interactive.player_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive.sessions
      WHERE id = session_id AND status = 'playing'
    )
  );

-- UPDATE par le host de la session (pour marquer is_correct + points au reveal)
DROP POLICY IF EXISTS answers_update_by_host ON interactive.player_answers;
CREATE POLICY answers_update_by_host
  ON interactive.player_answers
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT host_user_id FROM interactive.sessions WHERE id = session_id
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Realtime enabled
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'interactive'
      AND tablename = 'player_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.player_answers;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Grants
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON interactive.player_answers TO anon, authenticated, service_role;

COMMIT;

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================
SELECT 'interactive.sessions.current_state' AS column_name,
       data_type
FROM information_schema.columns
WHERE table_schema = 'interactive'
  AND table_name = 'sessions'
  AND column_name = 'current_state';

SELECT 'interactive.player_answers' AS table_name, COUNT(*) AS rows FROM interactive.player_answers;

SELECT 'Quiz v1 OK — current_state jsonb ajouté + player_answers prêt' AS status;

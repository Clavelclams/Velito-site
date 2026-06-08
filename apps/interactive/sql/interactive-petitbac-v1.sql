-- ============================================================================
-- VELITO INTERACTIVE — Petit Bac : V1 — 09/06/2026
-- À exécuter APRÈS interactive-quiz-v2-allow-update.sql sur le projet velito-hub.
-- ============================================================================
-- CE QUE CETTE MIGRATION CRÉE :
--   1. Table petit_bac_answers — UNE ligne par (player × round × category)
--   2. RLS petit_bac_answers — anon peut INSERT + UPDATE pendant phase 'round'
--   3. Realtime enabled sur petit_bac_answers
--
-- DESIGN :
--   - On réutilise sessions.current_state (jsonb créée pour Quiz). Le payload
--     pour Petit Bac sera :
--       {
--         "phase": "round" | "reveal" | "final",
--         "round": 1,
--         "totalRounds": 5,
--         "letter": "B",
--         "categories": ["Prénoms", "Métiers", "Pays", "Villes", "Fruits", "Animaux"],
--         "roundStartedAt": "2026-...",
--         "roundDurationSec": 45,
--         "revealStartedAt"?: "2026-...",
--         "revealDurationSec"?: 8
--       }
--
--   - petit_bac_answers stocke UNE ligne par (player, round, category) avec :
--       - word : la dernière saisie du joueur (peut être empty string)
--       - is_valid : calculé au reveal (true si word commence par la bonne lettre)
--       - points : 1 par défaut si valide, plus tard 2 si unique
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table petit_bac_answers
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS interactive.petit_bac_answers CASCADE;

CREATE TABLE interactive.petit_bac_answers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  player_id       uuid NOT NULL REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  round           int NOT NULL,
  category        text NOT NULL,
  /** Le mot saisi — peut être empty string si pas encore rempli. */
  word            text NOT NULL DEFAULT '',
  /** Calculé au reveal côté serveur (jamais envoyé par le client). */
  is_valid        boolean NOT NULL DEFAULT false,
  /** 0 par défaut, 1 si valide, plus tard 2 si unique parmi tous les joueurs. */
  points          int NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (player_id, round, category)
);

CREATE INDEX idx_petitbac_session ON interactive.petit_bac_answers(session_id);
CREATE INDEX idx_petitbac_player  ON interactive.petit_bac_answers(player_id);
CREATE INDEX idx_petitbac_round   ON interactive.petit_bac_answers(session_id, round);

COMMENT ON TABLE interactive.petit_bac_answers IS
  'Réponses Petit Bac. UPSERT à chaque saisie (1 ligne par player × round × category).';

-- ----------------------------------------------------------------------------
-- 2. RLS
-- ----------------------------------------------------------------------------
ALTER TABLE interactive.petit_bac_answers ENABLE ROW LEVEL SECURITY;

-- Lecture publique
DROP POLICY IF EXISTS petitbac_select_all ON interactive.petit_bac_answers;
CREATE POLICY petitbac_select_all
  ON interactive.petit_bac_answers
  FOR SELECT USING (true);

-- INSERT par anon si session en 'playing' + phase='round' + round courant
DROP POLICY IF EXISTS petitbac_insert_during_round ON interactive.petit_bac_answers;
CREATE POLICY petitbac_insert_during_round
  ON interactive.petit_bac_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND s.status = 'playing'
        AND (s.current_state->>'phase') = 'round'
        AND (s.current_state->>'round')::int = round
    )
  );

-- UPDATE par anon SI phase='round' + même round + pas encore scoré
DROP POLICY IF EXISTS petitbac_update_during_round ON interactive.petit_bac_answers;
CREATE POLICY petitbac_update_during_round
  ON interactive.petit_bac_answers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND s.status = 'playing'
        AND (s.current_state->>'phase') = 'round'
        AND (s.current_state->>'round')::int = round
    )
    AND is_valid = false
    AND points = 0
  )
  WITH CHECK (is_valid = false AND points = 0);

-- UPDATE par le host (pour scorer au reveal)
DROP POLICY IF EXISTS petitbac_update_by_host ON interactive.petit_bac_answers;
CREATE POLICY petitbac_update_by_host
  ON interactive.petit_bac_answers
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT host_user_id FROM interactive.sessions WHERE id = session_id
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Trigger pour updated_at
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION interactive.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_petitbac_updated_at ON interactive.petit_bac_answers;
CREATE TRIGGER trg_petitbac_updated_at
  BEFORE UPDATE ON interactive.petit_bac_answers
  FOR EACH ROW
  EXECUTE FUNCTION interactive.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Realtime enabled
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'interactive'
      AND tablename = 'petit_bac_answers'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.petit_bac_answers;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Grants
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON interactive.petit_bac_answers TO anon, authenticated, service_role;

COMMIT;

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================
SELECT 'interactive.petit_bac_answers' AS table_name, COUNT(*) AS rows
FROM interactive.petit_bac_answers;

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'interactive'
  AND tablename = 'petit_bac_answers'
ORDER BY policyname;

SELECT 'Petit Bac v1 OK — table + RLS + Realtime + trigger updated_at' AS status;

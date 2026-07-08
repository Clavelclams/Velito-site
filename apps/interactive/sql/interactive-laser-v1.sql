-- ============================================================================
-- VELITO INTERACTIVE — LASER V1 (jeu PvP à élimination, inspiré Blind Shot)
-- ----------------------------------------------------------------------------
-- À exécuter sur le projet velito-hub, APRÈS interactive-game-type-canonical-v1.
--
-- CONTENU :
--   1. Table interactive.laser_moves (position + angle du laser, par manche).
--   2. Colonne session_players.eliminated_round (NULL = encore en vie).
--   3. Ajout de 'laser' aux contraintes game_type / current_game.
--   4. RLS : SECRET avant reveal — aucun joueur ne peut lire les coups des
--      autres pendant la phase 'aim'. Seul le HOST (authentifie) lit tout pour
--      resoudre la manche ; apres reveal/final, tout devient lisible.
--   5. Realtime + GRANT + trigger updated_at.
--
-- MODELE DE SECURITE (coherent avec le reste de la plateforme) :
--   Les joueurs sont anonymes (pas d'auth.uid) -> on NE PEUT PAS identifier
--   « ma ligne » en RLS pour un anon. Le secret est donc garanti autrement :
--   pendant 'aim', la policy SELECT n'autorise QUE le host. Les joueurs
--   n'ont jamais besoin de lire laser_moves : ils recoivent le resultat de la
--   manche via sessions.current_state (deja public + realtime). La resolution
--   (qui touche qui) est faite cote serveur par le host — impossible a tricher.
--
-- Idempotent : DROP IF EXISTS + CREATE, UPDATE cibles, contrainte recreee.
-- ============================================================================

BEGIN;

-- 1. Table des coups ---------------------------------------------------------
DROP TABLE IF EXISTS interactive.laser_moves CASCADE;

CREATE TABLE interactive.laser_moves (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  player_id   uuid NOT NULL REFERENCES interactive.session_players(id) ON DELETE CASCADE,
  round       int  NOT NULL,
  -- Position de l'avatar dans l'arene normalisee [0,1] x [0,1].
  pos_x       numeric NOT NULL,
  pos_y       numeric NOT NULL,
  -- Direction du laser en radians [0, 2pi[.
  angle       numeric NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, round, player_id)
);

CREATE INDEX idx_laser_session ON interactive.laser_moves(session_id);
CREATE INDEX idx_laser_round   ON interactive.laser_moves(session_id, round);

COMMENT ON TABLE interactive.laser_moves IS
  'Coups LASER : position + angle du laser par joueur et par manche. Secret jusqu au reveal.';

-- 2. Elimination sur session_players ----------------------------------------
ALTER TABLE interactive.session_players
  ADD COLUMN IF NOT EXISTS eliminated_round int;  -- NULL = encore en vie

COMMENT ON COLUMN interactive.session_players.eliminated_round IS
  'Manche a laquelle le joueur a ete elimine (LASER). NULL = encore en vie.';

-- 3. Contrainte game_type : gérée par interactive-game-type-canonical-v1.sql
--    (qui inclut déjà 'laser' ET autorise NULL). On NE la touche PAS ici.
--    IMPORTANT : la colonne `current_game` N'EXISTE PAS dans ce schéma
--    (uniquement game_type + current_state) → aucune contrainte current_game.

-- 4. RLS ---------------------------------------------------------------------
ALTER TABLE interactive.laser_moves ENABLE ROW LEVEL SECURITY;

-- 4a. SELECT : host toujours ; tout le monde une fois la manche revelee/finie.
DROP POLICY IF EXISTS laser_select_host_or_revealed ON interactive.laser_moves;
CREATE POLICY laser_select_host_or_revealed
  ON interactive.laser_moves
  FOR SELECT USING (
    auth.uid() IN (
      SELECT host_user_id FROM interactive.sessions WHERE id = session_id
    )
    OR EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND (s.current_state->>'phase') IN ('reveal','final')
    )
  );

-- 4b. INSERT : uniquement pendant la phase 'aim' de la manche courante.
DROP POLICY IF EXISTS laser_insert_during_aim ON interactive.laser_moves;
CREATE POLICY laser_insert_during_aim
  ON interactive.laser_moves
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND s.status = 'playing'
        AND (s.current_state->>'phase') = 'aim'
        AND (s.current_state->>'round')::int = round
    )
  );

-- 4c. UPDATE : le joueur peut reajuster son coup tant qu'on est en 'aim'.
DROP POLICY IF EXISTS laser_update_during_aim ON interactive.laser_moves;
CREATE POLICY laser_update_during_aim
  ON interactive.laser_moves
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND s.status = 'playing'
        AND (s.current_state->>'phase') = 'aim'
        AND (s.current_state->>'round')::int = round
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive.sessions s
      WHERE s.id = session_id
        AND s.status = 'playing'
        AND (s.current_state->>'phase') = 'aim'
        AND (s.current_state->>'round')::int = round
    )
  );

-- 5. Trigger updated_at ------------------------------------------------------
CREATE OR REPLACE FUNCTION interactive.set_updated_at()
RETURNS TRIGGER AS $func$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$func$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_laser_updated_at ON interactive.laser_moves;
CREATE TRIGGER trg_laser_updated_at
  BEFORE UPDATE ON interactive.laser_moves
  FOR EACH ROW
  EXECUTE FUNCTION interactive.set_updated_at();

-- 6. Realtime ----------------------------------------------------------------
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'interactive'
      AND tablename = 'laser_moves'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.laser_moves;
  END IF;
END $do$;

-- 7. GRANT -------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON interactive.laser_moves TO anon, authenticated, service_role;

COMMIT;

-- ============================================================================
-- VERIFICATIONS
-- ============================================================================
SELECT 'laser_moves' AS tbl, count(*) AS lignes FROM interactive.laser_moves;

SELECT con.conname, pg_get_constraintdef(con.oid)
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace ns ON ns.oid = rel.relnamespace
WHERE ns.nspname = 'interactive'
  AND rel.relname = 'sessions'
  AND con.conname IN ('sessions_game_type_check', 'sessions_current_game_check');

SELECT 'LASER v1 OK — table laser_moves + eliminated_round + RLS + realtime + game_type laser' AS status;

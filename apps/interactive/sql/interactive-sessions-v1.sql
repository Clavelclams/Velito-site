-- ============================================================================
-- VELITO INTERACTIVE — Sessions & Joueurs : tables V1 — 31/05/2026
-- À exécuter sur le projet velito-hub (Supabase). Schema : `interactive`.
-- ============================================================================
-- CE QUE CETTE MIGRATION CRÉE :
--   1. Schema `interactive` (séparation logique des données du module)
--   2. interactive.sessions       — une partie créée par un animateur (host)
--   3. interactive.session_players — un joueur dans une partie
--   4. Function generate_session_code() — code court 4 chars unique
--   5. RLS + policies (host = owner sur sa session ; players publics en lecture)
--   6. Realtime publication enabled sur les 2 tables (pour subscribe live)
--   7. Grants pour anon + authenticated (clients web peuvent CRUD via PostgREST)
--
-- POURQUOI UN SCHEMA DÉDIÉ "interactive" PLUTÔT QUE public :
--   - Séparation logique des modules Velito (shared, interactive, arena…)
--   - Permissions plus fines : on peut révoquer l'accès au schéma sans toucher
--     aux autres tables de l'écosystème
--   - Lisibilité : on voit instantanément à quel module appartient une table
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. CLEAN — drop anciennes versions si présentes (early dev, pas de data à garder)
-- ----------------------------------------------------------------------------
-- Si une version précédente de ces tables existe avec un schéma différent
-- (ex : sans host_user_id), le CREATE TABLE IF NOT EXISTS ne fait rien et
-- les CREATE POLICY plantent. On drop avant pour être sûr.
DROP TABLE IF EXISTS interactive.session_players CASCADE;
DROP TABLE IF EXISTS interactive.sessions CASCADE;
DROP FUNCTION IF EXISTS interactive.generate_session_code() CASCADE;

-- ----------------------------------------------------------------------------
-- 1. Schema isolé
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS interactive;

COMMENT ON SCHEMA interactive IS
  'Tables du module Velito Interactive (sessions de jeu, joueurs, gameplay).';

-- ----------------------------------------------------------------------------
-- 2. interactive.sessions — une partie créée par un animateur
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interactive.sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL CHECK (length(code) BETWEEN 4 AND 6),
  host_user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'lobby'
                    CHECK (status IN ('lobby', 'playing', 'ended')),
  game_type       text CHECK (game_type IN ('quiz','blindtest','petitbac','geo')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  started_at      timestamptz,
  ended_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sessions_code   ON interactive.sessions(code);
CREATE INDEX IF NOT EXISTS idx_sessions_host   ON interactive.sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_active ON interactive.sessions(status)
  WHERE status != 'ended';

COMMENT ON TABLE interactive.sessions IS
  'Une partie de Velito Interactive : créée par un host (animateur), rejointe via code court.';

-- ----------------------------------------------------------------------------
-- 3. interactive.session_players — joueur dans une partie
-- ----------------------------------------------------------------------------
-- user_id NULL = joueur anonyme (rejoint via QR sans compte Velito)
-- pseudo doit être unique DANS une session (pas globalement)
CREATE TABLE IF NOT EXISTS interactive.session_players (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pseudo          text NOT NULL CHECK (length(pseudo) BETWEEN 2 AND 24),
  avatar_config   jsonb NOT NULL,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  score           int NOT NULL DEFAULT 0,
  UNIQUE (session_id, pseudo)
);

CREATE INDEX IF NOT EXISTS idx_players_session ON interactive.session_players(session_id);

COMMENT ON TABLE interactive.session_players IS
  'Joueurs présents dans une session. Anonymes acceptés (user_id NULL).';

-- ----------------------------------------------------------------------------
-- 4. Function utilitaire — génère un code court unique (4 chars upper alphanum)
-- ----------------------------------------------------------------------------
-- Le host appelle cette function via RPC pour créer une session avec un code
-- inédit. Si collision (rare avec 36^4 = 1.6M codes possibles), on retry.
CREATE OR REPLACE FUNCTION interactive.generate_session_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = interactive, public
AS $$
DECLARE
  new_code text;
  attempts int := 0;
BEGIN
  LOOP
    -- 4 chars alphanumériques majuscules (lisible sur un écran TV)
    new_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4));
    -- Pas de 0/O ni 1/I/L pour éviter les confusions visuelles
    new_code := translate(new_code, '0OIL1', 'PRQTU');

    IF NOT EXISTS (SELECT 1 FROM interactive.sessions WHERE code = new_code) THEN
      RETURN new_code;
    END IF;

    attempts := attempts + 1;
    IF attempts > 50 THEN
      RAISE EXCEPTION 'Impossible de générer un code de session unique après 50 essais';
    END IF;
  END LOOP;
END;
$$;

COMMENT ON FUNCTION interactive.generate_session_code() IS
  'Génère un code 4 chars unique pour une nouvelle session. Évite les caractères ambigus (0/O, 1/I/L).';

-- ----------------------------------------------------------------------------
-- 5. RLS — politiques de sécurité
-- ----------------------------------------------------------------------------
-- Modèle :
--  - Lecture publique sur les 2 tables : n'importe qui peut lire le contenu
--    d'une session via son code (pour rejoindre depuis un téléphone anonyme)
--  - Écriture sessions : SEULEMENT le host qui l'a créée
--  - Écriture players : tout le monde peut INSERT (pour rejoindre) mais UPDATE
--    réservé au host (mise à jour des scores en cours de partie)

ALTER TABLE interactive.sessions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactive.session_players  ENABLE ROW LEVEL SECURITY;

-- ─── sessions : lecture publique ───
DROP POLICY IF EXISTS sessions_select_all ON interactive.sessions;
CREATE POLICY sessions_select_all
  ON interactive.sessions
  FOR SELECT
  USING (true);

-- ─── sessions : INSERT/UPDATE/DELETE réservé au host loggé ───
DROP POLICY IF EXISTS sessions_insert_host ON interactive.sessions;
CREATE POLICY sessions_insert_host
  ON interactive.sessions
  FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

DROP POLICY IF EXISTS sessions_update_host ON interactive.sessions;
CREATE POLICY sessions_update_host
  ON interactive.sessions
  FOR UPDATE
  USING (auth.uid() = host_user_id);

DROP POLICY IF EXISTS sessions_delete_host ON interactive.sessions;
CREATE POLICY sessions_delete_host
  ON interactive.sessions
  FOR DELETE
  USING (auth.uid() = host_user_id);

-- ─── session_players : lecture publique ───
DROP POLICY IF EXISTS players_select_all ON interactive.session_players;
CREATE POLICY players_select_all
  ON interactive.session_players
  FOR SELECT
  USING (true);

-- ─── session_players : INSERT public (anonymes peuvent rejoindre) ───
-- Restriction : on n'accepte les INSERTs QUE pour les sessions en mode 'lobby'
DROP POLICY IF EXISTS players_insert_during_lobby ON interactive.session_players;
CREATE POLICY players_insert_during_lobby
  ON interactive.session_players
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM interactive.sessions
      WHERE id = session_id AND status = 'lobby'
    )
  );

-- ─── session_players : UPDATE par le host de la session ───
-- (le host met à jour les scores en cours de partie)
DROP POLICY IF EXISTS players_update_by_host ON interactive.session_players;
CREATE POLICY players_update_by_host
  ON interactive.session_players
  FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT host_user_id FROM interactive.sessions WHERE id = session_id
    )
  );

-- ----------------------------------------------------------------------------
-- 6. Realtime — ajouter les tables à la publication supabase_realtime
-- ----------------------------------------------------------------------------
-- Ça permet aux clients (host + joueurs) de subscribe via supabase.channel(...)
-- et de recevoir les INSERT/UPDATE/DELETE en temps réel.
DO $$
BEGIN
  -- Ajoute si pas déjà dans la publication (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'interactive'
      AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.sessions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'interactive'
      AND tablename = 'session_players'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE interactive.session_players;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 7. Grants — exposer le schema aux clients PostgREST (anon + authenticated)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA interactive TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA interactive TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA interactive TO anon, authenticated;

-- Privilèges par défaut : future tables/sequences auto-accessibles
ALTER DEFAULT PRIVILEGES IN SCHEMA interactive
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA interactive
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- Grants spécifiques pour les fonctions (generate_session_code est SECURITY DEFINER)
GRANT EXECUTE ON FUNCTION interactive.generate_session_code() TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 8. Service_role (pour les server actions Next.js qui auraient besoin de bypass RLS)
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA interactive TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA interactive TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA interactive TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA interactive
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

COMMIT;

-- ============================================================================
-- VÉRIFICATIONS post-migration
-- ============================================================================
SELECT 'interactive.sessions' AS table_name, COUNT(*) AS rows FROM interactive.sessions
UNION ALL
SELECT 'interactive.session_players', COUNT(*) FROM interactive.session_players
ORDER BY table_name;

-- Test rapide de la function
SELECT interactive.generate_session_code() AS sample_code;

-- Vérifier que les tables sont dans la publication realtime
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'interactive'
ORDER BY tablename;

SELECT 'Interactive sessions v1 OK — prêt pour le code app' AS status;

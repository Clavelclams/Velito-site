-- ============================================================================
-- VELITO INTERACTIVE — Modèle de données V1 (fondations) — 28/05/2026
-- Produit VENA (SASU) · domaine : interactive.velito.fr
-- Aligné sur le CDC v2 (vocabulaire : tenants / staff / sessions /
-- session_players / session_events). Le scoring est autoritaire côté serveur.
-- ============================================================================
-- DIVERGENCES ASSUMÉES vs CDC v2 (toutes validées avec Clavel) :
--   1. Temps réel = Supabase Realtime (channels) au lieu de NestJS + Socket.IO.
--      Plus rapide à shipper en solo, réutilise la stack VEA/VENA. La couche
--      "scope.action" du CDC se traduit en events broadcast sur le channel.
--   2. Auth staff = Supabase Auth + shared.user_permissions (role via scope)
--      au lieu d'une table staff_users(password_hash) maison. On ne réinvente
--      jamais l'auth → plus sûr.
--
-- Tables de CONTENU des jeux (geo_questions, quiz_packs, blind_tracks,
-- petitbac_categories…) : créées plus tard, au moment de coder chaque jeu.
--
-- ⚠️ Réglages hors-git à faire avant la prod (cf bug devis VENA) :
--   - exposer le schéma `interactive` dans Supabase → Data API → Exposed schemas
--   - SUPABASE_URL + SUPABASE_ANON_KEY (non-Sensitive) sur le projet Vercel
--
-- DÉPENDANCES À CODER HORS DE CE SQL (couches suivantes) :
--   A. SCORING AUTORITAIRE — exigence dure du CDC (§5.5 + §8) :
--      Le joueur (anon) NE peut PAS modifier le score (aucune policy UPDATE
--      pour anon). Le score est calculé et écrit par une RPC SECURITY DEFINER
--      `interactive.submit_answer(session_id, round, answer)` (ou une Edge
--      Function appelée avec la service_role key qui bypass la RLS). Cette
--      couche valide la réponse, calcule le score (distance GEO, vitesse,
--      bonne réponse), incrémente players.score, écrit un session_event.
--      → À tester unitairement (le jury CDA regardera la couverture).
--
--   B. RECONNEXION JOUEUR — exigence CDC §5.2 / §8 :
--      Le `player_token` (uuid généré au INSERT) est retourné au client et
--      stocké localStorage côté manette. Au retour : RPC SECURITY DEFINER
--      `interactive.rejoin(code, player_token)` qui valide et remet le joueur
--      dans la session sans dupliquer le pseudo.
--
-- DESIGN À ASSUMER (entorses lucides au CDC §5.4 "isolation stricte") :
--   Les policies SELECT sur sessions/session_players/session_events sont en
--   USING (true) → lecture publique totale. Pour un MVP bar c'est OK
--   (pseudo + score éphémère, pas d'email joueur). L'isolation stricte du
--   CDC porte sur les tenants/staff/branding, pas sur l'affichage public
--   d'une partie. À justifier devant le jury si demandé.
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS interactive;
GRANT USAGE ON SCHEMA interactive TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- TENANTS — établissements clients (branding multi-tenant)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interactive.tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  organization_id uuid REFERENCES shared.organizations(id) ON DELETE SET NULL,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  logo_url text,
  theme_primary text NOT NULL DEFAULT '#8b5cf6',
  theme_secondary text NOT NULL DEFAULT '#22d3ee',
  promo_message text,
  locale_default text NOT NULL DEFAULT 'fr' CHECK (locale_default IN ('fr','en')),
  active boolean NOT NULL DEFAULT true
);

-- Staff d'un tenant (owner/editor sur l'org via shared.user_permissions).
CREATE OR REPLACE FUNCTION interactive.is_staff(p_tenant uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = shared, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shared.user_permissions up
    JOIN interactive.tenants t ON t.id = p_tenant
    WHERE up.user_id = auth.uid()
      AND up.organization_id = t.organization_id
      AND up.scope IN ('owner', 'editor')
  );
$$;


-- ----------------------------------------------------------------------------
-- SESSIONS — une room (CDC : pin unique, status, mode autopilot/animation)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interactive.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  tenant_id uuid NOT NULL REFERENCES interactive.tenants(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,                  -- code court affiché TV (join)
  pin text,                                   -- PIN à durée de vie limitée
  status text NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','running','results','ended')),
  mode text NOT NULL DEFAULT 'animation' CHECK (mode IN ('autopilot','animation')),
  current_game text CHECK (current_game IN ('geo','blindtest','quiz','petitbac')),  -- typé (CDC v2)
  current_round int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_int_sessions_code ON interactive.sessions(code);
CREATE INDEX IF NOT EXISTS idx_int_sessions_tenant ON interactive.sessions(tenant_id);

-- ----------------------------------------------------------------------------
-- SESSION_PLAYERS — joueurs (sans compte). CDC : pseudo unique par session.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interactive.session_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  session_id uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  pseudo text NOT NULL,
  locale text NOT NULL DEFAULT 'fr' CHECK (locale IN ('fr','en')),
  score integer NOT NULL DEFAULT 0,
  player_token uuid NOT NULL DEFAULT gen_random_uuid(),  -- identifie le joueur sans compte (reconnexion)
  is_connected boolean NOT NULL DEFAULT true,
  kicked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_int_players_session_pseudo
  ON interactive.session_players(session_id, lower(pseudo));
CREATE INDEX IF NOT EXISTS idx_int_players_session ON interactive.session_players(session_id);

-- ----------------------------------------------------------------------------
-- SESSION_EVENTS — journal léger (audit / rejouabilité)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS interactive.session_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  session_id uuid NOT NULL REFERENCES interactive.sessions(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_int_events_session ON interactive.session_events(session_id);

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE interactive.tenants         ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactive.sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactive.session_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactive.session_events  ENABLE ROW LEVEL SECURITY;

-- TENANTS
DROP POLICY IF EXISTS "int_tenants_select" ON interactive.tenants;
CREATE POLICY "int_tenants_select" ON interactive.tenants
  FOR SELECT TO anon, authenticated USING (active = true);
DROP POLICY IF EXISTS "int_tenants_write" ON interactive.tenants;
CREATE POLICY "int_tenants_write" ON interactive.tenants
  FOR ALL TO authenticated USING (interactive.is_staff(id)) WITH CHECK (interactive.is_staff(id));

-- SESSIONS
DROP POLICY IF EXISTS "int_sessions_select" ON interactive.sessions;
CREATE POLICY "int_sessions_select" ON interactive.sessions
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "int_sessions_write" ON interactive.sessions;
CREATE POLICY "int_sessions_write" ON interactive.sessions
  FOR ALL TO authenticated USING (interactive.is_staff(tenant_id)) WITH CHECK (interactive.is_staff(tenant_id));

-- SESSION_PLAYERS
DROP POLICY IF EXISTS "int_players_select" ON interactive.session_players;
CREATE POLICY "int_players_select" ON interactive.session_players
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "int_players_join" ON interactive.session_players;
CREATE POLICY "int_players_join" ON interactive.session_players
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    score = 0
    AND length(pseudo) BETWEEN 1 AND 24
    AND EXISTS (SELECT 1 FROM interactive.sessions s WHERE s.id = session_id AND s.status = 'lobby')
  );
DROP POLICY IF EXISTS "int_players_staff" ON interactive.session_players;
CREATE POLICY "int_players_staff" ON interactive.session_players
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM interactive.sessions s WHERE s.id = session_id AND interactive.is_staff(s.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM interactive.sessions s WHERE s.id = session_id AND interactive.is_staff(s.tenant_id)));

-- SESSION_EVENTS
DROP POLICY IF EXISTS "int_events_select" ON interactive.session_events;
CREATE POLICY "int_events_select" ON interactive.session_events
  FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "int_events_staff" ON interactive.session_events;
CREATE POLICY "int_events_staff" ON interactive.session_events
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM interactive.sessions s WHERE s.id = session_id AND interactive.is_staff(s.tenant_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM interactive.sessions s WHERE s.id = session_id AND interactive.is_staff(s.tenant_id)));

-- GRANTs
GRANT SELECT ON interactive.tenants, interactive.sessions, interactive.session_players, interactive.session_events TO anon, authenticated;
GRANT INSERT ON interactive.session_players TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON interactive.tenants, interactive.sessions, interactive.session_players, interactive.session_events TO authenticated;

INSERT INTO shared.organizations (slug, name)
VALUES ('interactive', 'Velito Interactive')
ON CONFLICT (slug) DO NOTHING;

COMMIT;

SELECT table_name FROM information_schema.tables WHERE table_schema = 'interactive' ORDER BY table_name;
SELECT 'Interactive schema V1 (CDC v2 + correctifs review) OK' AS status;

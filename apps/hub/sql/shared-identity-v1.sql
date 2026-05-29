-- ============================================================================
-- VELITO — Socle "compte unique" : identité partagée (schéma shared) — 28/05/2026
-- Clé de voûte de l'écosystème (hub + vea + vena + interactive + arena + prevention)
-- ============================================================================
-- CONTEXTE (pour le dossier CDA) :
--   Toutes les apps Velito partagent UN SEUL projet Supabase. L'identité unique
--   repose donc sur `auth.users` (Supabase Auth) + un schéma `shared` qui porte
--   le profil transverse et les droits. Le "se connecter avec VENA" est la
--   façade UX d'un login central (hub.velito.fr) + cookie partagé sur .velito.fr.
--
-- ÉTAT EXISTANT (déjà en base live, créé lors de sessions précédentes) :
--   shared.users             — profil transverse (clé = auth.users.id)
--   shared.organizations     — entités (slugs: vea, vena, interactive, …)
--   shared.user_permissions  — droits (user_id, organization_id, scope owner/editor/viewer)
--   ⚠️ Ces 3 tables ne sont PAS encore versionnées dans le repo. Cette migration
--      est ADDITIVE (elle ne les redéfinit pas). Un dump complet "reverse" pourra
--      être ajouté séparément pour reproductibilité.
--
-- CE QUE CETTE MIGRATION AJOUTE (décisions validées avec Clavel) :
--   1. shared.users.origin_app  → le projet où l'user s'est inscrit en 1er.
--   2. shared.app_memberships   → 1 ligne par projet activé (qui utilise quoi).
--      => "les deux" : colonne origine rapide + table détaillée.
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS shared;
GRANT USAGE ON SCHEMA shared TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 1. Tag d'origine sur le profil transverse
-- ----------------------------------------------------------------------------
ALTER TABLE shared.users
  ADD COLUMN IF NOT EXISTS origin_app text;

COMMENT ON COLUMN shared.users.origin_app IS
  'Projet Velito où l''utilisateur s''est inscrit en premier (hub/vea/vena/interactive/arena/prevention).';

-- ----------------------------------------------------------------------------
-- 2. Appartenances aux apps (qui utilise quoi, depuis quand, à quel rôle)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared.app_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  app text NOT NULL CHECK (app IN (
    'hub','vea','vena','interactive','arena','prevention','morse','store'
  )),
  role text NOT NULL DEFAULT 'member',   -- member | staff | admin (sens propre à chaque app)
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, app)
);
CREATE INDEX IF NOT EXISTS idx_shared_memberships_user ON shared.app_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_memberships_app  ON shared.app_memberships(app);

COMMENT ON TABLE shared.app_memberships IS
  'Une ligne par (utilisateur, app Velito) activée. Permet : suivi cross-projet, '
  'savoir d''où vient un user, alimenter le dashboard des abonnés (ex. club Interactive).';

-- ----------------------------------------------------------------------------
-- 3. RLS : chacun voit/gère SES appartenances ; lecture élargie pour le futur
--    dashboard abonné se fera via des vues/fonctions dédiées (pas ici).
-- ----------------------------------------------------------------------------
ALTER TABLE shared.app_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "memberships_self_select" ON shared.app_memberships;
CREATE POLICY "memberships_self_select" ON shared.app_memberships
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "memberships_self_insert" ON shared.app_memberships;
CREATE POLICY "memberships_self_insert" ON shared.app_memberships
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "memberships_self_update" ON shared.app_memberships;
CREATE POLICY "memberships_self_update" ON shared.app_memberships
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON shared.app_memberships TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. Helper : enregistrer l'activation d'une app pour l'user courant.
--    Pose origin_app si c'est sa toute première app. Appelée par les apps au
--    1er login d'un user (server action). SECURITY DEFINER pour écrire le profil.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION shared.register_app_membership(p_app text, p_role text DEFAULT 'member')
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = shared, public
AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'non authentifié'; END IF;

  INSERT INTO shared.app_memberships (user_id, app, role)
  VALUES (v_uid, p_app, p_role)
  ON CONFLICT (user_id, app) DO NOTHING;

  -- origin_app = première app activée (ne change jamais ensuite)
  UPDATE shared.users
     SET origin_app = COALESCE(origin_app, p_app)
   WHERE id = v_uid;
END;
$$;

COMMIT;

-- ============================================================================
-- VERIF
-- ============================================================================
SELECT column_name FROM information_schema.columns
 WHERE table_schema='shared' AND table_name='users' AND column_name='origin_app';
SELECT 'shared identity v1 (origin_app + app_memberships) OK' AS status;

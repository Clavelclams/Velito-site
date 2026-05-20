-- ============================================================================
-- VENA — Module Contact / Demandes (20/05/2026)
-- ============================================================================
-- Objectif :
--   Permettre aux visiteurs du site vena.velito.com de soumettre une demande
--   de contact / devis pour les services VENA. Les demandes sont stockées
--   dans vena.demandes_contact pour traitement commercial.
--
-- Workflow :
--   1. Visiteur (anon) remplit le form sur /contact
--   2. Server Action submitContactAction INSERT dans la table
--      (RLS INSERT autorisé pour anon avec validation des champs requis)
--   3. Statut par défaut = 'nouveau'
--   4. Clavel reçoit la demande (V2 : email Resend + Notion CRM sync)
--
-- Permission :
--   - INSERT : anon (public) — formulaire de prospection
--   - SELECT / UPDATE / DELETE : owner Clavel (super-admin) uniquement.
--     On crée le schema vena s'il n'existe pas + une fonction is_vena_admin().
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Schema vena
-- ============================================================================
CREATE SCHEMA IF NOT EXISTS vena;
GRANT USAGE ON SCHEMA vena TO authenticated, anon;


-- ============================================================================
-- 2. Helper is_vena_admin()
-- ============================================================================
-- Retourne TRUE si l'user courant est owner sur l'org 'vena' dans shared.user_permissions.
-- Pour V1 c'est juste Clavel. Plus tard on pourra étendre à d'autres scopes.
CREATE OR REPLACE FUNCTION vena.is_vena_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = shared, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM shared.user_permissions up
    JOIN shared.organizations o ON o.id = up.organization_id
    WHERE up.user_id = auth.uid()
      AND o.slug = 'vena'
      AND up.scope IN ('owner', 'editor')
  );
$$;


-- ============================================================================
-- 3. TABLE vena.demandes_contact
-- ============================================================================
CREATE TABLE IF NOT EXISTS vena.demandes_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Statut commercial
  statut text NOT NULL DEFAULT 'nouveau' CHECK (statut IN (
    'nouveau',
    'en_cours',
    'devis_envoye',
    'gagne',
    'perdu',
    'spam'
  )),

  -- Identité demandeur
  prenom text NOT NULL,
  nom text NOT NULL,
  email text NOT NULL,
  telephone text,
  structure text,         -- entreprise / association / etc. (optionnel)
  fonction text,

  -- Besoin
  service_demande text NOT NULL CHECK (service_demande IN (
    'developpement_web',
    'production_video',
    'photo',
    'location_materiel',
    'formation',
    'conseil',
    'autre'
  )),
  budget_envisage text,
  delai text,
  message text NOT NULL,

  -- RGPD + suivi
  rgpd_consent boolean NOT NULL DEFAULT false,
  source_decouverte text,
  notes_internes text,
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_vena_demandes_statut ON vena.demandes_contact(statut);
CREATE INDEX IF NOT EXISTS idx_vena_demandes_created_at ON vena.demandes_contact(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vena_demandes_service ON vena.demandes_contact(service_demande);
CREATE INDEX IF NOT EXISTS idx_vena_demandes_email ON vena.demandes_contact(email);

COMMENT ON TABLE vena.demandes_contact IS
  'Demandes de contact / devis VENA via vena.velito.com/contact. INSERT public anon avec validation RGPD.';


-- ============================================================================
-- 4. RLS + GRANT
-- ============================================================================
ALTER TABLE vena.demandes_contact ENABLE ROW LEVEL SECURITY;

-- INSERT : anon peut soumettre, avec validation des champs essentiels
DROP POLICY IF EXISTS "vena_demandes_insert_public" ON vena.demandes_contact;
CREATE POLICY "vena_demandes_insert_public" ON vena.demandes_contact
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    rgpd_consent = TRUE
    AND length(prenom) > 0
    AND length(nom) > 0
    AND length(email) > 0
    AND length(message) > 0
    AND statut = 'nouveau'
  );

-- SELECT / UPDATE / DELETE : owner/editor vena uniquement
DROP POLICY IF EXISTS "vena_demandes_select_admin" ON vena.demandes_contact;
CREATE POLICY "vena_demandes_select_admin" ON vena.demandes_contact
  FOR SELECT TO authenticated
  USING (vena.is_vena_admin());

DROP POLICY IF EXISTS "vena_demandes_update_admin" ON vena.demandes_contact;
CREATE POLICY "vena_demandes_update_admin" ON vena.demandes_contact
  FOR UPDATE TO authenticated
  USING (vena.is_vena_admin())
  WITH CHECK (vena.is_vena_admin());

DROP POLICY IF EXISTS "vena_demandes_delete_admin" ON vena.demandes_contact;
CREATE POLICY "vena_demandes_delete_admin" ON vena.demandes_contact
  FOR DELETE TO authenticated
  USING (vena.is_vena_admin());

-- GRANT au niveau table
GRANT INSERT ON vena.demandes_contact TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON vena.demandes_contact TO authenticated;


-- ============================================================================
-- 5. Org 'vena' dans shared.organizations (idempotent)
-- ============================================================================
-- Permet à Clavel d'avoir un scope owner sur vena pour gérer les demandes.
INSERT INTO shared.organizations (slug, name)
VALUES ('vena', 'Velito Expertise Numérique Amiens')
ON CONFLICT (slug) DO NOTHING;


COMMIT;


-- ============================================================================
-- VERIF
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'vena' AND table_name = 'demandes_contact'
ORDER BY ordinal_position;

SELECT 'Module VENA Contact : schema + table + RLS OK' AS status;

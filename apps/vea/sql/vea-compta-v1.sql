-- ============================================================================
-- VEA — Module 3 Compta : transactions + scope treasurer + balance (20/05/2026)
-- ============================================================================
-- Objectif :
--   Permettre a Clavel + Maya + Christ de gerer la tresorerie VEA :
--   recettes (subventions, cotisations, prestations) et depenses (animations,
--   materiel, transports). Distinct du systeme Documents : un justificatif est
--   un Document, une transaction est une ligne comptable.
--
-- Architecture acces :
--   - Superadmin / editor vea : acces auto
--   - "treasurer" : extra scope dedie pour Maya + Christ (qui ne sont pas
--     editor vea sinon). Stocke dans shared.user_permissions.extra_scopes.
--
-- Schema :
--   - shared.user_permissions.extra_scopes : nouvelle colonne text[] pour les
--     scopes fonctionnels (treasurer, content, etc.)
--   - vea.compta_transactions : transactions comptables
--   - vea.is_vea_treasurer() : helper RLS
--   - vea.compta_balance_par_saison : vue agregee
--
-- A executer apres vea-documents-v1.sql (la FK document_id en depend).
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Extension scope : extra_scopes sur shared.user_permissions
-- ============================================================================
-- Cette colonne stocke les scopes fonctionnels au-dela de la hierarchie
-- owner/editor/viewer. Exemples : 'treasurer', 'content_manager', 'rh'.
ALTER TABLE shared.user_permissions
  ADD COLUMN IF NOT EXISTS extra_scopes text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN shared.user_permissions.extra_scopes IS
  'Scopes fonctionnels independants de la hierarchie owner/editor/viewer. Ex: treasurer pour la compta VEA, content pour la com.';


-- ============================================================================
-- 2. Helper is_vea_treasurer()
-- ============================================================================
-- Retourne TRUE si l user courant a soit owner/editor sur vea,
-- soit 'treasurer' dans extra_scopes sur vea.
CREATE OR REPLACE FUNCTION vea.is_vea_treasurer()
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
      AND o.slug = 'vea'
      AND (
        up.scope IN ('owner', 'editor')
        OR 'treasurer' = ANY(up.extra_scopes)
      )
  );
$$;


-- ============================================================================
-- 3. TABLE vea.compta_transactions
-- ============================================================================
CREATE TABLE IF NOT EXISTS vea.compta_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date_transaction date NOT NULL,
  type text NOT NULL CHECK (type IN ('recette', 'depense')),
  categorie text NOT NULL CHECK (categorie IN (
    'subvention',       -- subventions publiques / privees
    'cotisation',       -- adhesions / licences
    'prestation',       -- animations payees, interventions
    'don',              -- dons des partenaires ou particuliers
    'animation',        -- depenses animations / events
    'materiel',         -- achat materiel (PC, manettes, ecrans)
    'transport',        -- peages, essence, billets train
    'restauration',     -- repas reunions / events
    'communication',    -- impression, hebergement web, abonnements
    'frais_bancaires',  -- frais bancaires, virements internationaux
    'assurance',        -- assurances asso
    'autre'
  )),
  montant numeric(10, 2) NOT NULL CHECK (montant >= 0),
  description text NOT NULL,
  -- Justificatif lie (document upload via Module 1)
  document_id uuid REFERENCES vea.documents(id) ON DELETE SET NULL,
  statut text NOT NULL DEFAULT 'effectue' CHECK (statut IN ('planifie', 'effectue', 'annule')),
  saison text NOT NULL DEFAULT '2026/27',
  -- Audit : qui a saisi
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vea_compta_transactions_date ON vea.compta_transactions(date_transaction DESC);
CREATE INDEX IF NOT EXISTS idx_vea_compta_transactions_type ON vea.compta_transactions(type);
CREATE INDEX IF NOT EXISTS idx_vea_compta_transactions_categorie ON vea.compta_transactions(categorie);
CREATE INDEX IF NOT EXISTS idx_vea_compta_transactions_saison ON vea.compta_transactions(saison);
CREATE INDEX IF NOT EXISTS idx_vea_compta_transactions_statut ON vea.compta_transactions(statut);

COMMENT ON TABLE vea.compta_transactions IS
  'Transactions comptables VEA. Acces restreint aux owner/editor/treasurer. Visibilite via vue compta_balance_par_saison.';


-- ============================================================================
-- 4. RLS + GRANT
-- ============================================================================
ALTER TABLE vea.compta_transactions ENABLE ROW LEVEL SECURITY;

-- ALL pour treasurer/editor+ (le check fait tout)
DROP POLICY IF EXISTS "vea_compta_treasurer_all" ON vea.compta_transactions;
CREATE POLICY "vea_compta_treasurer_all" ON vea.compta_transactions
  FOR ALL TO authenticated
  USING (vea.is_vea_treasurer())
  WITH CHECK (vea.is_vea_treasurer());

GRANT SELECT, INSERT, UPDATE, DELETE ON vea.compta_transactions TO authenticated;


-- ============================================================================
-- 5. Vue agregee balance par saison + categorie
-- ============================================================================
CREATE OR REPLACE VIEW vea.compta_balance_par_saison AS
SELECT
  saison,
  COUNT(*) FILTER (WHERE statut = 'effectue') AS nb_transactions_effectuees,
  SUM(montant) FILTER (WHERE type = 'recette' AND statut = 'effectue') AS recettes,
  SUM(montant) FILTER (WHERE type = 'depense' AND statut = 'effectue') AS depenses,
  COALESCE(SUM(montant) FILTER (WHERE type = 'recette' AND statut = 'effectue'), 0)
    - COALESCE(SUM(montant) FILTER (WHERE type = 'depense' AND statut = 'effectue'), 0)
    AS solde,
  SUM(montant) FILTER (WHERE statut = 'planifie' AND type = 'recette') AS recettes_planifiees,
  SUM(montant) FILTER (WHERE statut = 'planifie' AND type = 'depense') AS depenses_planifiees
FROM vea.compta_transactions
GROUP BY saison
ORDER BY saison DESC;

COMMENT ON VIEW vea.compta_balance_par_saison IS
  'Balance comptable agregee par saison VEA. Sert pour le dashboard /admin/compta.';

-- ⚠️ SECURITE : force la vue en mode security_invoker (sinon, par defaut depuis
-- Postgres 15+, les vues s'executent en SECURITY DEFINER = avec les droits du
-- createur = superuser postgres, ce qui CONTOURNE la RLS de vea.compta_transactions.
-- Resultat sans cette ligne : n'importe quel authenticated peut lire les soldes
-- (alerte CRITICAL signalee par Supabase Advisor le 11/06/2026).
-- Avec security_invoker=on, la vue respecte les RLS de la table sous-jacente.
ALTER VIEW vea.compta_balance_par_saison SET (security_invoker = on);

-- GRANT sur la vue (la RLS de vea.compta_transactions filtre via security_invoker)
GRANT SELECT ON vea.compta_balance_par_saison TO authenticated;


-- ============================================================================
-- 6. Attribution scope treasurer (initial)
-- ============================================================================
-- Clavel (superadmin) a deja acces via scope=owner. Pas besoin de l ajouter.
-- Maya + Christ : ils n ont pas de compte VEA encore. Quand ils en creeront un,
-- il faudra executer (en remplacant <user_id>) :
--
--   INSERT INTO shared.user_permissions (user_id, organization_id, scope, extra_scopes)
--   SELECT
--     '<user_id_maya_ou_christ>',
--     o.id,
--     'viewer',  -- pas editor (pas les autres droits VEA), juste viewer + treasurer
--     ARRAY['treasurer']
--   FROM shared.organizations o
--   WHERE o.slug = 'vea'
--   ON CONFLICT (user_id, organization_id) DO UPDATE SET
--     extra_scopes = ARRAY['treasurer'];
--
-- A executer manuellement quand Maya et Christ se seront inscrits.


COMMIT;


-- ============================================================================
-- VERIF
-- ============================================================================
-- Check colonne extra_scopes
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'shared' AND table_name = 'user_permissions' AND column_name = 'extra_scopes';

-- Check fonction is_vea_treasurer
SELECT proname, prorettype::regtype AS returns
FROM pg_proc
WHERE pronamespace = 'vea'::regnamespace AND proname = 'is_vea_treasurer';

-- Check table + vue
SELECT 'Module 3 Compta : table + RLS + vue + scope treasurer OK' AS status;

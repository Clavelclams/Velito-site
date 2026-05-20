-- ============================================================================
-- VEA — Module Prestations / Devis (20/05/2026)
-- ============================================================================
-- Objectif :
--   Permettre aux collectivites / structures / entreprises de demander un
--   devis en ligne via /prestations. Les demandes sont stockees dans
--   vea.demandes_prestation et notifient les dirigeants pour traitement.
--
-- Workflow :
--   1. Visiteur (anon) remplit le form sur /prestations
--   2. Server Action submitDemandeDevisAction INSERT dans la table
--      (RLS INSERT autorise pour anon avec validation champs)
--   3. Statut par defaut = 'nouveau'
--   4. Les dirigeants VEA voient les demandes dans /admin/demandes (V2)
--   5. Changement statut + notes internes pour suivi commercial
--
-- Permission :
--   - INSERT : anon (public) — c'est un formulaire de prospection
--   - SELECT / UPDATE / DELETE : editor+ vea uniquement
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLE vea.demandes_prestation
-- ============================================================================
CREATE TABLE IF NOT EXISTS vea.demandes_prestation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Statut commercial
  statut text NOT NULL DEFAULT 'nouveau' CHECK (statut IN (
    'nouveau',        -- vient d'arriver, pas encore traite
    'en_cours',       -- VEA est en train de preparer le devis
    'devis_envoye',   -- devis envoye au demandeur
    'accepte',        -- demandeur a accepte le devis
    'refuse',         -- demandeur a refuse le devis
    'annule'          -- demande annulee (par le demandeur ou par VEA)
  )),

  -- Bloc 1 : structure et referent
  structure_nom text NOT NULL,
  structure_type text NOT NULL,
  referent_prenom text NOT NULL,
  referent_nom text NOT NULL,
  referent_fonction text,
  email text NOT NULL,
  telephone text NOT NULL,

  -- Bloc 2 : besoin
  prestations_demandees text[] NOT NULL,
  prestations_autre_precision text,
  pack_envisage text NOT NULL,
  date_souhaitee date NOT NULL,
  lieu_ville text NOT NULL,
  lieu_structure text,
  public_tranche_age text[],
  nombre_participants int NOT NULL CHECK (nombre_participants > 0),
  duree_heures int NOT NULL CHECK (duree_heures > 0),

  -- Bloc 3 : contexte
  budget_envisage text,
  source_decouverte text,
  precisions text,

  -- Bloc 4 : RGPD + audit
  rgpd_consent boolean NOT NULL DEFAULT false,
  notes_internes text,  -- usage admin VEA uniquement (pas affiche au demandeur)

  -- Champ utile pour suivi
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Indexes pour les queries admin frequentes
CREATE INDEX IF NOT EXISTS idx_vea_demandes_statut ON vea.demandes_prestation(statut);
CREATE INDEX IF NOT EXISTS idx_vea_demandes_created_at ON vea.demandes_prestation(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vea_demandes_date_souhaitee ON vea.demandes_prestation(date_souhaitee);
CREATE INDEX IF NOT EXISTS idx_vea_demandes_email ON vea.demandes_prestation(email);

COMMENT ON TABLE vea.demandes_prestation IS
  'Demandes de devis pour les prestations VEA. INSERT public via /prestations, SELECT/UPDATE reserve aux dirigeants.';


-- ============================================================================
-- 2. RLS + GRANT
-- ============================================================================
ALTER TABLE vea.demandes_prestation ENABLE ROW LEVEL SECURITY;

-- INSERT : public (anon) peut soumettre une demande, avec le check RGPD obligatoire
DROP POLICY IF EXISTS "vea_demandes_insert_public" ON vea.demandes_prestation;
CREATE POLICY "vea_demandes_insert_public" ON vea.demandes_prestation
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    rgpd_consent = TRUE
    AND length(structure_nom) > 0
    AND length(referent_prenom) > 0
    AND length(referent_nom) > 0
    AND length(email) > 0
    AND length(telephone) > 0
    AND array_length(prestations_demandees, 1) > 0
    AND nombre_participants > 0
    AND duree_heures > 0
    AND statut = 'nouveau'  -- pas de cheat : on ne peut pas INSERT un autre statut
  );

-- SELECT / UPDATE / DELETE : editor+ vea uniquement
DROP POLICY IF EXISTS "vea_demandes_select_editor" ON vea.demandes_prestation;
CREATE POLICY "vea_demandes_select_editor" ON vea.demandes_prestation
  FOR SELECT TO authenticated
  USING (vea.is_vea_editor());

DROP POLICY IF EXISTS "vea_demandes_update_editor" ON vea.demandes_prestation;
CREATE POLICY "vea_demandes_update_editor" ON vea.demandes_prestation
  FOR UPDATE TO authenticated
  USING (vea.is_vea_editor())
  WITH CHECK (vea.is_vea_editor());

DROP POLICY IF EXISTS "vea_demandes_delete_editor" ON vea.demandes_prestation;
CREATE POLICY "vea_demandes_delete_editor" ON vea.demandes_prestation
  FOR DELETE TO authenticated
  USING (vea.is_vea_editor());

-- GRANT au niveau table
-- INSERT pour anon ET authenticated (formulaire public)
GRANT INSERT ON vea.demandes_prestation TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON vea.demandes_prestation TO authenticated;


-- ============================================================================
-- 3. Trigger AFTER INSERT : notification cloche aux dirigeants
-- ============================================================================
-- Quand une demande arrive, notifier tous les editor+ vea via vea.notifications
-- pour qu'ils puissent reagir vite (le SLA promis est 48-72h).

CREATE OR REPLACE FUNCTION vea.notifier_nouvelle_demande_devis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vea, shared, public
AS $$
DECLARE
  v_message TEXT;
  v_admin RECORD;
BEGIN
  v_message := 'Nouvelle demande de devis : ' || NEW.structure_nom
    || ' (' || NEW.referent_prenom || ' ' || NEW.referent_nom || ')'
    || ' - pack ' || NEW.pack_envisage
    || ' pour le ' || to_char(NEW.date_souhaitee, 'DD/MM/YYYY')
    || ' a ' || NEW.lieu_ville || '. A traiter sous 48-72h.';

  FOR v_admin IN
    SELECT DISTINCT up.user_id
    FROM shared.user_permissions up
    JOIN shared.organizations o ON o.id = up.organization_id
    WHERE o.slug = 'vea'
      AND up.scope IN ('owner', 'editor')
      AND up.user_id IS NOT NULL
  LOOP
    INSERT INTO vea.notifications (user_id, message, lien, type)
    VALUES (v_admin.user_id, v_message, '/admin/demandes/' || NEW.id, 'devis');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vea_notifier_nouvelle_demande ON vea.demandes_prestation;
CREATE TRIGGER trg_vea_notifier_nouvelle_demande
AFTER INSERT ON vea.demandes_prestation
FOR EACH ROW
EXECUTE FUNCTION vea.notifier_nouvelle_demande_devis();


COMMIT;


-- ============================================================================
-- VERIF
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'vea' AND table_name = 'demandes_prestation'
ORDER BY ordinal_position;

SELECT 'Module Prestations : table + RLS + trigger OK' AS status;

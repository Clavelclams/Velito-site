-- ============================================================================
-- VEA — Module 2 Rapports / Reunions : table + RLS + notifs (20/05/2026)
-- ============================================================================
-- Objectif :
--   Gerer les documents officiels de gouvernance VEA :
--     - PV de CA (conseil d'administration)
--     - PV d'AG (assemblee generale)
--     - Convocations (CA, AG, reunion bureau)
--     - Rapport d'activite annuel
--     - CR de reunion (compte-rendu informel)
--
-- Workflow type :
--   1. Un dirigeant cree un brouillon via /admin/rapports/nouveau
--   2. Redige en Markdown, peut sauvegarder en brouillon
--   3. Quand pret, passe en statut 'valide' -> notif aux autres dirigeants
--   4. Quand publie (= visible publiquement ou archive), notif optionnelle
--
-- Distinct de vea.documents : un rapport est REDIGE dans le site (Markdown).
-- Un document est un fichier UPLOADE. Les 2 peuvent etre lies (rapport peut
-- avoir un PDF stocke en parallele du contenu Markdown).
--
-- Permission : editor+ sur vea.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLE vea.rapports
-- ============================================================================
CREATE TABLE IF NOT EXISTS vea.rapports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN (
    'PV_CA',              -- proces verbal CA
    'PV_AG',              -- proces verbal AG
    'convocation',        -- convocation reunion
    'rapport_activite',   -- rapport annuel d'activite
    'CR_reunion',         -- compte-rendu informel
    'autre'
  )),
  titre text NOT NULL,
  date_reunion date NOT NULL,
  -- Auteur du rapport (NOT NULL pour audit)
  redacteur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Contenu en Markdown (rendu cote app via marked ou react-markdown)
  contenu_markdown text NOT NULL DEFAULT '',
  -- Liste des participants presents a la reunion (uuid pointant vea.participants)
  participants_presents uuid[] DEFAULT '{}',
  -- Document PDF eventuel (genere ou uploade en parallele du Markdown)
  -- Pas une FK vers vea.documents : peut pointer vers un PDF stocke directement
  -- dans Storage bucket vea-rapports (a creer)
  pdf_storage_path text,
  statut text NOT NULL DEFAULT 'brouillon' CHECK (statut IN ('brouillon', 'valide', 'publie', 'archive')),
  -- Champs audit
  validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  validated_at timestamptz,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vea_rapports_type ON vea.rapports(type);
CREATE INDEX IF NOT EXISTS idx_vea_rapports_date ON vea.rapports(date_reunion DESC);
CREATE INDEX IF NOT EXISTS idx_vea_rapports_statut ON vea.rapports(statut);
CREATE INDEX IF NOT EXISTS idx_vea_rapports_redacteur ON vea.rapports(redacteur_id);

COMMENT ON TABLE vea.rapports IS
  'Documents officiels de gouvernance VEA (PV CA, PV AG, convocations, rapport d''activite). Redactor Markdown + statut brouillon/valide/publie.';


-- ============================================================================
-- 2. RLS + GRANT
-- ============================================================================
ALTER TABLE vea.rapports ENABLE ROW LEVEL SECURITY;

-- SELECT :
--   - editor+ voit tout
--   - le redacteur voit ses propres brouillons
--   - tout authenticated voit les rapports publies (pour la transparence asso)
DROP POLICY IF EXISTS "vea_rapports_select_smart" ON vea.rapports;
CREATE POLICY "vea_rapports_select_smart" ON vea.rapports
  FOR SELECT TO authenticated
  USING (
    statut = 'publie'
    OR redacteur_id = auth.uid()
    OR vea.is_vea_editor()
  );

-- INSERT / UPDATE / DELETE : editor+ uniquement
DROP POLICY IF EXISTS "vea_rapports_insert_editor" ON vea.rapports;
CREATE POLICY "vea_rapports_insert_editor" ON vea.rapports
  FOR INSERT TO authenticated
  WITH CHECK (vea.is_vea_editor() AND redacteur_id = auth.uid());

DROP POLICY IF EXISTS "vea_rapports_update_editor" ON vea.rapports;
CREATE POLICY "vea_rapports_update_editor" ON vea.rapports
  FOR UPDATE TO authenticated
  USING (vea.is_vea_editor())
  WITH CHECK (vea.is_vea_editor());

DROP POLICY IF EXISTS "vea_rapports_delete_editor" ON vea.rapports;
CREATE POLICY "vea_rapports_delete_editor" ON vea.rapports
  FOR DELETE TO authenticated
  USING (vea.is_vea_editor());

GRANT SELECT, INSERT, UPDATE, DELETE ON vea.rapports TO authenticated;


-- ============================================================================
-- 3. Trigger AFTER UPDATE statut : notif aux dirigeants
-- ============================================================================
-- Quand un rapport passe de brouillon a valide : notif tous les editor+
-- (sauf le redacteur).
-- Quand passe a publie : pas de notif particuliere V1 (V2 : notif publique).

CREATE OR REPLACE FUNCTION vea.notifier_validation_rapport()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vea, shared, public
AS $$
DECLARE
  v_redacteur_name TEXT;
  v_type_label TEXT;
  v_message TEXT;
  v_admin RECORD;
BEGIN
  -- On ne notifie que lors du passage de brouillon -> valide
  IF NEW.statut != 'valide' OR OLD.statut = 'valide' THEN
    RETURN NEW;
  END IF;

  -- Recup nom du redacteur
  SELECT COALESCE(u.prenom || ' ' || u.nom, u.email, 'Un dirigeant')
  INTO v_redacteur_name
  FROM shared.users u
  WHERE u.id = NEW.redacteur_id
  LIMIT 1;

  v_type_label := CASE NEW.type
    WHEN 'PV_CA' THEN 'un PV de CA'
    WHEN 'PV_AG' THEN 'un PV d''AG'
    WHEN 'convocation' THEN 'une convocation'
    WHEN 'rapport_activite' THEN 'un rapport d''activite'
    WHEN 'CR_reunion' THEN 'un CR de reunion'
    ELSE 'un rapport'
  END;

  v_message := v_redacteur_name || ' a valide ' || v_type_label || ' : "' || NEW.titre || '". A consulter / contresigner sur /admin/rapports/' || NEW.id;

  -- Notifier tous les editor+ vea sauf le redacteur
  FOR v_admin IN
    SELECT DISTINCT up.user_id
    FROM shared.user_permissions up
    JOIN shared.organizations o ON o.id = up.organization_id
    WHERE o.slug = 'vea'
      AND up.scope IN ('owner', 'editor')
      AND up.user_id IS NOT NULL
      AND up.user_id != NEW.redacteur_id
  LOOP
    INSERT INTO vea.notifications (user_id, message, lien, type)
    VALUES (v_admin.user_id, v_message, '/admin/rapports/' || NEW.id, 'rapport');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vea_notifier_validation_rapport ON vea.rapports;
CREATE TRIGGER trg_vea_notifier_validation_rapport
AFTER UPDATE OF statut ON vea.rapports
FOR EACH ROW
EXECUTE FUNCTION vea.notifier_validation_rapport();


COMMIT;


-- ============================================================================
-- VERIF
-- ============================================================================
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'vea' AND table_name = 'rapports'
ORDER BY ordinal_position;

SELECT 'Module 2 Rapports : table + RLS + trigger OK' AS status;

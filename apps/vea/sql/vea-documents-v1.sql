-- ============================================================================
-- VEA — Module 1 Documents : table + storage + RLS (20/05/2026)
-- ============================================================================
-- Objectif :
--   Permettre aux membres VEA d'uploader des documents (tickets, factures,
--   justificatifs, peages, contrats, courriers) avec notification automatique
--   aux dirigeants pour validation.
--
-- Schema :
--   - vea.documents       : metadata des fichiers stockes
--   - Storage bucket      : vea-documents (cree manuellement via Supabase UI
--                            avant d'executer ce SQL, sinon erreur)
--
-- Workflow :
--   1. Maya uploade un ticket Game Cash via /admin/documents/nouveau
--   2. INSERT dans vea.documents (uploader_id=Maya, participant_id=Maya, statut=en_attente)
--   3. Trigger AFTER INSERT cree une notif pour tous les editor+ vea
--   4. Un dirigeant ouvre /admin/documents/[id], voit le doc, click "Valider"
--   5. UPDATE statut=valide, notif retour a Maya
--
-- Pre-requis :
--   - Bucket Storage 'vea-documents' (prive) cree dans Supabase Dashboard
--   - vea.notifications doit exister (cf vea-cloche-notifications.sql)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. TABLE vea.documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS vea.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  type text NOT NULL CHECK (type IN (
    'ticket',         -- ticket de caisse, recu
    'facture',        -- facture fournisseur
    'justificatif',   -- justificatif depense
    'peage',          -- ticket peage / transport
    'courrier',       -- courrier officiel (prefecture, etc.)
    'contrat',        -- contrat / convention
    'autre'
  )),
  -- Personne concernee par le doc (auteur depense, signataire convention).
  -- NULL si le doc concerne l'asso en general (courrier prefecture, etc.).
  participant_id uuid REFERENCES vea.participants(id) ON DELETE SET NULL,
  -- L'utilisateur qui a uploade le fichier (NOT NULL pour audit).
  uploader_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Chemin dans Supabase Storage (bucket vea-documents). Format :
  -- "<uploader_id>/<timestamp>-<nom_sanitized>.<ext>"
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  taille_octets integer NOT NULL CHECK (taille_octets > 0),
  description text,
  statut text NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'valide', 'rejete', 'archive')),
  -- Qui a valide/rejete (pour audit)
  reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  motif_rejet text, -- rempli uniquement si statut=rejete
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vea_documents_participant ON vea.documents(participant_id);
CREATE INDEX IF NOT EXISTS idx_vea_documents_uploader ON vea.documents(uploader_id);
CREATE INDEX IF NOT EXISTS idx_vea_documents_type ON vea.documents(type);
CREATE INDEX IF NOT EXISTS idx_vea_documents_statut ON vea.documents(statut);
CREATE INDEX IF NOT EXISTS idx_vea_documents_created_at ON vea.documents(created_at DESC);

COMMENT ON TABLE vea.documents IS
  'Documents uploades par les membres (tickets, factures, justificatifs, contrats, etc.). Validation par les dirigeants.';


-- ============================================================================
-- 2. RLS + GRANT
-- ============================================================================
ALTER TABLE vea.documents ENABLE ROW LEVEL SECURITY;

-- SELECT : l'uploader voit ses propres docs, l'editor+ voit tout
DROP POLICY IF EXISTS "vea_documents_select_own_or_editor" ON vea.documents;
CREATE POLICY "vea_documents_select_own_or_editor" ON vea.documents
  FOR SELECT TO authenticated
  USING (
    uploader_id = auth.uid()
    OR vea.is_vea_editor()
  );

-- INSERT : tout authenticated peut uploader
DROP POLICY IF EXISTS "vea_documents_insert_self" ON vea.documents;
CREATE POLICY "vea_documents_insert_self" ON vea.documents
  FOR INSERT TO authenticated
  WITH CHECK (uploader_id = auth.uid());

-- UPDATE : seul l'editor+ peut valider/rejeter (l'uploader peut pas modifier
-- son doc une fois envoye, sauf description et nom tant que statut=en_attente)
DROP POLICY IF EXISTS "vea_documents_update_editor" ON vea.documents;
CREATE POLICY "vea_documents_update_editor" ON vea.documents
  FOR UPDATE TO authenticated
  USING (vea.is_vea_editor())
  WITH CHECK (vea.is_vea_editor());

-- DELETE : seul l'editor+ (mais le trigger BEFORE DELETE devrait aussi
-- supprimer le fichier de Storage -- pas geré ici, à faire cote app)
DROP POLICY IF EXISTS "vea_documents_delete_editor" ON vea.documents;
CREATE POLICY "vea_documents_delete_editor" ON vea.documents
  FOR DELETE TO authenticated
  USING (vea.is_vea_editor());

-- GRANT au niveau table
GRANT SELECT, INSERT ON vea.documents TO authenticated;
GRANT UPDATE, DELETE ON vea.documents TO authenticated;


-- ============================================================================
-- 3. Trigger AFTER INSERT : notification cloche aux dirigeants
-- ============================================================================
-- Quand un doc est uploade, notifier tous les editor+ vea via vea.notifications
-- pour qu'ils puissent valider rapidement.

CREATE OR REPLACE FUNCTION vea.notifier_nouveau_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vea, shared, public
AS $$
DECLARE
  v_uploader_name TEXT;
  v_participant_name TEXT;
  v_type_label TEXT;
  v_message TEXT;
  v_admin RECORD;
BEGIN
  -- Recup nom de l'uploader
  SELECT COALESCE(u.prenom || ' ' || u.nom, u.email, 'Quelqu''un')
  INTO v_uploader_name
  FROM shared.users u
  WHERE u.id = NEW.uploader_id
  LIMIT 1;

  -- Recup nom du participant concerne (si renseigne)
  IF NEW.participant_id IS NOT NULL THEN
    SELECT prenom || ' ' || nom
    INTO v_participant_name
    FROM vea.participants
    WHERE id = NEW.participant_id;
  END IF;

  -- Label lisible du type
  v_type_label := CASE NEW.type
    WHEN 'ticket' THEN 'ticket'
    WHEN 'facture' THEN 'facture'
    WHEN 'justificatif' THEN 'justificatif'
    WHEN 'peage' THEN 'ticket de peage'
    WHEN 'courrier' THEN 'courrier'
    WHEN 'contrat' THEN 'contrat'
    ELSE 'document'
  END;

  -- Construire le message
  v_message := v_uploader_name || ' a depose un ' || v_type_label || ' "' || NEW.nom || '"';
  IF v_participant_name IS NOT NULL THEN
    v_message := v_message || ' (concerne ' || v_participant_name || ')';
  END IF;
  v_message := v_message || '. A valider sur /admin/documents/' || NEW.id;

  -- Notifier tous les editor+ vea (sauf l'uploader lui-meme s'il est editor)
  FOR v_admin IN
    SELECT DISTINCT up.user_id
    FROM shared.user_permissions up
    JOIN shared.organizations o ON o.id = up.organization_id
    WHERE o.slug = 'vea'
      AND up.scope IN ('owner', 'editor')
      AND up.user_id IS NOT NULL
      AND up.user_id != NEW.uploader_id
  LOOP
    INSERT INTO vea.notifications (user_id, message, lien, type)
    VALUES (v_admin.user_id, v_message, '/admin/documents/' || NEW.id, 'document');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vea_notifier_nouveau_document ON vea.documents;
CREATE TRIGGER trg_vea_notifier_nouveau_document
AFTER INSERT ON vea.documents
FOR EACH ROW
EXECUTE FUNCTION vea.notifier_nouveau_document();


-- ============================================================================
-- 4. Trigger AFTER UPDATE statut : notifier l'uploader de la decision
-- ============================================================================
CREATE OR REPLACE FUNCTION vea.notifier_validation_document()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vea, shared, public
AS $$
DECLARE
  v_reviewer_name TEXT;
  v_message TEXT;
BEGIN
  -- Si statut n'a pas change ou l'uploader n'est pas connu, on sort
  IF OLD.statut = NEW.statut OR NEW.uploader_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Recup nom du reviewer
  SELECT COALESCE(u.prenom || ' ' || u.nom, u.email, 'Un dirigeant')
  INTO v_reviewer_name
  FROM shared.users u
  WHERE u.id = NEW.reviewer_id
  LIMIT 1;

  -- Message selon statut
  IF NEW.statut = 'valide' THEN
    v_message := v_reviewer_name || ' a VALIDE ton document "' || NEW.nom || '". OK pour traitement.';
  ELSIF NEW.statut = 'rejete' THEN
    v_message := v_reviewer_name || ' a REJETE ton document "' || NEW.nom || '". Motif : ' || COALESCE(NEW.motif_rejet, 'non precise');
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO vea.notifications (user_id, message, lien, type)
  VALUES (NEW.uploader_id, v_message, '/admin/documents/' || NEW.id, 'document');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vea_notifier_validation_document ON vea.documents;
CREATE TRIGGER trg_vea_notifier_validation_document
AFTER UPDATE OF statut ON vea.documents
FOR EACH ROW
EXECUTE FUNCTION vea.notifier_validation_document();


COMMIT;


-- ============================================================================
-- POST-COMMIT : Storage bucket setup (a executer manuellement)
-- ============================================================================
-- Le bucket Storage doit etre cree via Supabase Dashboard ou via cette commande :
--   INSERT INTO storage.buckets (id, name, public)
--   VALUES ('vea-documents', 'vea-documents', false)
--   ON CONFLICT (id) DO NOTHING;
--
-- Policies storage :
--   1. SELECT : authenticated peut voir ses propres fichiers (chemin = uploader_id/...) + editor+ peut voir tout
--   2. INSERT : authenticated peut uploader dans son propre dossier (uploader_id/...)
--   3. DELETE : editor+ peut supprimer
--
-- Pour le SELECT/INSERT, le chemin du fichier convention :
--   <user_id>/<timestamp>-<filename>.<ext>
--
-- Policies a appliquer dans Supabase Dashboard > Storage > Policies :
--   "vea_documents_storage_select" : authenticated, USING (bucket_id = 'vea-documents' AND (
--     (storage.foldername(name))[1] = auth.uid()::text
--     OR vea.is_vea_editor()
--   ))
--   "vea_documents_storage_insert" : authenticated, WITH CHECK (
--     bucket_id = 'vea-documents' AND (storage.foldername(name))[1] = auth.uid()::text
--   )
--   "vea_documents_storage_delete" : authenticated, USING (
--     bucket_id = 'vea-documents' AND vea.is_vea_editor()
--   )

-- ============================================================================
-- VERIF
-- ============================================================================
SELECT
  c.column_name,
  c.data_type,
  c.is_nullable
FROM information_schema.columns c
WHERE c.table_schema = 'vea' AND c.table_name = 'documents'
ORDER BY c.ordinal_position;

SELECT 'Module 1 Documents : table + RLS + triggers OK' AS status;

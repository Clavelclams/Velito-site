-- ============================================================================
-- VEA — Saisie des présences par un bénévole + champs pré-inscrit (28/10/2026)
-- ============================================================================
-- Ce que fait ce fichier :
--   1. Droit fonctionnel "presences" (même mécanique que "treasurer",
--      shared.user_permissions.extra_scopes) + fonction SQL
--      vea.can_manage_presences() = editor/owner OU extra_scope 'presences'.
--   2. Règles RLS pour ce droit, et SEULEMENT pour ça :
--        - lire les participants (recherche), en créer (pré-inscrits) ;
--        - lire / ajouter / retirer des présences ;
--        - écrire les points liés à une présence (jouer / aider / regarder),
--          jamais des points "à la main" (admin_manuel, urgent, podium) ;
--        - lire la trace des retraits (vea.presences_archive).
--      Rien d'autre : finances, devis, documents, rapports gardent leurs
--      règles editor/treasurer.
--   3. Ferme une règle trop ouverte : vea_presences_insert_public
--      (n'importe quel visiteur pouvait créer une présence pour n'importe qui).
--      Le scan invité passe par la RPC register_preinscrit_scan (SECURITY
--      DEFINER) et le scan connecté par vea_presences_insert_own : ils
--      continuent de marcher sans cette règle.
--   4. Colonnes participants.annee_naissance et participants.quartier
--      (création rapide d'un pré-inscrit sur place, sans date complète).
--
-- Ce qui existait déjà et qu'on réutilise (constaté le 28/10 en base) :
--   - Une seule présence par personne et par événement :
--     UNIQUE (participant_id, event_slug).
--   - Points : chaque présence a sa ligne vea.logs_xp ; le trigger
--     trg_logs_xp_apply ajoute les points, et un retrait (DELETE presence ->
--     CASCADE logs_xp) déclenche recalc_participant_xp.
--   - Trace : qui a ajouté = presences.scanned_by + horodatage ; qui a retiré =
--     vea.presences_archive (archived_by, archived_at) via le trigger
--     trigger_presences_archive. Pas de nouvelle table de journal.
--
-- À exécuter : Supabase > SQL Editor, en une fois. Section DOWN en bas.
-- ============================================================================

BEGIN;

-- 1. Fonction de droit -------------------------------------------------------
CREATE OR REPLACE FUNCTION vea.can_manage_presences()
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
        up.scope IN ('editor', 'owner')
        OR 'presences' = ANY (coalesce(up.extra_scopes, '{}'))
      )
  );
$$;
REVOKE EXECUTE ON FUNCTION vea.can_manage_presences() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION vea.can_manage_presences() TO authenticated;


-- 2. Colonnes pré-inscrit ----------------------------------------------------
ALTER TABLE vea.participants
  ADD COLUMN IF NOT EXISTS annee_naissance smallint,
  ADD COLUMN IF NOT EXISTS quartier text;
ALTER TABLE vea.participants DROP CONSTRAINT IF EXISTS participants_annee_naissance_check;
ALTER TABLE vea.participants
  ADD CONSTRAINT participants_annee_naissance_check
  CHECK (annee_naissance IS NULL OR annee_naissance BETWEEN 1900 AND 2100);
ALTER TABLE vea.participants DROP CONSTRAINT IF EXISTS participants_quartier_check;
ALTER TABLE vea.participants
  ADD CONSTRAINT participants_quartier_check
  CHECK (quartier IS NULL OR char_length(quartier) <= 80);


-- 3. RLS ---------------------------------------------------------------------
-- participants : lecture pour la recherche. L'INSERT est déjà ouvert
-- (vea_participants_insert_public, check = true) : non modifié ici, à
-- resserrer dans un lot dédié (voir note en bas).
DROP POLICY IF EXISTS "vea_participants_presences_select" ON vea.participants;
CREATE POLICY "vea_participants_presences_select" ON vea.participants
  FOR SELECT TO authenticated
  USING (vea.can_manage_presences());

-- presences : tout pour le droit présences ; fermeture de l'insert public.
DROP POLICY IF EXISTS "vea_presences_insert_public" ON vea.presences;
DROP POLICY IF EXISTS "vea_presences_presences_all" ON vea.presences;
CREATE POLICY "vea_presences_presences_all" ON vea.presences
  FOR ALL TO authenticated
  USING (vea.can_manage_presences())
  WITH CHECK (vea.can_manage_presences());

-- logs_xp : seulement les points LIÉS À UNE PRÉSENCE, aux montants du barème.
DROP POLICY IF EXISTS "vea_logs_xp_presences_select" ON vea.logs_xp;
CREATE POLICY "vea_logs_xp_presences_select" ON vea.logs_xp
  FOR SELECT TO authenticated
  USING (vea.can_manage_presences());
DROP POLICY IF EXISTS "vea_logs_xp_presences_insert" ON vea.logs_xp;
CREATE POLICY "vea_logs_xp_presences_insert" ON vea.logs_xp
  FOR INSERT TO authenticated
  WITH CHECK (
    vea.can_manage_presences()
    AND presence_id IS NOT NULL
    AND (
      (action = 'tournoi' AND xp_gagne = 10)
      OR (action = 'spectateur' AND xp_gagne = 2)
      OR (action = 'benevolat' AND xp_gagne BETWEEN 8 AND 360) -- 0,5 h à 24 h x 15
    )
  );
-- Pas de DELETE direct sur logs_xp : un retrait supprime la présence, et
-- la ligne de points part en cascade (FK presence_id ON DELETE CASCADE).

-- presences_archive : lecture de la trace des retraits.
ALTER TABLE vea.presences_archive ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vea_presences_archive_select" ON vea.presences_archive;
CREATE POLICY "vea_presences_archive_select" ON vea.presences_archive
  FOR SELECT TO authenticated
  USING (vea.can_manage_presences());
GRANT SELECT ON vea.presences_archive TO authenticated;

COMMIT;


-- ============================================================================
-- DONNER LE DROIT À UNE BÉNÉVOLE (à lancer séparément, une fois son compte
-- créé ET son email confirmé). Remplace l'email. Ne touche pas un compte qui
-- est déjà editor/owner (il a déjà tout).
-- ============================================================================
-- DO $$
-- DECLARE v_user uuid; v_org uuid;
-- BEGIN
--   SELECT id INTO v_user FROM auth.users WHERE lower(email) = lower('yaminamaghraoui.rr80@gmail.com');
--   SELECT id INTO v_org FROM shared.organizations WHERE slug = 'vea';
--   IF v_user IS NULL THEN RAISE EXCEPTION 'Aucun compte avec cet email'; END IF;
--   -- user_permissions.user_id pointe vers shared.users (créé à l'inscription, même id)
--   IF NOT EXISTS (SELECT 1 FROM shared.users WHERE id = v_user) THEN
--     RAISE EXCEPTION 'Compte sans profil shared.users : inscription incomplète'; END IF;
--   UPDATE shared.user_permissions
--      SET extra_scopes = (SELECT array_agg(DISTINCT s) FROM unnest(coalesce(extra_scopes, '{}') || '{presences}') s)
--    WHERE user_id = v_user AND organization_id = v_org;
--   IF NOT FOUND THEN
--     INSERT INTO shared.user_permissions (user_id, organization_id, scope, extra_scopes)
--     VALUES (v_user, v_org, 'viewer', '{presences}');
--   END IF;
-- END $$;
--
-- RETIRER LE DROIT :
-- UPDATE shared.user_permissions up SET extra_scopes = array_remove(up.extra_scopes, 'presences')
-- FROM auth.users u, shared.organizations o
-- WHERE u.id = up.user_id AND o.id = up.organization_id AND o.slug = 'vea'
--   AND lower(u.email) = lower('yaminamaghraoui.rr80@gmail.com');


-- ============================================================================
-- NOTE : règle encore trop ouverte, non traitée ici (lot à part)
--   vea_participants_insert_public (anon, check = true) : n'importe qui peut
--   créer une fiche participant. Utilisé par quoi exactement ? À vérifier avant
--   de la fermer (inscription, agenda, scan passent normalement par des
--   fonctions SECURITY DEFINER).
-- ============================================================================


-- ============================================================================
-- DOWN
-- ============================================================================
-- DROP POLICY IF EXISTS "vea_presences_archive_select" ON vea.presences_archive;
-- DROP POLICY IF EXISTS "vea_logs_xp_presences_insert" ON vea.logs_xp;
-- DROP POLICY IF EXISTS "vea_logs_xp_presences_select" ON vea.logs_xp;
-- DROP POLICY IF EXISTS "vea_presences_presences_all" ON vea.presences;
-- CREATE POLICY "vea_presences_insert_public" ON vea.presences
--   FOR INSERT TO anon, authenticated WITH CHECK (true);
-- DROP POLICY IF EXISTS "vea_participants_presences_select" ON vea.participants;
-- ALTER TABLE vea.participants DROP CONSTRAINT IF EXISTS participants_quartier_check;
-- ALTER TABLE vea.participants DROP CONSTRAINT IF EXISTS participants_annee_naissance_check;
-- ALTER TABLE vea.participants DROP COLUMN IF EXISTS quartier, DROP COLUMN IF EXISTS annee_naissance;
-- DROP FUNCTION IF EXISTS vea.can_manage_presences();
-- (presences_archive : laisser RLS activée, elle n'est lue que par l'admin.)

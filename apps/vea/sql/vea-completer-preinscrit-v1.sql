-- ============================================================================
-- VEA — Compléter la fiche d'un pré-inscrit depuis la fiche événement (28/10/2026)
-- ============================================================================
-- Pourquoi une fonction et pas une règle RLS UPDATE :
--   vea.participants n'a pas de règle UPDATE pour l'admin (chacun modifie sa
--   propre fiche). Ouvrir un UPDATE général aux bénévoles leur permettrait de
--   modifier n'importe quelle colonne (rôle, points, compte...). La fonction
--   ci-dessous ne touche QUE prénom, nom, sexe, année de naissance, quartier et
--   téléphone, et REFUSE toute fiche liée à un compte (user_id non nul) : un
--   membre inscrit gère sa fiche lui-même sur /profil.
--   Même principe que vea.admin_set_participant_sexe (vea-admin-set-sexe-v1.sql).
--
-- Le téléphone sert à la fusion automatique à l'inscription
-- (trigger zz_merge_preinscrit_by_phone : téléphone + prénom + nom).
-- À exécuter : Supabase > SQL Editor > Run. Relançable.
-- ============================================================================

CREATE OR REPLACE FUNCTION vea.completer_preinscrit(
  p_id uuid,
  p_prenom text,
  p_nom text,
  p_sexe text,
  p_annee integer,
  p_quartier text,
  p_phone text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vea, public
AS $$
DECLARE
  v_user uuid;
  v_prenom text := trim(coalesce(p_prenom, ''));
  v_nom text := trim(coalesce(p_nom, ''));
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\s', '', 'g'), '');
  v_quartier text := nullif(trim(coalesce(p_quartier, '')), '');
BEGIN
  IF NOT vea.can_manage_presences() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Permission refusée.');
  END IF;

  SELECT user_id INTO v_user FROM vea.participants WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fiche introuvable.');
  END IF;
  IF v_user IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cette personne a un compte : elle complète sa fiche elle-même sur son profil.');
  END IF;

  IF char_length(v_prenom) < 2 OR char_length(v_prenom) > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prénom : 2 à 100 caractères.');
  END IF;
  IF char_length(v_nom) < 2 OR char_length(v_nom) > 100 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nom : 2 à 100 caractères (« À compléter » si inconnu).');
  END IF;
  IF p_sexe IS NOT NULL AND p_sexe NOT IN ('F', 'M', 'X') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sexe invalide.');
  END IF;
  IF p_annee IS NOT NULL AND (p_annee < 1900 OR p_annee > extract(year from current_date)::int) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Année de naissance invalide.');
  END IF;
  IF v_quartier IS NOT NULL AND char_length(v_quartier) > 80 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quartier : 80 caractères maximum.');
  END IF;
  IF v_phone IS NOT NULL AND v_phone !~ '^\+?[0-9]{8,15}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Téléphone invalide (chiffres uniquement, 8 minimum).');
  END IF;

  UPDATE vea.participants
     SET prenom = v_prenom,
         nom = v_nom,
         sexe = p_sexe,
         annee_naissance = p_annee,
         quartier = v_quartier,
         phone = v_phone,
         -- Mineur si l'âge atteint cette année est < 18 (sans date exacte).
         est_mineur = CASE WHEN p_annee IS NULL THEN est_mineur
                           ELSE extract(year from current_date)::int - p_annee < 18 END
   WHERE id = p_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION vea.completer_preinscrit(uuid, text, text, text, integer, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION vea.completer_preinscrit(uuid, text, text, text, integer, text, text) TO authenticated;

-- Vérification
SELECT to_regprocedure('vea.completer_preinscrit(uuid, text, text, text, integer, text, text)') IS NOT NULL AS fonction_ok;

-- DOWN
-- DROP FUNCTION IF EXISTS vea.completer_preinscrit(uuid, text, text, text, integer, text, text);

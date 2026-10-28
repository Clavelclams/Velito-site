-- ============================================================================
-- VEA — Candidatures de stage dans le circuit des demandes (16/10/2026)
-- ============================================================================
-- Objectif :
--   La page publique /stages enregistre les candidatures dans la MÊME table
--   que les devis (vea.demandes_prestation), avec type = 'stage'. L'admin
--   /admin/demandes affiche les deux, avec les mêmes statuts.
--
-- Ce que fait ce fichier :
--   1. Colonne `type` ('devis' par défaut : les lignes existantes ne changent pas)
--      + colonnes propres au stage.
--   2. Les colonnes "devis" deviennent nullable, MAIS une contrainte CHECK
--      les rend toujours obligatoires quand type = 'devis'. Un devis a donc
--      exactement les mêmes garanties qu'avant.
--   3. Policy INSERT public réécrite : un cas devis, un cas stage.
--   4. Trigger de notification réécrit (titre selon le type). La version en
--      prod avait été corrigée à la main le 21/05 (voir
--      vea-fix-notifications-link_url.sql) ; ce fichier la remplace et la
--      versionne enfin en entier.
--   5. RGPD : suppression automatique des candidatures de plus de 12 mois,
--      tous les jours à 3h via pg_cron.
--
-- À EXÉCUTER : éditeur SQL Supabase, en une fois (BEGIN/COMMIT).
-- Retour arrière : section DOWN en bas du fichier.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Colonnes
-- ============================================================================
ALTER TABLE vea.demandes_prestation
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'devis',
  ADD COLUMN IF NOT EXISTS etablissement text,          -- lycée / collège du candidat
  ADD COLUMN IF NOT EXISTS formation text,              -- ex : "Bac Pro CIEL, 1re"
  ADD COLUMN IF NOT EXISTS stage_debut date,
  ADD COLUMN IF NOT EXISTS stage_fin date,
  ADD COLUMN IF NOT EXISTS motivation text,
  ADD COLUMN IF NOT EXISTS mineur boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_parent text,
  -- Calculé par le serveur à l'envoi, d'après lib/stages.config.ts.
  -- Sert uniquement à repérer vite les dates déjà prises dans l'admin.
  ADD COLUMN IF NOT EXISTS chevauche_periode_prise boolean NOT NULL DEFAULT false;

ALTER TABLE vea.demandes_prestation
  DROP CONSTRAINT IF EXISTS demandes_type_check;
ALTER TABLE vea.demandes_prestation
  ADD CONSTRAINT demandes_type_check CHECK (type IN ('devis', 'stage'));

-- Les champs propres au devis ne sont plus obligatoires pour TOUTES les lignes...
ALTER TABLE vea.demandes_prestation
  ALTER COLUMN structure_nom DROP NOT NULL,
  ALTER COLUMN structure_type DROP NOT NULL,
  ALTER COLUMN prestations_demandees DROP NOT NULL,
  ALTER COLUMN pack_envisage DROP NOT NULL,
  ALTER COLUMN date_souhaitee DROP NOT NULL,
  ALTER COLUMN lieu_ville DROP NOT NULL,
  ALTER COLUMN nombre_participants DROP NOT NULL,
  ALTER COLUMN duree_heures DROP NOT NULL;

-- ... mais restent obligatoires pour un devis, et chaque type a ses champs requis.
ALTER TABLE vea.demandes_prestation
  DROP CONSTRAINT IF EXISTS demandes_champs_par_type;
ALTER TABLE vea.demandes_prestation
  ADD CONSTRAINT demandes_champs_par_type CHECK (
    (
      type = 'devis'
      AND structure_nom IS NOT NULL
      AND structure_type IS NOT NULL
      AND prestations_demandees IS NOT NULL
      AND pack_envisage IS NOT NULL
      AND date_souhaitee IS NOT NULL
      AND lieu_ville IS NOT NULL
      AND nombre_participants IS NOT NULL
      AND duree_heures IS NOT NULL
    )
    OR (
      type = 'stage'
      AND etablissement IS NOT NULL
      AND formation IS NOT NULL
      AND stage_debut IS NOT NULL
      AND stage_fin IS NOT NULL
      AND stage_fin >= stage_debut
      AND (mineur = false OR email_parent IS NOT NULL)
    )
  );

CREATE INDEX IF NOT EXISTS idx_vea_demandes_type ON vea.demandes_prestation(type);


-- ============================================================================
-- 2. Policy INSERT public : un cas par type
-- ============================================================================
DROP POLICY IF EXISTS "vea_demandes_insert_public" ON vea.demandes_prestation;
CREATE POLICY "vea_demandes_insert_public" ON vea.demandes_prestation
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    rgpd_consent = TRUE
    AND statut = 'nouveau'          -- impossible d'insérer un autre statut
    AND notes_internes IS NULL      -- les notes sont réservées à l'admin
    AND length(referent_prenom) > 0
    AND length(referent_nom) > 0
    AND length(email) > 0
    AND length(telephone) > 0
    AND (
      (
        type = 'devis'
        AND length(structure_nom) > 0
        AND array_length(prestations_demandees, 1) > 0
        AND nombre_participants > 0
        AND duree_heures > 0
      )
      OR (
        type = 'stage'
        AND length(etablissement) > 0
        AND length(formation) > 0
      )
    )
  );
-- SELECT / UPDATE / DELETE : policies editor+ inchangées (vea-prestations-v1.sql).


-- ============================================================================
-- 3. Trigger de notification (version complète, remplace celle du 21/05)
-- ============================================================================
-- Colonnes réelles de vea.notifications : user_id, titre (NOT NULL),
-- type (NOT NULL), message, link_url.
-- Le `type` de notification reste 'devis' pour les deux : on ne sait pas si
-- vea.notifications a une contrainte sur ses valeurs, et une valeur refusée
-- ferait échouer TOUTE la candidature (même piège que le bug du 21/05).
CREATE OR REPLACE FUNCTION vea.notifier_nouvelle_demande_devis()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vea, shared, public
AS $$
DECLARE
  v_titre TEXT;
  v_message TEXT;
  v_admin RECORD;
BEGIN
  IF NEW.type = 'stage' THEN
    v_titre := 'Nouvelle candidature de stage';
    v_message := 'Candidature de stage : ' || NEW.referent_prenom || ' ' || NEW.referent_nom
      || ' (' || coalesce(NEW.formation, '?') || ', ' || coalesce(NEW.etablissement, '?') || ')'
      || ' du ' || to_char(NEW.stage_debut, 'DD/MM/YYYY')
      || ' au ' || to_char(NEW.stage_fin, 'DD/MM/YYYY')
      || CASE WHEN NEW.chevauche_periode_prise THEN '. Attention : période déjà prise.' ELSE '.' END;
  ELSE
    v_titre := 'Nouvelle demande de devis';
    v_message := 'Nouvelle demande de devis : ' || NEW.structure_nom
      || ' (' || NEW.referent_prenom || ' ' || NEW.referent_nom || ')'
      || ' - pack ' || NEW.pack_envisage
      || ' pour le ' || to_char(NEW.date_souhaitee, 'DD/MM/YYYY')
      || ' a ' || NEW.lieu_ville || '. A traiter sous 48-72h.';
  END IF;

  FOR v_admin IN
    SELECT DISTINCT up.user_id
    FROM shared.user_permissions up
    JOIN shared.organizations o ON o.id = up.organization_id
    WHERE o.slug = 'vea'
      AND up.scope IN ('owner', 'editor')
      AND up.user_id IS NOT NULL
  LOOP
    INSERT INTO vea.notifications (user_id, titre, message, link_url, type)
    VALUES (v_admin.user_id, v_titre, v_message, '/admin/demandes/' || NEW.id, 'devis');
  END LOOP;

  RETURN NEW;
END;
$$;
-- Le trigger trg_vea_notifier_nouvelle_demande existe déjà et appelle cette
-- fonction : CREATE OR REPLACE suffit, pas besoin de le recréer.


-- ============================================================================
-- 4. RGPD : candidatures de stage supprimées après 12 mois
-- ============================================================================
CREATE OR REPLACE FUNCTION vea.purger_candidatures_stage()
RETURNS integer
LANGUAGE sql
AS $$
  WITH supprimees AS (
    DELETE FROM vea.demandes_prestation
    WHERE type = 'stage'
      AND created_at < now() - interval '12 months'
    RETURNING 1
  )
  SELECT count(*)::integer FROM supprimees;
$$;

-- Par défaut, Postgres donne le droit d'EXÉCUTER une fonction à tout le monde
-- (PUBLIC). Si le schéma vea est exposé par l'API, n'importe quel visiteur
-- pourrait l'appeler. On retire ce droit : seul pg_cron (postgres) la lance.
REVOKE EXECUTE ON FUNCTION vea.purger_candidatures_stage() FROM PUBLIC, anon, authenticated;

COMMIT;


-- ============================================================================
-- 5. Planification pg_cron (hors transaction)
-- ============================================================================
-- Si l'extension n'est pas activée : Supabase > Database > Extensions >
-- pg_cron > Enable, OU la ligne ci-dessous.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- Tous les jours à 3h (UTC). Quotidien plutôt que mensuel : avec une purge
-- par mois, une candidature pourrait rester jusqu'à 13 mois, au-delà de ce
-- qu'annonce la page. cron.schedule avec un nom existant remplace le job.
SELECT cron.schedule(
  'vea-purge-candidatures-stage',
  '0 3 * * *',
  $$SELECT vea.purger_candidatures_stage()$$
);


-- ============================================================================
-- VÉRIF
-- ============================================================================
SELECT type, count(*) FROM vea.demandes_prestation GROUP BY type;
SELECT jobname, schedule, command FROM cron.job WHERE jobname = 'vea-purge-candidatures-stage';


-- ============================================================================
-- DOWN (retour arrière) — à exécuter seulement si besoin, APRÈS avoir
-- supprimé ou archivé les candidatures de stage (sinon les SET NOT NULL
-- échouent, ce qui est voulu : on ne perd rien sans le décider).
-- ============================================================================
-- SELECT cron.unschedule('vea-purge-candidatures-stage');
-- DROP FUNCTION IF EXISTS vea.purger_candidatures_stage();
-- DELETE FROM vea.demandes_prestation WHERE type = 'stage';
-- ALTER TABLE vea.demandes_prestation DROP CONSTRAINT IF EXISTS demandes_champs_par_type;
-- ALTER TABLE vea.demandes_prestation
--   ALTER COLUMN structure_nom SET NOT NULL, ALTER COLUMN structure_type SET NOT NULL,
--   ALTER COLUMN prestations_demandees SET NOT NULL, ALTER COLUMN pack_envisage SET NOT NULL,
--   ALTER COLUMN date_souhaitee SET NOT NULL, ALTER COLUMN lieu_ville SET NOT NULL,
--   ALTER COLUMN nombre_participants SET NOT NULL, ALTER COLUMN duree_heures SET NOT NULL;
-- ALTER TABLE vea.demandes_prestation DROP CONSTRAINT IF EXISTS demandes_type_check;
-- DROP INDEX IF EXISTS vea.idx_vea_demandes_type;
-- ALTER TABLE vea.demandes_prestation
--   DROP COLUMN IF EXISTS chevauche_periode_prise, DROP COLUMN IF EXISTS email_parent,
--   DROP COLUMN IF EXISTS mineur, DROP COLUMN IF EXISTS motivation,
--   DROP COLUMN IF EXISTS stage_fin, DROP COLUMN IF EXISTS stage_debut,
--   DROP COLUMN IF EXISTS formation, DROP COLUMN IF EXISTS etablissement,
--   DROP COLUMN IF EXISTS type;
-- Puis rejouer la section 2 (policy) et 3 (fonction) de vea-prestations-v1.sql
-- dans leur version corrigée du 21/05.

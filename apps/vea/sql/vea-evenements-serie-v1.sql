-- ============================================================================
-- VEA — Séries d'événements (séances récurrentes) (28/10/2026)
-- ============================================================================
-- 1. Colonne evenements.serie : identifiant commun aux séances d'une même
--    série (ex. 'mercredi-elbeuf'). NULL pour un événement ponctuel.
--    Sert à regrouper les séances sur l'agenda public (une carte par série).
-- 2. Rattache les Mercredis Elbeuf existants (mai-juin et sept-déc 2026).
-- 3. Notification « Nouvel event » : pour une série, seule la PREMIÈRE séance
--    (la plus tôt) notifie les membres. Sans ça, créer 10 séances enverrait
--    10 notifications. Le reste de la fonction est inchangé (version lue en
--    base le 28/10).
--    Le trigger AFTER INSERT voit toutes les lignes insérées par la même
--    requête : la séance la plus tôt n'a pas de séance antérieure, elle seule
--    notifie. Ajouter plus tard des séances à une série existante ne notifie pas.
-- À exécuter AVANT de déployer le code (le formulaire écrit la colonne serie).
-- ============================================================================

BEGIN;

ALTER TABLE vea.evenements ADD COLUMN IF NOT EXISTS serie text;
CREATE INDEX IF NOT EXISTS idx_vea_evenements_serie ON vea.evenements(serie);

UPDATE vea.evenements
   SET serie = 'mercredi-elbeuf'
 WHERE serie IS NULL
   AND (event_slug LIKE 'mercredi-elbeuf-%' OR event_slug = 'elbeuf-gaming');

CREATE OR REPLACE FUNCTION vea.fn_notify_new_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'vea', 'public', 'auth'
AS $function$
DECLARE
  v_date_str TEXT;
BEGIN
  -- Seuls les events FUTURS et NON ANNULES generent une notif
  IF NEW.date < CURRENT_DATE OR NEW.statut = 'annule' THEN
    RETURN NEW;
  END IF;

  -- [28/10/2026] Série : une seule notification, pour la première séance.
  IF NEW.serie IS NOT NULL AND EXISTS (
    SELECT 1 FROM vea.evenements e
    WHERE e.serie = NEW.serie AND e.id <> NEW.id AND e.date < NEW.date
  ) THEN
    RETURN NEW;
  END IF;

  v_date_str := to_char(NEW.date, 'DD/MM/YYYY');

  -- Notif pour chaque participant ayant notif_events_active = true
  -- ET qui a un compte (user_id NOT NULL, donc pas pre-inscrits)
  INSERT INTO vea.notifications (user_id, type, titre, message, link_url, metadata)
  SELECT p.user_id, 'event_new', 'Nouvel event : ' || NEW.nom,
         v_date_str || ' · ' || NEW.lieu, '/agenda',
         jsonb_build_object('event_slug', NEW.event_slug, 'event_id', NEW.id)
  FROM vea.participants p
  WHERE p.user_id IS NOT NULL AND p.notif_events_active = TRUE;

  RETURN NEW;
END;
$function$;

COMMIT;

SELECT serie, count(*) AS seances FROM vea.evenements WHERE serie IS NOT NULL GROUP BY serie;

-- DOWN
-- UPDATE vea.evenements SET serie = NULL;  -- puis remettre l'ancienne fonction
-- (même corps sans le bloc « Série »), puis :
-- ALTER TABLE vea.evenements DROP COLUMN IF EXISTS serie;

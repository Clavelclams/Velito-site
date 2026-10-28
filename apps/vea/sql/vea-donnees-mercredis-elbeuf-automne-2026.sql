-- ============================================================================
-- VEA — Mercredis Elbeuf, automne 2026 : une séance par mercredi (28/10/2026)
-- ============================================================================
-- Pourquoi une ligne par mercredi (et pas un seul événement « récurrent ») :
--   une présence = une personne sur UN événement (contrainte UNIQUE
--   participant_id + event_slug). Avec un seul événement pour tout le
--   trimestre, un jeune ne pourrait être compté qu'une fois et ne gagnerait
--   ses points qu'une fois. C'est déjà le modèle des Mercredis de mai-juin
--   (mercredi-elbeuf-20-05-2026, ...).
--
-- Calendrier (académie d'Amiens, zone B) :
--   - reprise le 23/09 (ligne existante « elbeuf-gaming », renommée) ;
--   - pas de séance pendant les vacances de la Toussaint (17/10 au 02/11) :
--     21/10 et 28/10 exclus ;
--   - 11/11 exclu : jour férié (Armistice) ;
--   - dernière séance le 16/12 (vacances de Noël à partir du 19/12).
--
-- Les séances passées (30/09, 07/10, 14/10) sont créées en « terminé », scan
-- fermé : les présents s'ajoutent à la main depuis la fiche de la séance.
-- Le trigger de notification est coupé le temps de l'insertion, sinon chaque
-- séance future enverrait une notification « Nouvel event » aux membres.
-- Relançable : ON CONFLICT DO NOTHING.
-- ============================================================================

BEGIN;

ALTER TABLE vea.evenements DISABLE TRIGGER trigger_notify_new_event;

UPDATE vea.evenements
   SET nom = 'Mercredi Elbeuf 23/09/2026'
 WHERE event_slug = 'elbeuf-gaming';

INSERT INTO vea.evenements
  (nom, event_slug, date, heure, lieu, type, statut, scan_actif, duree_estimee_heures,
   description, partenaires)
SELECT
  'Mercredi Elbeuf ' || to_char(d, 'DD/MM/YYYY'),
  'mercredi-elbeuf-' || to_char(d, 'DD-MM-YYYY'),
  d, '16:30', 'Elbeuf, Amiens', 'programme',
  CASE WHEN d < current_date THEN 'termine' ELSE 'a_venir' END,
  d >= current_date,
  2,
  'Animation du mercredi au service jeunesse d''Elbeuf : jeux vidéo et accompagnement.',
  '{Service jeunesse d''Elbeuf}'
FROM unnest(ARRAY[
  DATE '2026-09-30', DATE '2026-10-07', DATE '2026-10-14',
  DATE '2026-11-04', DATE '2026-11-18', DATE '2026-11-25',
  DATE '2026-12-02', DATE '2026-12-09', DATE '2026-12-16'
]) AS d
ON CONFLICT (event_slug) DO NOTHING;

ALTER TABLE vea.evenements ENABLE TRIGGER trigger_notify_new_event;

COMMIT;

-- Vérification : 10 séances de septembre à décembre
SELECT count(*) AS seances,
       string_agg(to_char(date, 'DD/MM') || ' ' || statut, ', ' ORDER BY date) AS liste
FROM vea.evenements
WHERE nom LIKE 'Mercredi Elbeuf%' AND date >= DATE '2026-09-01';

-- DOWN
-- DELETE FROM vea.evenements WHERE event_slug LIKE 'mercredi-elbeuf-%-2026'
--   AND date BETWEEN DATE '2026-09-30' AND DATE '2026-12-16';
-- UPDATE vea.evenements SET nom = 'Mercredi Elbeuf' WHERE event_slug = 'elbeuf-gaming';

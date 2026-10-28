-- ============================================================================
-- VEA — Événements de février à novembre 2026 + colonne partenaires
-- ============================================================================
-- [28/10/2026] À lancer APRÈS vea-presences-benevole-v1.sql.
-- Supabase > SQL Editor > Run. Relançable : un événement déjà présent est mis
-- à jour (texte, lieu, heure, partenaires), jamais créé deux fois.
--
-- Choix (validés par Clavel le 28/10) :
--   - Tous les événements dans vea.evenements (une seule source, modifiable
--     depuis l'admin). INTERCUP et Parcours du Cœur sortent de
--     lib/events-archive.ts pour ne pas apparaître deux fois sur /agenda.
--   - Partenaires dans une nouvelle colonne evenements.partenaires (liste).
--   - Aucun chiffre inventé : seuls ceux donnés par Clavel sont saisis.
--   - Événements passés : statut 'termine', scan désactivé, pas de notification
--     (le trigger fn_notify_new_event ignore les dates passées).
--   - Bilan public activé avec le texte, pour la page /agenda/<slug> (avec
--     emplacements photo vides tant qu'il n'y a pas de galerie).
--
-- À vérifier (signalé dans la conversation) :
--   - Rec en action juillet : pas de date précise, saisi au 01/07/2026.
--   - INTERCUP : l'archive disait 28/02, ton message dit 22/02 (22/02 retenu).
-- ============================================================================

BEGIN;

ALTER TABLE vea.evenements
  ADD COLUMN IF NOT EXISTS partenaires text[] NOT NULL DEFAULT '{}';

INSERT INTO vea.evenements
  (nom, event_slug, date, heure, lieu, type, statut, scan_actif, description, partenaires,
   bilan_public, bilan_recap, bilan_nb_total, bilan_show_total, bilan_show_genre,
   bilan_show_joueurs, bilan_show_spectateurs)
VALUES
-- Octobre 2026 --------------------------------------------------------------
('VEA au centre sportif féminin de la MABB, vacances de la Toussaint', 'mabb-centre-feminin-toussaint-2026', DATE '2026-10-26', '10h00 - 16h00',
 'Centre sportif féminin de la MABB, Étouvie, Amiens', 'programme', 'en_cours', false,
 'Du lundi 26 au vendredi 30 octobre, de 10 h à 16 h, les bénévoles de VEA accompagnent le stage des vacances au centre sportif féminin de la MABB à Étouvie. Encadrement du stage et aide aux devoirs.',
 '{Amiens Métropole Basket Ball (MABB)}', false, NULL, NULL, false, false, false, false),

('Animation jeux vidéo à La Pléiade', 'pleiade-ufolep-2026-10-27', DATE '2026-10-27', '14h00 - 17h00',
 'La Pléiade, Amiens Nord', 'animation', 'termine', false,
 'Après-midi jeux vidéo à La Pléiade, à Amiens Nord, avec l''UFOLEP. Une trentaine d''enfants ont joué ensemble de 14 h à 17 h.',
 '{UFOLEP}', true,
 'Après-midi jeux vidéo à La Pléiade, à Amiens Nord, avec l''UFOLEP. Une trentaine d''enfants ont joué ensemble de 14 h à 17 h.',
 NULL, false, false, false, false),

-- Septembre 2026 : la ligne "Mercredi Elbeuf" du 23/09 existe déjà (mise à jour plus bas).

-- Juillet 2026 ----------------------------------------------------------------
('Soirée jeux vidéo pour le CCAS EDF', 'ccas-edf-vieille-ecole-2026-07-26', DATE '2026-07-26', NULL,
 'La Vieille École, Saint-Sauveur', 'animation', 'termine', false,
 'Soirée jeux vidéo organisée par VEA pour le CCAS EDF, à La Vieille École de Saint-Sauveur.',
 '{CCAS EDF}', true,
 'Soirée jeux vidéo organisée par VEA pour le CCAS EDF, à La Vieille École de Saint-Sauveur.',
 NULL, false, false, false, false),

('Rec en action, juillet 2026', 'rec-en-action-csc-etouvie-2026-07', DATE '2026-07-01', NULL,
 'Centre social et culturel d''Étouvie, Amiens', 'programme', 'termine', false,
 'En juillet, l''APSL 80 et VEA ont co-porté Rec en action au centre social et culturel d''Étouvie. Une quinzaine de jeunes chaque jour, et 28 joueurs au tournoi de clôture.',
 '{APSL 80,Centre social et culturel d''Étouvie}', true,
 'En juillet, l''APSL 80 et VEA ont co-porté Rec en action au centre social et culturel d''Étouvie. Une quinzaine de jeunes chaque jour, et 28 joueurs au tournoi de clôture.',
 NULL, false, false, false, false),

-- Mai 2026 -------------------------------------------------------------------
('Soirée VEA au Moxy Amiens', 'soiree-moxy-2026-05-26', DATE '2026-05-26', NULL,
 'Moxy Amiens', 'animation', 'termine', false,
 'Soirée VEA au Moxy Amiens.',
 '{Moxy Amiens}', true, 'Soirée VEA au Moxy Amiens.',
 NULL, false, false, false, false),

('Parcours du Cœur à Saint-Just-en-Chaussée', 'parcours-du-coeur-saint-just-2026', DATE '2026-05-04', NULL,
 'Saint-Just-en-Chaussée', 'animation', 'termine', false,
 'Stand prévention numérique et esport au Parcours du Cœur de Saint-Just-en-Chaussée. 150 participants sont passés par le stand de VEA.',
 '{}', true,
 'Stand prévention numérique et esport au Parcours du Cœur de Saint-Just-en-Chaussée. 150 participants sont passés par le stand de VEA.',
 150, true, false, false, false),

-- Avril 2026 -----------------------------------------------------------------
('Stages Rec en action, avril 2026', 'rec-en-action-2026-04', DATE '2026-04-13', NULL,
 'Amiens', 'programme', 'termine', false,
 'Stages Rec en action avec l''APSL 80, pendant les vacances de printemps. 20 participants.',
 '{APSL 80}', true,
 'Stages Rec en action avec l''APSL 80, pendant les vacances de printemps. 20 participants.',
 20, true, false, false, false),

-- Mars 2026 ------------------------------------------------------------------
('Amiens Roule dans ses Quartiers : Happy Eid', 'amiens-roule-happy-eid-2026', DATE '2026-03-01', NULL,
 'Amiens', 'animation', 'termine', false,
 'VEA à Amiens Roule dans ses Quartiers pour le Happy Eid, avec Jeunesse en Or. 40 participants.',
 '{Jeunesse en Or}', true,
 'VEA à Amiens Roule dans ses Quartiers pour le Happy Eid, avec Jeunesse en Or. 40 participants.',
 40, true, false, false, false),

-- Février 2026 ---------------------------------------------------------------
('INTERCUP 2026 : Top 8 France', 'intercup-2026', DATE '2026-02-22', NULL,
 'Courbevoie', 'tournoi', 'termine', false,
 'VEA à l''INTERCUP 2026 à Courbevoie : l''équipe termine dans le Top 8 France.',
 '{}', true,
 'VEA à l''INTERCUP 2026 à Courbevoie : l''équipe termine dans le Top 8 France.',
 NULL, false, false, false, false),

('Open Gym 100 % féminin avec la MABB', 'open-gym-feminin-mabb-2026-02', DATE '2026-02-01', NULL,
 'Étouvie, Amiens', 'animation', 'termine', false,
 'Open Gym 100 % féminin organisé avec la MABB à Étouvie. 30 participantes.',
 '{Amiens Métropole Basket Ball (MABB)}', true,
 'Open Gym 100 % féminin organisé avec la MABB à Étouvie. 30 participantes.',
 30, true, false, false, false)
ON CONFLICT (event_slug) DO UPDATE SET
  nom = EXCLUDED.nom, date = EXCLUDED.date, heure = EXCLUDED.heure, lieu = EXCLUDED.lieu,
  description = EXCLUDED.description, partenaires = EXCLUDED.partenaires,
  bilan_recap = EXCLUDED.bilan_recap, bilan_nb_total = EXCLUDED.bilan_nb_total;

-- Just Dance Party (créée par vea-donnees-just-dance-party-2026-10-26.sql) : partenaires + bilan public.
UPDATE vea.evenements
   SET bilan_public = true,
       bilan_recap = description,
       bilan_show_total = true, bilan_show_genre = true,
       bilan_show_joueurs = false, bilan_show_spectateurs = false
 WHERE event_slug = 'just-dance-party-4-ans-vea-2026';

-- Mercredi Elbeuf du 23/09 (déjà en base) : texte de reprise.
UPDATE vea.evenements
   SET description = 'Reprise des animations du mercredi au service jeunesse d''Elbeuf.',
       partenaires = '{Service jeunesse d''Elbeuf}'
 WHERE nom = 'Mercredi Elbeuf' AND date = DATE '2026-09-23';

-- « En route vers l'emploi » du 17/11 (déjà en base) = le Stade vers l'Emploi.
-- Mise à jour de la ligne existante (son QR et ses pré-inscriptions restent).
-- Pas d'INSERT : un nouvel événement futur enverrait une notification
-- « Nouvel event » à tous les membres abonnés (trigger fn_notify_new_event).
UPDATE vea.evenements
   SET nom = 'Stade vers l''Emploi : atelier Overcooked 2',
       description = 'Avec l''APSL 80 et France Travail, VEA anime un atelier Overcooked 2 pendant le Stade vers l''Emploi. Un jeu coopératif où il faut s''organiser, communiquer et se répartir les tâches : les mêmes compétences qu''au travail.',
       partenaires = '{APSL 80,France Travail}'
 WHERE nom IN ('En route vers l''emploi', 'Stade vers l''Emploi : atelier Overcooked 2')
   AND date = DATE '2026-11-17';

-- Pléiade 27/10 : Clavel en aide 3 h (14h-17h) = 45 points. Jody : à ajouter
-- depuis la fiche de l'événement (fiche à retrouver).
DO $$
DECLARE v_pid uuid; v_n int; v_presence uuid;
BEGIN
  SELECT count(*), min(id::text)::uuid INTO v_n, v_pid
  FROM vea.participants WHERE id::text LIKE '20c7a1ee%';
  IF v_n <> 1 THEN RAISE EXCEPTION 'Fiche de Clavel introuvable ou ambiguë'; END IF;
  INSERT INTO vea.presences (participant_id, event_slug, motif, heures_aide)
  VALUES (v_pid, 'pleiade-ufolep-2026-10-27', 'aider', 3)
  ON CONFLICT (participant_id, event_slug) DO NOTHING
  RETURNING id INTO v_presence;
  IF v_presence IS NOT NULL THEN
    INSERT INTO vea.logs_xp (participant_id, action, xp_gagne, description, presence_id)
    VALUES (v_pid, 'benevolat', 45, 'Animation La Pléiade avec l''UFOLEP (aider, 3 h)', v_presence);
  END IF;
END $$;

COMMIT;

-- Vérification
SELECT date, nom, heure, statut, partenaires, bilan_public
FROM vea.evenements
WHERE date >= DATE '2026-02-01'
ORDER BY date DESC;

-- DOWN : supprimer les lignes créées ici (les présences liées partent en cascade)
-- DELETE FROM vea.evenements WHERE event_slug IN ('mabb-centre-feminin-toussaint-2026',
--   'pleiade-ufolep-2026-10-27','ccas-edf-vieille-ecole-2026-07-26','rec-en-action-csc-etouvie-2026-07',
--   'soiree-moxy-2026-05-26','parcours-du-coeur-saint-just-2026','rec-en-action-2026-04',
--   'amiens-roule-happy-eid-2026','intercup-2026','open-gym-feminin-mabb-2026-02');
-- ALTER TABLE vea.evenements DROP COLUMN IF EXISTS partenaires;

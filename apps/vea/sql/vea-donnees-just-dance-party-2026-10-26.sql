-- ============================================================================
-- VEA — Données : Just Dance Party du 26/10/2026 (4 ans de VEA)
-- ============================================================================
-- [28/10/2026] À lancer APRÈS sql/vea-presences-benevole-v1.sql (il faut les
-- colonnes annee_naissance / quartier). Supabase > SQL Editor > Run.
-- Peut être relancé sans risque : rien n'est créé deux fois.
--
-- Ce que ça fait :
--   1. Crée l'événement (passé, scan désactivé : aucune notification envoyée,
--      le trigger fn_notify_new_event ignore les dates passées).
--   2. Rattache les 39 personnes (Miguel = Miguel Lopes, confirmé le 28/10).
--      - fiches existantes : identifiées par le début de leur id (vérifié le
--        28/10 en base, une seule fiche doit correspondre, sinon arrêt) ;
--      - doublons en base : on prend la fiche la plus complète (compte, sinon
--        celle qui a déjà des présences) ; la fusion se fera à part ;
--      - personnes sans fiche : créées en pré-inscrit (prénom, nom ou
--        « À compléter », sexe d'après ta liste filles / garçons).
--   3. Points : règle existante. jouer = 10 ; aider = 15 pts/h x 7 h = 105
--      (Oumayma, Yamina, Alia, Alban : organisation). Affiché 19h-22h, mais
--      l'équipe est restée jusqu'à 2 h du matin : 7 h d'aide (19 h à 2 h).
--      Si le script a déjà tourné avec 3 h, la présence « aider » est refaite
--      à 7 h (retrait + ajout : le total de points est recalculé par la base). Une seule présence par
--      personne (contrainte de la base), donc les organisateurs ne cumulent
--      pas « jouer ».
--   4. Bilan éditorial de l'événement : 39 participants, 21 filles, 18 garçons
--      (chiffres de ton message ; bilan_public reste à false, tu le publies
--      depuis l'admin quand le texte te va).
-- ============================================================================

BEGIN;

INSERT INTO vea.evenements (nom, event_slug, date, heure, lieu, type, statut, scan_actif,
  duree_estimee_heures, description, bilan_nb_total, bilan_nb_filles, bilan_nb_garcons)
VALUES (
  'Just Dance Party : les 4 ans de VEA',
  'just-dance-party-4-ans-vea-2026',
  DATE '2026-10-26',
  '19h00 - 22h00',
  'Salle des fêtes d''Étouvie, Amiens',
  'tournoi', 'termine', false, 3,
  'Pour ses 4 ans, Velito Esport Amiens a organisé une Just Dance Party à la salle des fêtes d''Étouvie : un tournoi par équipes de 4, ouvert à toutes et à tous. 39 participants, dont 21 filles.',
  39, 21, 18
)
ON CONFLICT (event_slug) DO UPDATE SET heure = EXCLUDED.heure;

DO $$
DECLARE
  r RECORD;
  v_pid uuid;
  v_n int;
  v_presence uuid;
  v_xp int;
  v_action text;
  v_heures numeric;
  c_slug constant text := 'just-dance-party-4-ans-vea-2026';
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- prenom, nom, sexe, motif, debut d'id si la fiche existe (sinon null)
      ('Nina','Maugard','F','jouer','983ab77e'),
      ('Alia','Millier Lahmari','F','aider','9fb39767'),
      ('Oumayma','Ben Salah','F','aider','88e20b6c'),
      ('Farah','Ben Salah','F','jouer',null),
      ('Hadjar','Bedrouni','F','jouer','492d881e'),          -- doublon 4c0742d0 laissé de côté
      ('Sœur de Hadjar','À compléter','F','jouer',null),
      ('Yamina','Maghraoui','F','aider','71923871'),
      ('Sœur de Yamina','À compléter','F','jouer',null),
      ('Sounkamba','Sano','F','jouer','6ed80681'),
      ('Genaba','Sano','F','jouer','714802da'),             -- fiche en sexe M : à vérifier
      ('Pandora','Eziorah','F','jouer','167bc057'),
      ('Aya','El Hamdaoui','F','jouer','0a6382cd'),
      ('Maïssa','Guelfat','F','jouer','2351cbb0'),
      ('Chaïnez','Guelfat','F','jouer','b490a5cb'),
      ('Asma','Guelfat','F','jouer',null),
      ('Amie d''Asma','À compléter','F','jouer',null),
      ('Aïcha','Bouabdallah','F','jouer','f836f468'),       -- doublon e2c73844 laissé de côté
      ('Rec-Préfi','Milapie','F','jouer',null),
      ('Cler-Mirice','Milapie','F','jouer','9c2c3ce1'),
      ('Mélissane','À compléter','F','jouer',null),
      ('Annah','Daoudi','F','jouer','4582aab4'),
      ('Clavel','Ndema Moussa','M','jouer','20c7a1ee'),     -- ton compte ; 2 pré-inscrits en double
      ('Berstelien','Milapie','M','jouer','137c0522'),
      ('Celyan','Ait Hamou','M','jouer','7769d802'),
      ('Issam','Ait Hamou','M','jouer',null),
      ('Alban','Thierry','M','aider','4f6e33d6'),
      ('Tony','Tagoe','M','jouer','8caed3db'),              -- doublon 71e8e878 laissé de côté
      ('Lény','Coulpied','M','jouer','72997d22'),           -- doublon da1d7170 laissé de côté
      ('Max','Reinert','M','jouer',null),
      ('Miguel','Lopes','M','jouer','ef77dd99'),
      ('Aloïs','Bondjokwe','M','jouer','7b8f76f1'),
      ('Neil','À compléter','M','jouer',null),
      ('Maxence','À compléter','M','jouer',null),
      ('Iless','À compléter','M','jouer',null),
      ('Amin','Guelfat','M','jouer',null),
      ('Jeune de 14 ans','À compléter','M','jouer',null),
      ('Arthur','Fossier','M','jouer','b8fb0af6'),
      ('Gavin','À compléter','M','jouer',null),
      ('Timéo','À compléter','M','jouer',null)
    ) AS t(prenom, nom, sexe, motif, id_debut)
  LOOP
    v_pid := NULL;

    IF r.id_debut IS NOT NULL THEN
      SELECT count(*), min(id::text)::uuid INTO v_n, v_pid
      FROM vea.participants WHERE id::text LIKE r.id_debut || '%';
      IF v_n <> 1 THEN
        RAISE EXCEPTION 'Fiche % % : % correspondance(s) pour %, arrêt (rien n''est enregistré).', r.prenom, r.nom, v_n, r.id_debut;
      END IF;
    ELSE
      -- Relance du script : réutilise la fiche créée la première fois.
      SELECT id INTO v_pid FROM vea.participants
      WHERE lower(prenom) = lower(r.prenom) AND lower(nom) = lower(r.nom) AND pre_inscrit
      ORDER BY created_at LIMIT 1;
      IF v_pid IS NULL THEN
        INSERT INTO vea.participants (prenom, nom, sexe, pre_inscrit, est_mineur)
        VALUES (r.prenom, r.nom, r.sexe, true, r.prenom = 'Jeune de 14 ans')
        RETURNING id INTO v_pid;
        RAISE NOTICE 'Fiche créée : % %', r.prenom, r.nom;
      END IF;
    END IF;

    IF r.motif = 'aider' THEN v_heures := 7; v_xp := 105; v_action := 'benevolat';
    ELSE v_heures := 0; v_xp := 10; v_action := 'tournoi';
    END IF;

    -- Relance après la 1re version (3 h) : on refait la présence à 7 h.
    DELETE FROM vea.presences
    WHERE participant_id = v_pid AND event_slug = c_slug
      AND motif = 'aider' AND heures_aide <> v_heures;

    INSERT INTO vea.presences (participant_id, event_slug, motif, heures_aide)
    VALUES (v_pid, c_slug, r.motif, v_heures)
    ON CONFLICT (participant_id, event_slug) DO NOTHING
    RETURNING id INTO v_presence;

    -- Points seulement si la présence vient d'être créée (pas en double à la relance).
    IF v_presence IS NOT NULL THEN
      INSERT INTO vea.logs_xp (participant_id, action, xp_gagne, description, presence_id)
      VALUES (v_pid, v_action, v_xp,
              'Just Dance Party, 4 ans de VEA (' || r.motif || CASE WHEN r.motif = 'aider' THEN ', 7 h, jusqu''à 2 h du matin' ELSE '' END || ')',
              v_presence);
    END IF;
  END LOOP;
END $$;

COMMIT;

-- Vérification : 39 lignes attendues, 10 ou 105 points chacune.
SELECT p.prenom, p.nom, pr.motif, pr.heures_aide, l.xp_gagne, p.xp_saison_actuelle AS total_saison
FROM vea.presences pr
JOIN vea.participants p ON p.id = pr.participant_id
LEFT JOIN vea.logs_xp l ON l.presence_id = pr.id
WHERE pr.event_slug = 'just-dance-party-4-ans-vea-2026'
ORDER BY p.sexe, p.prenom;

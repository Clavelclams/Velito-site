-- ============================================================================
-- ARENA : suppression des 5 tournois de TEST d'août 2026 (17/11/2026)
--
-- Décision de Clavel le 17/11 : les 5 tournois publiés sont des tests
-- (« test », « test double elim », « Coupe VEA double elim », « Test poules 8
-- joueurs », « Test padel 4 paires »). Ils apparaissaient dans le classement,
-- l'API, le sitemap et Google. On les supprime avant l'ouverture publique.
--
-- CE QUI PART, en une seule transaction (tout ou rien) :
--   - les 5 tournois, désignés par leur qr_token (pas par leur titre : un
--     titre peut être réutilisé, un token jamais) ; le script s'arrête si
--     on n'en trouve pas exactement 5 ;
--   - par cascade : participations, matchs, équipes et leurs membres ;
--   - les joueurs FICTIFS : sans compte Velito, qui n'ont joué QUE dans ces
--     tournois, sans palmarès externe ; leurs consentements, ELO et badges
--     partent avec eux (cascade) ;
--   - les badges gagnés dans ces tournois, et l'ELO calculé sur ces matchs
--     pour les joueurs gardés.
-- CE QUI RESTE :
--   - Otiil3v4lc et Velito_Adv (tes pseudos), sans leurs résultats de test ;
--   - tout joueur relié à un compte ou ayant joué ailleurs.
--
-- POURQUOI on coupe deux triggers le temps de la transaction : arena.logs et
-- arena.consentements sont « append-only » (migration 001, un trigger
-- refuse UPDATE et DELETE). C'est voulu pour la vie normale, mais il empêche
-- aussi de supprimer un tournoi (la clé étrangère de logs passerait
-- tournoi_id à null, donc un UPDATE). Les triggers sont réactivés dans la
-- même transaction ; si quoi que ce soit échoue, PostgreSQL annule tout, y
-- compris la désactivation. Les lignes de journal supprimées ne concernent
-- que des données fictives, et la purge elle-même est journalisée à la fin.
--
-- Testé sur PGlite avec le schéma complet (sql/test_purge_tests.mjs).
-- À NE PAS rejouer : il s'arrête de lui-même (« attendu 5 tournois »).
-- ============================================================================
BEGIN;

CREATE TEMP TABLE _t ON COMMIT DROP AS
SELECT id, titre FROM arena.tournois
WHERE qr_token IN (
  'eef7b601-6186-4003-b8c3-09aeabf3042b',  -- Coupe VEA double elim
  'ca9ca298-5b6e-41d3-b495-3048aeab3906',  -- Test padel 4 paires
  '93f1fd1d-e23c-4a7b-9221-95039e3b1de4',  -- Test poules 8 joueurs
  '506d504d-6f0b-4ad0-9da5-24382ebdab9c',  -- test double elim
  'b7b71dc7-be5c-420f-9aab-b225aa5d24ab'   -- test
);

DO $$
BEGIN
  IF (SELECT count(*) FROM _t) <> 5 THEN
    RAISE EXCEPTION 'Attendu 5 tournois de test, trouvé % : rien n''a été supprimé.', (SELECT count(*) FROM _t);
  END IF;
END $$;

-- Joueurs fictifs : aucun compte, présents dans ces tournois, nulle part ailleurs.
CREATE TEMP TABLE _j ON COMMIT DROP AS
SELECT j.id, j.pseudo FROM arena.joueurs j
WHERE j.user_id IS NULL
  AND j.pseudo NOT IN ('Otiil3v4lc', 'Velito_Adv')
  AND (
    EXISTS (SELECT 1 FROM arena.participations p WHERE p.joueur_id = j.id AND p.tournoi_id IN (SELECT id FROM _t))
    OR EXISTS (SELECT 1 FROM arena.equipes_membres em WHERE em.joueur_id = j.id AND em.tournoi_id IN (SELECT id FROM _t))
  )
  AND NOT EXISTS (SELECT 1 FROM arena.participations p WHERE p.joueur_id = j.id AND p.tournoi_id NOT IN (SELECT id FROM _t))
  AND NOT EXISTS (SELECT 1 FROM arena.equipes_membres em WHERE em.joueur_id = j.id AND em.tournoi_id NOT IN (SELECT id FROM _t))
  AND NOT EXISTS (SELECT 1 FROM arena.resultats_externes r WHERE r.joueur_id = j.id);

ALTER TABLE arena.logs DISABLE TRIGGER trg_arena_logs_append_only;
ALTER TABLE arena.consentements DISABLE TRIGGER trg_arena_consentements_append_only;

DELETE FROM arena.logs
WHERE tournoi_id IN (SELECT id FROM _t)
   OR match_id IN (SELECT m.id FROM arena.matchs m WHERE m.tournoi_id IN (SELECT id FROM _t));

DELETE FROM arena.badges_joueurs WHERE tournoi_id IN (SELECT id FROM _t);

-- Cascade : participations, matchs, équipes, membres d'équipe.
DELETE FROM arena.tournois WHERE id IN (SELECT id FROM _t);

-- ELO calculé uniquement sur ces matchs, pour les joueurs gardés qui n'ont
-- plus aucun tournoi : il ne correspond plus à rien.
DELETE FROM arena.elo_joueurs e
WHERE NOT EXISTS (SELECT 1 FROM arena.participations p WHERE p.joueur_id = e.joueur_id)
  AND NOT EXISTS (SELECT 1 FROM arena.equipes_membres em WHERE em.joueur_id = e.joueur_id);

-- Cascade : consentements, ELO, badges, demandes de rattachement.
DELETE FROM arena.joueurs WHERE id IN (SELECT id FROM _j);

ALTER TABLE arena.consentements ENABLE TRIGGER trg_arena_consentements_append_only;
ALTER TABLE arena.logs ENABLE TRIGGER trg_arena_logs_append_only;

-- La purge laisse sa propre trace dans le journal.
INSERT INTO arena.logs (acteur_id, action, tournoi_id, match_id, detail)
VALUES (NULL, 'PURGE_TOURNOIS_TEST', NULL, NULL, jsonb_build_object(
  'date', '2026-11-17',
  'decision', 'Clavel : les 5 tournois publiés d''août 2026 étaient des tests',
  'tournois', (SELECT jsonb_agg(titre ORDER BY titre) FROM _t),
  'joueurs_supprimes', (SELECT jsonb_agg(pseudo ORDER BY pseudo) FROM _j)
));

COMMIT;

-- Vérification (attendu : 0, 0, 0, true, true, 2)
SELECT
  (SELECT count(*) FROM arena.tournois) AS tournois_restants,
  (SELECT count(*) FROM arena.matchs) AS matchs_restants,
  (SELECT count(*) FROM arena.participations) AS participations_restantes,
  (SELECT tgenabled <> 'D' FROM pg_trigger WHERE tgname = 'trg_arena_logs_append_only') AS journal_protege,
  (SELECT tgenabled <> 'D' FROM pg_trigger WHERE tgname = 'trg_arena_consentements_append_only') AS consentements_proteges,
  (SELECT count(*) FROM arena.joueurs WHERE pseudo IN ('Otiil3v4lc', 'Velito_Adv')) AS tes_pseudos_gardes;

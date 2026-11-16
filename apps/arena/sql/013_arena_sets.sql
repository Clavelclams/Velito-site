-- ============================================================================
-- 013 : détail des sets d'un match (14/11/2026)
--
-- Padel et ping-pong : le staff peut saisir « 6-4 3-6 7-5 ». La colonne
-- garde ce détail ; score_j1 / score_j2 restent la vérité du bracket et du
-- classement (ici, le nombre de sets gagnés, calculé et vérifié côté serveur
-- par lib/arena/sets.ts). null = pas de détail, cas normal en esport.
--
-- Format : tableau jsonb de paires d'entiers, [[6,4],[3,6],[7,5]].
-- La contrainte de base ne vérifie que la FORME (tableau, 1 à 5 sets) ; les
-- règles du sport (6-4 permis, 6-5 non) vivent dans le module TypeScript
-- testé, comme toute la logique métier d'ARENA.
--
-- Lecture publique : la migration 001 donne SELECT sur la table entière à
-- anon (seule arena.joueurs est restreinte par colonnes, migration 009), donc
-- la nouvelle colonne est lisible par la page publique sans autre GRANT.
--
-- Idempotente (IF NOT EXISTS, DROP CONSTRAINT IF EXISTS).
-- ============================================================================
BEGIN;

ALTER TABLE arena.matchs ADD COLUMN IF NOT EXISTS sets jsonb;

ALTER TABLE arena.matchs DROP CONSTRAINT IF EXISTS matchs_sets_forme;
ALTER TABLE arena.matchs
  ADD CONSTRAINT matchs_sets_forme CHECK (
    sets IS NULL
    OR (jsonb_typeof(sets) = 'array' AND jsonb_array_length(sets) BETWEEN 1 AND 5)
  );

COMMENT ON COLUMN arena.matchs.sets IS
  'Détail des sets (padel, ping-pong) : [[6,4],[3,6],[7,5]]. null = pas de détail. Règles dans lib/arena/sets.ts.';

-- Le verrou du règlement §3 (migration 001) protège le résultat d'un match
-- validé. Le détail des sets en fait partie : on l'ajoute. On en profite pour
-- fermer un trou : equipe_gagnante_id (migration 004, matchs par équipes)
-- n'était pas protégé, alors que gagnant_id l'était. Reste identique sinon.
CREATE OR REPLACE FUNCTION arena.verrou_match_valide()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.statut = 'VALIDE' AND (
       NEW.score_j1           IS DISTINCT FROM OLD.score_j1 OR
       NEW.score_j2           IS DISTINCT FROM OLD.score_j2 OR
       NEW.gagnant_id         IS DISTINCT FROM OLD.gagnant_id OR
       NEW.equipe_gagnante_id IS DISTINCT FROM OLD.equipe_gagnante_id OR
       NEW.sets               IS DISTINCT FROM OLD.sets OR
       NEW.statut             IS DISTINCT FROM OLD.statut
     ) THEN
    RAISE EXCEPTION 'Match % : résultat validé, modification interdite (règlement §3).', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

COMMIT;

-- Vérification (doit renvoyer une ligne, data_type = jsonb) :
-- SELECT column_name, data_type FROM information_schema.columns
--  WHERE table_schema = 'arena' AND table_name = 'matchs' AND column_name = 'sets';
--
-- Retour arrière (remettre aussi verrou_match_valide de la migration 001) :
-- ALTER TABLE arena.matchs DROP CONSTRAINT IF EXISTS matchs_sets_forme;
-- ALTER TABLE arena.matchs DROP COLUMN IF EXISTS sets;

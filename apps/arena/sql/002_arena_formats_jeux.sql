-- ============================================================================
-- ARENA — Migration 002 : double élimination + référentiel des jeux
-- ============================================================================
-- Prérequis : 001 exécutée. À exécuter dans le SQL Editor Supabase.
-- Après exécution : rien à changer dans "Exposed schemas" (le schéma arena y
-- est déjà) MAIS il faut exposer la nouvelle table arena.jeux dans
-- Integrations → Data API → Exposed tables (même manip que le 11/08).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Colonne bracket sur les matchs : W = tableau principal, L = rattrapage,
--    GF = grande finale. Les matchs existants (élimination simple) restent 'W'.
-- ----------------------------------------------------------------------------
ALTER TABLE arena.matchs
  ADD COLUMN bracket text NOT NULL DEFAULT 'W'
  CHECK (bracket IN ('W', 'L', 'GF'));

-- L'unicité (round, position) devient par-bracket.
ALTER TABLE arena.matchs
  DROP CONSTRAINT matchs_tournoi_id_round_position_key;
ALTER TABLE arena.matchs
  ADD CONSTRAINT matchs_tournoi_bracket_round_position_key
  UNIQUE (tournoi_id, bracket, round, position);

-- ----------------------------------------------------------------------------
-- 2. Nouveau format autorisé. (POULES_FINALE arrivera en migration 003 avec
--    son moteur — on n'autorise JAMAIS un format sans moteur testé derrière.)
-- ----------------------------------------------------------------------------
ALTER TABLE arena.tournois DROP CONSTRAINT tournois_format_check;
ALTER TABLE arena.tournois
  ADD CONSTRAINT tournois_format_check
  CHECK (format IN ('ELIMINATION_SIMPLE', 'DOUBLE_ELIMINATION'));

-- ----------------------------------------------------------------------------
-- 3. Référentiel des jeux — source de vérité future du champ tournois.jeu
--    (V1 : le code utilise une liste embarquée + ce référentiel en lecture ;
--    V2 : FK tournois.jeu_id → arena.jeux + CRUD admin).
-- ----------------------------------------------------------------------------
CREATE TABLE arena.jeux (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom        text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE arena.jeux ENABLE ROW LEVEL SECURITY;
CREATE POLICY jeux_lecture ON arena.jeux FOR SELECT USING (true);
GRANT SELECT ON arena.jeux TO anon, authenticated;
GRANT ALL ON arena.jeux TO service_role;

INSERT INTO arena.jeux (nom) VALUES
  ('Street Fighter 6'), ('Tekken 8'), ('Super Smash Bros. Ultimate'),
  ('Rocket League'), ('EA Sports FC 25'), ('Mario Kart 8 Deluxe'),
  ('Valorant'), ('League of Legends'), ('Counter-Strike 2'), ('Fortnite')
ON CONFLICT (nom) DO NOTHING;

COMMIT;

-- Correctif de données (optionnel) : répare la typo du tournoi test du 11/08.
-- UPDATE arena.tournois SET jeu = 'Street Fighter 6' WHERE jeu = 'street fihter';

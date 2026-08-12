-- ============================================================================
-- ARENA — Migration 003 : format POULES + FINALE
-- ============================================================================
-- Prérequis : 001 et 002 exécutées.
--
-- Principe : les matchs de poule vivent dans le même tableau arena.matchs,
-- avec bracket = 'P' et une colonne `poule` (1..G). Le champ `round` sert de
-- numéro de JOURNÉE. La phase finale réutilise bracket = 'W' — c'est un
-- bracket à élimination simple classique, généré dans un second temps.
-- ============================================================================

BEGIN;

-- 1. Le bracket 'P' (poules) rejoint W / L / GF.
ALTER TABLE arena.matchs DROP CONSTRAINT IF EXISTS matchs_bracket_check;
ALTER TABLE arena.matchs
  ADD CONSTRAINT matchs_bracket_check CHECK (bracket IN ('W', 'L', 'GF', 'P'));

-- 2. Numéro de poule (NULL pour tout match hors phase de poules).
ALTER TABLE arena.matchs ADD COLUMN IF NOT EXISTS poule int CHECK (poule >= 1);

-- L'unicité doit tenir compte de la poule : deux poules ont chacune leur
-- journée 1 position 0. Une contrainte UNIQUE ignore les lignes dont une
-- colonne est NULL, donc les matchs hors poules ne sont pas gênés.
ALTER TABLE arena.matchs
  DROP CONSTRAINT IF EXISTS matchs_tournoi_bracket_round_position_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_arena_matchs_unicite
  ON arena.matchs (tournoi_id, bracket, COALESCE(poule, 0), round, position);

-- 3. Nouveau format + paramètres de configuration des poules.
ALTER TABLE arena.tournois DROP CONSTRAINT IF EXISTS tournois_format_check;
ALTER TABLE arena.tournois
  ADD CONSTRAINT tournois_format_check
  CHECK (format IN ('ELIMINATION_SIMPLE', 'DOUBLE_ELIMINATION', 'POULES_FINALE'));

ALTER TABLE arena.tournois
  ADD COLUMN IF NOT EXISTS nb_poules int CHECK (nb_poules BETWEEN 1 AND 16),
  ADD COLUMN IF NOT EXISTS nb_qualifies_par_poule int
    CHECK (nb_qualifies_par_poule IN (1, 2)),
  -- Passe à true quand le staff a généré le bracket final : empêche toute
  -- seconde génération (idempotence côté base, pas seulement côté code).
  ADD COLUMN IF NOT EXISTS phase_finale_generee boolean NOT NULL DEFAULT false;

COMMIT;

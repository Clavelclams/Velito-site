-- ============================================================================
-- ARENA — Migration 005 : ordre manuel des inscrits (têtes de série)
-- ============================================================================
-- Prérequis : 001 à 004 exécutées.
--
-- Pourquoi cette colonne : jusqu'ici l'ordre des inscrits était l'ordre
-- d'arrivée (`created_at`), et le bracket était tiré au sort intégralement.
-- Le staff veut pouvoir réorganiser la liste à la main (glisser-déposer ou
-- clic) pour placer les têtes de série, ou pour composer les équipes.
--
-- `ordre` est un entier LIBRE, pas un rang contigu. On réécrit toute la
-- colonne à chaque réorganisation (une poignée de lignes), ce qui évite les
-- techniques de rang fractionnaire, illisibles à débugger pour un gain nul à
-- cette échelle. NULL = « jamais réordonné », on retombe sur created_at.
-- ============================================================================

BEGIN;

ALTER TABLE arena.participations
  ADD COLUMN IF NOT EXISTS ordre int;

-- Index de tri : ordre d'abord, arrivée ensuite. NULLS LAST pour que les
-- inscrits jamais réordonnés se rangent après ceux placés à la main.
CREATE INDEX IF NOT EXISTS idx_arena_participations_ordre
  ON arena.participations (tournoi_id, ordre NULLS LAST, created_at);

COMMIT;

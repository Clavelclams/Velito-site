-- ============================================================================
-- 008 — Catalogue des jeux : EA Sports FC 26 (édition annuelle).
--
-- Le libellé « EA Sports FC 25 » RESTE en base : des tournois peuvent déjà
-- l'utiliser et l'historique ne se réécrit pas. On AJOUTE le millésime
-- courant ; côté application, la fiche jeu et la pastille d'accueil
-- regroupent les deux via `anciensLibelles` (lib/arena/disciplines.ts).
--
-- Idempotente : ON CONFLICT DO NOTHING, rejouable sans risque.
-- ============================================================================
BEGIN;

INSERT INTO arena.jeux (nom) VALUES ('EA Sports FC 26')
ON CONFLICT (nom) DO NOTHING;

COMMIT;

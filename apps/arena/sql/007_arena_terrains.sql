-- ============================================================================
-- ARENA — Migration 007 : TERRAIN d'un match (module sport physique)
-- ============================================================================
-- Prérequis : 001 à 006 exécutées.
--
-- LE BESOIN, constaté au tournoi padel du 13/08 : dès qu'il y a deux courts
-- qui tournent en parallèle, « quand est-ce que je joue ? » est immédiatement
-- suivi de « et sur quel court ? ». Sans cette information, le staff sert de
-- standard téléphonique toute la journée.
--
-- DÉCISIONS, à savoir défendre :
--
--   1. UNE SEULE COLONNE TEXTE, pas de table `terrains`.
--      Une table imposerait de déclarer les terrains avant de commencer,
--      alors que le jour J on découvre parfois qu'un court est indisponible.
--      Un libellé libre absorbe tous les cas sans configuration préalable.
--
--   2. TEXTE LIBRE plutôt qu'un numéro.
--      Le vocabulaire change avec la discipline : « Court 2 » au padel,
--      « Terrain A » au five, « Table 3 » au ping-pong, « Poste 5 » en LAN
--      esport. Un entier aurait forcé une traduction dans l'affichage, et
--      aurait exclu les lieux qui nomment leurs terrains (« Central »).
--
--   3. NULLABLE, et c'est le cas NORMAL.
--      Un tournoi sur un seul court n'a rien à assigner. La colonne ne doit
--      donc jamais être obligatoire, et l'interface ne montre le terrain que
--      s'il est renseigné.
--
--   4. AUCUNE CONTRAINTE D'UNICITÉ.
--      Interdire deux matchs simultanés sur le même court serait tentant,
--      mais « simultané » n'existe pas dans le modèle : un match n'a pas
--      d'horaire. La contrainte serait donc fausse — c'est au staff de
--      savoir ce qu'il fait, comme pour l'ordre des matchs.
--
--   5. Colonne ajoutée à `matchs` et pas à `tournois` : deux matchs du même
--      tournoi se jouent sur des courts différents, c'est tout l'intérêt.
-- ============================================================================

BEGIN;

ALTER TABLE arena.matchs
  ADD COLUMN IF NOT EXISTS terrain text
    CHECK (terrain IS NULL OR char_length(trim(terrain)) BETWEEN 1 AND 40);

COMMENT ON COLUMN arena.matchs.terrain IS
  'Libellé libre du lieu où se joue le match (Court 2, Terrain A, Table 3, Poste 5). NULL = non assigné, cas normal quand il n''y a qu''un seul terrain.';

COMMIT;

-- ============================================================================
-- Rien à exposer côté API : la colonne appartient à arena.matchs, table déjà
-- exposée et déjà couverte par ses policies RLS. Un match visible publiquement
-- affichera donc son terrain, ce qui est exactement le but.
-- ============================================================================

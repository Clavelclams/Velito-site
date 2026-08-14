-- ============================================================================
-- ARENA — Migration 006 : PALMARÈS EXTERNE (import Toornament, lecture seule)
-- ============================================================================
-- Prérequis : 001 à 005 exécutées.
--
-- POSITIONNEMENT (décision actée 13/08/2026) : ARENA ne concurrence pas les
-- plateformes établies, il les COMPLÈTE. Un joueur d'Amiens qui a fait un
-- top 8 sur un tournoi Toornament doit pouvoir le montrer sur son profil
-- ARENA — le « CV esport » n'a de valeur que s'il est complet.
--
-- RÈGLES, à savoir défendre :
--
--   1. LECTURE SEULE, AUCUNE REDISTRIBUTION. Un résultat importé s'AFFICHE
--      sur le profil ; il ne donne JAMAIS de points au classement ARENA.
--      Mélanger des points maison et des points importés rendrait le
--      classement invérifiable (on ne contrôle ni le niveau ni le format des
--      tournois externes) et créerait une incitation à importer n'importe quoi.
--
--   2. ON STOCKE UNE COPIE DES DONNÉES (nom du tournoi, jeu, rang, date) au
--      moment de l'import, plus l'URL source. Si Toornament supprime le
--      tournoi ou change son API, le profil ARENA reste intact — et le lien
--      source permet toujours la vérification tant qu'il vit.
--
--   3. UN SEUL RÉSULTAT PAR (joueur, source, tournoi externe) : la contrainte
--      UNIQUE rend le doublon impossible en base, pas seulement dans le code.
--
--   4. V1 : l'import est fait PAR LE STAFF (Server Action requireStaff), car
--      ARENA n'a pas encore de connexion joueur. Le jour où le login OIDC
--      joueur existera (Lot 4), la même table servira à l'auto-import — seul
--      le point d'entrée changera.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS arena.resultats_externes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  joueur_id          uuid NOT NULL REFERENCES arena.joueurs(id) ON DELETE CASCADE,
  -- Extensible : demain 'STARTGG' ou 'CHALLONGE' s'ajoutent dans le CHECK.
  source             text NOT NULL DEFAULT 'TOORNAMENT'
                       CHECK (source IN ('TOORNAMENT')),
  tournoi_externe_id text NOT NULL,
  url                text NOT NULL CHECK (char_length(url) <= 500),
  nom_tournoi        text NOT NULL CHECK (char_length(nom_tournoi) BETWEEN 1 AND 200),
  jeu                text,
  -- Nom sous lequel le joueur apparaît sur la plateforme externe : c'est LA
  -- preuve d'appariement, affichée publiquement pour que n'importe qui puisse
  -- vérifier le résultat à la source.
  nom_participant    text NOT NULL CHECK (char_length(nom_participant) BETWEEN 1 AND 100),
  rang               int CHECK (rang >= 1),
  nb_participants    int CHECK (nb_participants >= 2),
  date_fin           date,
  importe_par        uuid,           -- user staff qui a fait l'import (audit)
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (joueur_id, source, tournoi_externe_id)
);

CREATE INDEX IF NOT EXISTS idx_arena_resultats_externes_joueur
  ON arena.resultats_externes(joueur_id);

-- Droits : lecture publique (le palmarès est fait pour être vu), écriture
-- réservée au service_role (Server Actions après requireStaff).
GRANT SELECT ON arena.resultats_externes TO anon, authenticated;
GRANT ALL    ON arena.resultats_externes TO service_role;

ALTER TABLE arena.resultats_externes ENABLE ROW LEVEL SECURITY;

-- Visible seulement si le joueur l'est encore : un joueur anonymisé (droit à
-- l'effacement RGPD) emporte son palmarès externe avec lui. La sous-requête
-- s'exécute avec la RLS de arena.joueurs pour le rôle courant : même règle
-- de visibilité partout, définie à UN seul endroit.
DROP POLICY IF EXISTS resultats_externes_lecture ON arena.resultats_externes;
CREATE POLICY resultats_externes_lecture ON arena.resultats_externes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM arena.joueurs j WHERE j.id = joueur_id
  ));

COMMIT;

-- ============================================================================
-- ⚠️ APRÈS EXÉCUTION : Supabase Dashboard → Settings → API → exposer la table
--    arena.resultats_externes à l'API Data (comme equipes/equipes_membres).
--    Puis ajouter TOORNAMENT_API_KEY dans les variables d'environnement
--    Vercel (clé gratuite : developer.toornament.com, il faut un compte).
-- ============================================================================

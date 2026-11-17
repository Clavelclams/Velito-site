-- ============================================================================
-- 015 : format « défi au score » (17/11/2026)
--
-- Premier usage : « Stade vers l'Emploi » (France Travail, APSL 80), atelier
-- Overcooked 2 de VEA. Des groupes tournent toutes les 15 minutes ; chaque
-- rotation oppose deux équipes éphémères nommées par couleur (« G3 Rouge »).
-- Le staff saisit le nombre de plats, l'écran affiche le classement du jour.
--
-- ANONYMAT TOTAL (événement avec des personnes en situation de handicap,
-- employeurs incognito, tournage) : ces tables n'ont AUCUNE colonne pour
-- une personne. Pas de joueur, pas de pseudo, pas de compte, pas d'âge.
-- Une équipe = une couleur + un numéro de rotation + un score.
--
-- ISOLATION : tables séparées, sans lien avec arena.tournois, joueurs,
-- matchs. Le classement général, l'ELO, les badges, le sitemap et l'API
-- publique lisent arena.tournois : un défi n'y apparaît donc jamais.
-- Uniquement des AJOUTS : aucune table ni règle existante n'est modifiée.
--
-- DROITS : RLS activée SANS policy, aucun GRANT pour anon / authenticated.
-- Seul le serveur (service_role) lit et écrit, après requireStaff() pour la
-- saisie, et par le token non devinable pour l'écran.
--
-- Idempotente (IF NOT EXISTS, CREATE OR REPLACE).
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS arena.defis (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       uuid NOT NULL REFERENCES shared.organizations(id),
  titre                 text NOT NULL CHECK (char_length(titre) BETWEEN 2 AND 120),
  -- Libellé de l'unité de score (« plats »).
  unite                 text NOT NULL DEFAULT 'plats' CHECK (char_length(unite) BETWEEN 1 AND 20),
  token                 uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  duree_manche_s        int NOT NULL DEFAULT 240 CHECK (duree_manche_s BETWEEN 30 AND 1800),
  rotation_courante_id  uuid,
  cree_par              uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS arena.defi_rotations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  defi_id      uuid NOT NULL REFERENCES arena.defis(id) ON DELETE CASCADE,
  numero       int NOT NULL CHECK (numero BETWEEN 1 AND 99),
  heure        text CHECK (heure ~ '^[0-2][0-9]:[0-5][0-9]$'),
  statut       text NOT NULL DEFAULT 'A_VENIR' CHECK (statut IN ('A_VENIR', 'EN_COURS', 'VALIDEE')),
  -- Chrono de la manche en cours : ESSAI (sans score) ou COMPTEE.
  phase        text CHECK (phase IN ('ESSAI', 'COMPTEE')),
  chrono_debut timestamptz,
  chrono_fin   timestamptz,
  valide_le    timestamptz,
  UNIQUE (defi_id, numero)
);

CREATE TABLE IF NOT EXISTS arena.defi_equipes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  defi_id     uuid NOT NULL REFERENCES arena.defis(id) ON DELETE CASCADE,
  rotation_id uuid NOT NULL REFERENCES arena.defi_rotations(id) ON DELETE CASCADE,
  couleur     text NOT NULL CHECK (couleur IN ('ROUGE', 'BLEU')),
  score       int NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 999),
  UNIQUE (rotation_id, couleur)
);

CREATE INDEX IF NOT EXISTS idx_arena_defi_rotations_defi ON arena.defi_rotations(defi_id, numero);
CREATE INDEX IF NOT EXISTS idx_arena_defi_equipes_defi ON arena.defi_equipes(defi_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'defis_rotation_courante_fkey') THEN
    ALTER TABLE arena.defis
      ADD CONSTRAINT defis_rotation_courante_fkey
      FOREIGN KEY (rotation_courante_id) REFERENCES arena.defi_rotations(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE arena.defis          ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.defi_rotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.defi_equipes   ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON arena.defis, arena.defi_rotations, arena.defi_equipes FROM anon, authenticated;
GRANT ALL ON arena.defis, arena.defi_rotations, arena.defi_equipes TO service_role;

-- + / − atomique : deux appuis rapides ne s'écrasent jamais (une seule
-- instruction UPDATE), et le score ne descend pas sous 0.
CREATE OR REPLACE FUNCTION arena.defi_ajuster_score(p_equipe uuid, p_delta int)
RETURNS int
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE arena.defi_equipes
     SET score = least(999, greatest(0, score + p_delta))
   WHERE id = p_equipe
  RETURNING score;
$$;
REVOKE ALL ON FUNCTION arena.defi_ajuster_score(uuid, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION arena.defi_ajuster_score(uuid, int) TO service_role;

COMMIT;

-- Vérification :
-- SELECT to_regclass('arena.defis'), to_regclass('arena.defi_rotations'), to_regclass('arena.defi_equipes'),
--        has_table_privilege('anon', 'arena.defi_equipes', 'SELECT') AS anon_lit_doit_etre_false;
--
-- Retour arrière :
-- DROP FUNCTION IF EXISTS arena.defi_ajuster_score(uuid, int);
-- ALTER TABLE arena.defis DROP CONSTRAINT IF EXISTS defis_rotation_courante_fkey;
-- DROP TABLE IF EXISTS arena.defi_equipes, arena.defi_rotations, arena.defis;

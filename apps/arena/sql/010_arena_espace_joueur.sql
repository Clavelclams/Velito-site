-- ============================================================================
-- 010 : Espace joueur (connexion, rattachement, inscription en ligne)
-- 12/11/2026
--
-- CE QUE ÇA AJOUTE
--  1. tournois.inscription_en_ligne : le staff choisit, tournoi par tournoi,
--     si un joueur connecté peut s'inscrire seul (défaut : NON, un tournoi
--     sur invitation reste fermé sans rien faire).
--  2. participations.source : 'staff' (ajout au bureau, comme avant) ou
--     'en_ligne' (le joueur s'est inscrit lui-même). Le staff voit qui
--     arrive par quel chemin.
--  3. Un compte Velito = au plus UN joueur ARENA (index unique partiel sur
--     joueurs.user_id). La colonne existe depuis la 001, elle n'était pas
--     encore alimentée.
--  4. arena.demandes_rattachement : « ce pseudo, c'est moi ». Un pseudo créé
--     par le staff au bureau n'appartient à personne ; un joueur connecté le
--     réclame, le staff d'une orga où ce joueur a joué accepte ou refuse.
--     Sans validation humaine, n'importe qui pourrait s'approprier le
--     palmarès d'un autre en tapant son pseudo.
--
-- CE QUE ÇA NE CHANGE PAS
--  - Le check-in reste fait par le staff le jour J ; seuls les joueurs
--    check-in entrent dans le bracket (demarrerTournoi, inchangé).
--  - Un moins de 15 ans peut s'inscrire en ligne, mais son check-in est
--    refusé tant que le staff n'a pas confirmé l'autorisation parentale
--    (joueurs.consentement_parental_at, colonne de la 001). Contrôle côté
--    serveur, dans toggleCheckIn.
--
-- SÉCURITÉ : écritures uniquement par service_role APRÈS contrôle dans les
-- Server Actions (même modèle que tout ARENA). La RLS est un filet : un
-- joueur connecté ne lit que SES demandes, l'anonyme ne lit rien.
--
-- Idempotente : rejouable sans effet de bord.
-- ============================================================================
BEGIN;

-- 1. Option par tournoi -------------------------------------------------------
ALTER TABLE arena.tournois
  ADD COLUMN IF NOT EXISTS inscription_en_ligne boolean NOT NULL DEFAULT false;

-- 2. Origine d'une inscription -------------------------------------------------
ALTER TABLE arena.participations
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'staff';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'participations_source_valide'
  ) THEN
    ALTER TABLE arena.participations
      ADD CONSTRAINT participations_source_valide
      CHECK (source IN ('staff', 'en_ligne'));
  END IF;
END $$;

-- 3. Un compte, un joueur ------------------------------------------------------
-- Partiel : les joueurs SANS compte (créés au bureau) restent nombreux et
-- ont tous user_id = null, ce qui ne doit pas violer l'unicité.
CREATE UNIQUE INDEX IF NOT EXISTS idx_arena_joueurs_user_unique
  ON arena.joueurs(user_id) WHERE user_id IS NOT NULL;

-- 4. Demandes de rattachement --------------------------------------------------
CREATE TABLE IF NOT EXISTS arena.demandes_rattachement (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  joueur_id    uuid NOT NULL REFERENCES arena.joueurs(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  statut       text NOT NULL DEFAULT 'EN_ATTENTE'
                 CHECK (statut IN ('EN_ATTENTE', 'ACCEPTEE', 'REFUSEE', 'ANNULEE')),
  traitee_par  uuid REFERENCES auth.users(id),
  traitee_le   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  -- Une demande traitée l'est par quelqu'un, à une date.
  CONSTRAINT demande_traitee_complete CHECK (
    statut IN ('EN_ATTENTE', 'ANNULEE') OR (traitee_par IS NOT NULL AND traitee_le IS NOT NULL)
  )
);

-- Une seule demande EN COURS par compte, et par pseudo : pas de spam du
-- staff, pas de course entre deux personnes sur le même pseudo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_arena_demandes_user_en_attente
  ON arena.demandes_rattachement(user_id) WHERE statut = 'EN_ATTENTE';
CREATE UNIQUE INDEX IF NOT EXISTS idx_arena_demandes_joueur_en_attente
  ON arena.demandes_rattachement(joueur_id) WHERE statut = 'EN_ATTENTE';

ALTER TABLE arena.demandes_rattachement ENABLE ROW LEVEL SECURITY;

-- Rien pour anon. Le joueur connecté lit ses propres demandes. Écritures :
-- service_role uniquement (aucune policy d'écriture).
REVOKE ALL ON arena.demandes_rattachement FROM anon, authenticated;
GRANT SELECT ON arena.demandes_rattachement TO authenticated;
GRANT ALL ON arena.demandes_rattachement TO service_role;

DROP POLICY IF EXISTS demandes_lecture_soi ON arena.demandes_rattachement;
CREATE POLICY demandes_lecture_soi ON arena.demandes_rattachement
  FOR SELECT USING (user_id = auth.uid());

COMMIT;

-- Vérification (à lancer après) : 3 lignes attendues.
--   SELECT 'tournois.inscription_en_ligne' AS quoi FROM information_schema.columns
--    WHERE table_schema='arena' AND table_name='tournois' AND column_name='inscription_en_ligne'
--   UNION ALL
--   SELECT 'participations.source' FROM information_schema.columns
--    WHERE table_schema='arena' AND table_name='participations' AND column_name='source'
--   UNION ALL
--   SELECT 'demandes_rattachement' FROM information_schema.tables
--    WHERE table_schema='arena' AND table_name='demandes_rattachement';
--
-- Retour arrière (si besoin, AVANT toute donnée réelle) :
--   DROP TABLE IF EXISTS arena.demandes_rattachement;
--   DROP INDEX IF EXISTS arena.idx_arena_joueurs_user_unique;
--   ALTER TABLE arena.participations DROP CONSTRAINT IF EXISTS participations_source_valide;
--   ALTER TABLE arena.participations DROP COLUMN IF EXISTS source;
--   ALTER TABLE arena.tournois DROP COLUMN IF EXISTS inscription_en_ligne;

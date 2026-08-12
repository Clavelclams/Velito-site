-- ============================================================================
-- ARENA — Migration 004 : module SPORT PHYSIQUE (équipes) + ELO interne
-- ============================================================================
-- Prérequis : 001, 002 et 003 exécutées.
--
-- DÉCISIONS ACTÉES (12/08/2026), à savoir défendre :
--
--   1. ÉQUIPE ÉPHÉMÈRE, rattachée à UN tournoi.
--      Au padel comme au five, les paires/équipes se recomposent à chaque
--      session. Un roster persistant obligerait à gérer transferts, équipes
--      fantômes et invités pour quelques dizaines de joueurs à Amiens :
--      sur-ingénierie. Une équipe vit et meurt avec son tournoi.
--
--   2. LE MOTEUR DE BRACKET N'EST PAS TOUCHÉ.
--      lib/bracket.ts, bracket-double.ts et poules.ts travaillent sur des
--      `readonly string[]` d'identifiants OPAQUES. Leur passer des ids
--      d'équipes au lieu d'ids de joueurs ne demande zéro ligne de code : le
--      tirage au sort, le croisement des qualifiés et la double élimination
--      fonctionnent à l'identique. C'est le bénéfice concret d'avoir gardé
--      ces modules purs et sans dépendance à la base.
--
--   3. ON N'ÉCRASE PAS joueur1_id / joueur2_id.
--      On AJOUTE equipe1_id / equipe2_id. Un tournoi a soit des joueurs
--      (taille_equipe = 1), soit des équipes (taille_equipe >= 2), jamais les
--      deux. Renommer les colonnes existantes aurait cassé les 2 tournois
--      déjà joués en production et tout le code esport pour un gain cosmétique.
--
--   4. LA COLONNE `jeu` EST RÉUTILISÉE pour la discipline sportive
--      (« Padel », « Five »). Elle est déjà NOT NULL, indexée côté usage, et
--      la page publique l'affiche déjà. Ajouter une colonne `sport` jumelle
--      aurait créé deux sources de vérité pour la même information. Seul
--      le LIBELLÉ change dans le formulaire admin.
--
--   5. ELO = TABLE SERVEUR-SEULE.
--      Le classement PUBLIC reste les points cumulés 3/2/1 (esprit associatif,
--      identique à l'esport). L'ELO sert uniquement en interne à équilibrer
--      les poules et les têtes de série. Il n'est donc lisible ni par `anon`
--      ni par `authenticated` : RLS activée SANS aucune policy = refus par
--      défaut, seul `service_role` (Server Actions, après requireStaff) y
--      accède. Afficher un ELO public sur une asso d'inclusion serait par
--      ailleurs contraire à l'objectif : on ne veut pas décourager un débutant.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Le tournoi sait à quelle verticale il appartient et à combien on joue.
-- ============================================================================
ALTER TABLE arena.tournois
  ADD COLUMN IF NOT EXISTS discipline text NOT NULL DEFAULT 'ESPORT'
    CHECK (discipline IN ('ESPORT', 'SPORT')),
  -- 1 = tournoi individuel (tout l'esport actuel), 2 = padel en double,
  -- 5 = five. Borne haute à 11 (football à 11) : au-delà, ce n'est plus
  -- l'usage visé et une saisie à 50 relèverait de la faute de frappe.
  ADD COLUMN IF NOT EXISTS taille_equipe int NOT NULL DEFAULT 1
    CHECK (taille_equipe BETWEEN 1 AND 11);

-- Garde-fou de cohérence : un tournoi esport reste individuel. Si un jour on
-- fait de l'esport par équipes (LoL 5v5), cette contrainte se retire en une
-- ligne — mais tant qu'elle n'est pas retirée, elle empêche un état bâtard.
ALTER TABLE arena.tournois DROP CONSTRAINT IF EXISTS tournois_discipline_taille_check;
ALTER TABLE arena.tournois
  ADD CONSTRAINT tournois_discipline_taille_check
  CHECK (discipline <> 'ESPORT' OR taille_equipe = 1);

-- ============================================================================
-- 2. arena.equipes — composition faite par le staff le jour J.
-- ============================================================================
CREATE TABLE IF NOT EXISTS arena.equipes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournoi_id  uuid NOT NULL REFERENCES arena.tournois(id) ON DELETE CASCADE,
  nom         text NOT NULL CHECK (char_length(nom) BETWEEN 1 AND 40),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournoi_id, nom),
  -- Contrainte technique : sert de cible à la clé étrangère COMPOSITE de
  -- equipes_membres ci-dessous. C'est elle qui rend impossible de rattacher
  -- un membre à une équipe d'un AUTRE tournoi.
  UNIQUE (id, tournoi_id)
);
CREATE INDEX IF NOT EXISTS idx_arena_equipes_tournoi ON arena.equipes(tournoi_id);

CREATE TABLE IF NOT EXISTS arena.equipes_membres (
  -- tournoi_id est dénormalisé VOLONTAIREMENT : c'est ce qui permet à la base
  -- (et non au code applicatif) de garantir qu'un joueur n'est pas dans deux
  -- équipes du même tournoi. Sans cette colonne, la règle serait un simple
  -- `if` dans une Server Action, donc contournable.
  tournoi_id  uuid NOT NULL,
  equipe_id   uuid NOT NULL,
  joueur_id   uuid NOT NULL REFERENCES arena.joueurs(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (equipe_id, joueur_id),
  UNIQUE (tournoi_id, joueur_id),
  FOREIGN KEY (equipe_id, tournoi_id)
    REFERENCES arena.equipes(id, tournoi_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_arena_equipes_membres_joueur
  ON arena.equipes_membres(joueur_id);

-- ============================================================================
-- 3. arena.matchs : un camp peut désormais être une équipe.
-- ============================================================================
ALTER TABLE arena.matchs
  ADD COLUMN IF NOT EXISTS equipe1_id uuid REFERENCES arena.equipes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS equipe2_id uuid REFERENCES arena.equipes(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS equipe_gagnante_id uuid REFERENCES arena.equipes(id) ON DELETE CASCADE;

-- « Un match validé a forcément un vainqueur » — désormais côté joueur OU
-- côté équipe. On remplace la contrainte de 001 sans l'affaiblir.
ALTER TABLE arena.matchs DROP CONSTRAINT IF EXISTS valide_implique_gagnant;
ALTER TABLE arena.matchs
  ADD CONSTRAINT valide_implique_gagnant
  CHECK (
    statut <> 'VALIDE'
    OR gagnant_id IS NOT NULL
    OR equipe_gagnante_id IS NOT NULL
  );

-- Un match ne mélange pas les genres : soit des joueurs, soit des équipes.
ALTER TABLE arena.matchs DROP CONSTRAINT IF EXISTS matchs_camps_homogenes;
ALTER TABLE arena.matchs
  ADD CONSTRAINT matchs_camps_homogenes
  CHECK (
    (equipe1_id IS NULL AND equipe2_id IS NULL AND equipe_gagnante_id IS NULL)
    OR (joueur1_id IS NULL AND joueur2_id IS NULL AND gagnant_id IS NULL)
  );

-- ============================================================================
-- 4. Le verrou de validation doit couvrir le vainqueur PAR ÉQUIPE.
--    Sans cette mise à jour, on aurait pu réécrire le vainqueur d'un match
--    d'équipe déjà validé — exactement le trou que le trigger de 001 ferme
--    côté joueurs. On remplace la fonction (le trigger la rappelle par nom).
-- ============================================================================
CREATE OR REPLACE FUNCTION arena.verrou_match_valide()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.statut = 'VALIDE' AND (
       NEW.score_j1           IS DISTINCT FROM OLD.score_j1 OR
       NEW.score_j2           IS DISTINCT FROM OLD.score_j2 OR
       NEW.gagnant_id         IS DISTINCT FROM OLD.gagnant_id OR
       NEW.equipe_gagnante_id IS DISTINCT FROM OLD.equipe_gagnante_id OR
       NEW.statut             IS DISTINCT FROM OLD.statut
     ) THEN
    RAISE EXCEPTION 'Match % : résultat validé, modification interdite (règlement §3).', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 5. arena.elo_joueurs — classement de force, INTERNE (jamais public).
-- ============================================================================
CREATE TABLE IF NOT EXISTS arena.elo_joueurs (
  joueur_id   uuid NOT NULL REFERENCES arena.joueurs(id) ON DELETE CASCADE,
  discipline  text NOT NULL CHECK (discipline IN ('ESPORT', 'SPORT')),
  -- 1000 = note de départ. Choix arbitraire mais classique ; seul l'ÉCART
  -- entre deux notes a un sens, pas la valeur absolue.
  note        int NOT NULL DEFAULT 1000 CHECK (note BETWEEN 0 AND 4000),
  nb_matchs   int NOT NULL DEFAULT 0 CHECK (nb_matchs >= 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (joueur_id, discipline)
);

-- ============================================================================
-- 6. Droits et RLS des nouvelles tables.
--    Rappel : le GRANT de la migration 001 portait sur « ALL TABLES » à
--    l'instant T — il ne couvre PAS les tables créées ensuite. Il faut donc
--    les accorder explicitement, sinon PostgREST renvoie 401/404.
-- ============================================================================
GRANT SELECT ON arena.equipes, arena.equipes_membres TO anon, authenticated;
GRANT ALL    ON arena.equipes, arena.equipes_membres TO service_role;

-- ELO : AUCUN droit pour anon/authenticated. Table serveur-seule.
REVOKE ALL ON arena.elo_joueurs FROM anon, authenticated;
GRANT ALL  ON arena.elo_joueurs TO service_role;

ALTER TABLE arena.equipes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.equipes_membres  ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.elo_joueurs      ENABLE ROW LEVEL SECURITY;

-- Équipes : visibles dès que le tournoi parent l'est (même règle que matchs).
DROP POLICY IF EXISTS equipes_lecture ON arena.equipes;
CREATE POLICY equipes_lecture ON arena.equipes
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM arena.tournois t WHERE t.id = tournoi_id
      AND (t.statut <> 'BROUILLON' OR arena.est_staff(t.organisation_id))));

DROP POLICY IF EXISTS equipes_membres_lecture ON arena.equipes_membres;
CREATE POLICY equipes_membres_lecture ON arena.equipes_membres
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM arena.tournois t WHERE t.id = tournoi_id
      AND (t.statut <> 'BROUILLON' OR arena.est_staff(t.organisation_id))));

-- arena.elo_joueurs : RLS activée et VOLONTAIREMENT aucune policy.
-- En Postgres, RLS sans policy = tout est refusé. service_role passe outre
-- (BYPASSRLS), ce qui est exactement le comportement voulu.

COMMIT;

-- ============================================================================
-- ⚠️ APRÈS EXÉCUTION : Supabase Dashboard → Settings → API → « Exposed
--    schemas / tables » → cocher arena.equipes et arena.equipes_membres.
--    Ne PAS exposer arena.elo_joueurs. (Le nouveau dashboard exige de cocher
--    chaque table en plus du schéma — piège rencontré le 12/08 avec les 8
--    premières tables.)
-- ============================================================================

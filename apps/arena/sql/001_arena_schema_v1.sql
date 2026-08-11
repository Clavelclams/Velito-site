-- ============================================================================
-- ARENA — Migration 001 (RÉVISÉE Lot 1) : schéma dédié `arena.`
-- ============================================================================
-- ⚠️ Révision d'août 2026 : la première version de ce fichier créait des tables
--    `public.arena_*`. Elle n'a JAMAIS été exécutée en base → on la remplace
--    proprement par le schéma dédié `arena.`, conforme au pattern de
--    l'écosystème (vea. / shared. / interactive.).
--
-- DÉCISIONS STRUCTURANTES (feuille de route ARENA v2) :
--   1. Pas de tables organisations/membres propres à arena : on RÉUTILISE
--      shared.organizations + shared.user_permissions (scope owner/editor
--      = staff arena). Un seul système de droits dans tout l'écosystème.
--   2. Verrou de validation EN BASE (trigger) : un match VALIDE ne peut plus
--      changer de score/gagnant, même via service_role. (Audit Lot 0 §2)
--   3. Journal arena.logs et consentements APPEND-ONLY (trigger anti
--      update/delete) : l'historisation promise par le règlement est
--      garantie par Postgres, pas par la discipline du code.
--   4. RGPD (Lot 1) : consentements granulaires journalisés, année de
--      naissance seule (minimisation), mineur ⇒ profil non public (contrainte).
--
-- ⚠️ APRÈS EXÉCUTION, OBLIGATOIRE : Supabase Dashboard → Settings → API →
--    "Exposed schemas" → ajouter `arena` (sinon PostgREST renvoie 404 sur
--    toutes les requêtes .schema('arena')).
--
-- Rappel piège Postgres 15+ : toute VUE future doit recevoir
--    ALTER VIEW arena.ma_vue SET (security_invoker = on);
-- (incident réel vea.compta_balance_par_saison). Aucune vue dans cette migration.
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS arena;
GRANT USAGE ON SCHEMA arena TO anon, authenticated, service_role;

-- ============================================================================
-- Helper de droits : l'utilisateur courant est-il staff (owner/editor) de
-- l'organisation ? SECURITY DEFINER car shared.user_permissions n'est pas
-- lisible par anon/authenticated directement ; search_path verrouillé.
-- Utilisé PAR LES POLICIES RLS → l'isolation multi-tenant est garantie par la
-- base, pas seulement par un filtre applicatif (point de vigilance n°1 Lot 1).
-- ============================================================================
CREATE OR REPLACE FUNCTION arena.est_staff(p_organisation uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = shared, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM shared.user_permissions up
    WHERE up.user_id = auth.uid()
      AND up.organization_id = p_organisation
      AND up.scope IN ('owner', 'editor')
  );
$$;

-- ============================================================================
-- arena.joueurs — identité minimale d'un joueur (pseudonymisation par défaut)
-- ============================================================================
CREATE TABLE arena.joueurs (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  pseudo                    text NOT NULL UNIQUE CHECK (char_length(pseudo) BETWEEN 2 AND 32),
  -- RGPD / minimisation : ANNÉE seule, jamais la date complète.
  annee_naissance           int CHECK (annee_naissance BETWEEN 1900 AND 2100),
  est_mineur                boolean NOT NULL DEFAULT false,
  -- <15 ans : horodatage du consentement parental (journal détaillé côté logs)
  consentement_parental_at  timestamptz,
  -- Mode restreint : un mineur n'apparaît dans AUCUN classement public.
  profil_public             boolean NOT NULL DEFAULT true,
  CONSTRAINT mineur_profil_restreint CHECK (NOT est_mineur OR profil_public = false),
  anonymise                 boolean NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now()
);

-- ============================================================================
-- arena.tournois — l'organisation est une shared.organizations (vea, ...)
-- ============================================================================
CREATE TABLE arena.tournois (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid NOT NULL REFERENCES shared.organizations(id),
  titre            text NOT NULL CHECK (char_length(titre) >= 3),
  jeu              text NOT NULL,
  format           text NOT NULL DEFAULT 'ELIMINATION_SIMPLE'
                     CHECK (format IN ('ELIMINATION_SIMPLE')), -- V1 ; double élim + poules au Lot 2
  statut           text NOT NULL DEFAULT 'BROUILLON'
                     CHECK (statut IN ('BROUILLON','OUVERT','EN_COURS','TERMINE','ANNULE')),
  date_debut       timestamptz NOT NULL,
  lieu             text,
  description      text,
  max_joueurs      int CHECK (max_joueurs BETWEEN 2 AND 128),
  qr_token         uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), -- URL publique /t/[token]
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_arena_tournois_orga ON arena.tournois(organisation_id);
CREATE INDEX idx_arena_tournois_statut ON arena.tournois(statut) WHERE statut <> 'BROUILLON';

-- ============================================================================
-- arena.participations — inscription + check-in
-- ============================================================================
CREATE TABLE arena.participations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournoi_id   uuid NOT NULL REFERENCES arena.tournois(id) ON DELETE CASCADE,
  joueur_id    uuid NOT NULL REFERENCES arena.joueurs(id) ON DELETE CASCADE,
  check_in     boolean NOT NULL DEFAULT false,
  check_in_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournoi_id, joueur_id)
);

-- ============================================================================
-- arena.matchs — bracket élimination simple (round/position, cf. lib/bracket.ts)
-- ============================================================================
CREATE TABLE arena.matchs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournoi_id  uuid NOT NULL REFERENCES arena.tournois(id) ON DELETE CASCADE,
  round       int NOT NULL CHECK (round >= 1),
  -- position 0-BASED (0 = haut du bracket) : le moteur lib/bracket.ts repose
  -- dessus (parent = floor(position/2), slot selon parité). Bug réel du
  -- 11/08/2026 : une contrainte >= 1 avait cassé le démarrage en prod.
  position    int NOT NULL CHECK (position >= 0),
  joueur1_id  uuid REFERENCES arena.joueurs(id),
  joueur2_id  uuid REFERENCES arena.joueurs(id),
  score_j1    int CHECK (score_j1 >= 0),
  score_j2    int CHECK (score_j2 >= 0),
  is_bye      boolean NOT NULL DEFAULT false,
  gagnant_id  uuid REFERENCES arena.joueurs(id),
  statut      text NOT NULL DEFAULT 'A_JOUER'
                CHECK (statut IN ('A_JOUER','EN_COURS','TERMINE','LITIGIEUX','VALIDE')),
  saisi_par   uuid REFERENCES auth.users(id),
  valide_par  uuid REFERENCES auth.users(id),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournoi_id, round, position),
  -- Un match validé a forcément un gagnant (sauf... jamais).
  CONSTRAINT valide_implique_gagnant CHECK (statut <> 'VALIDE' OR gagnant_id IS NOT NULL)
);
CREATE INDEX idx_arena_matchs_tournoi ON arena.matchs(tournoi_id, round, position);

-- VERROU DE VALIDATION EN BASE (audit Lot 0) : une fois VALIDE, le résultat
-- d'un match est figé — même le service_role ne peut plus le réécrire.
-- (Un trigger s'exécute quel que soit le rôle, contrairement à la RLS.)
-- Seule exception : remplir joueur1/joueur2 du match n'est pas concerné,
-- car le verrou ne s'applique qu'aux lignes DÉJÀ validées.
CREATE OR REPLACE FUNCTION arena.verrou_match_valide()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.statut = 'VALIDE' AND (
       NEW.score_j1   IS DISTINCT FROM OLD.score_j1 OR
       NEW.score_j2   IS DISTINCT FROM OLD.score_j2 OR
       NEW.gagnant_id IS DISTINCT FROM OLD.gagnant_id OR
       NEW.statut     IS DISTINCT FROM OLD.statut
     ) THEN
    RAISE EXCEPTION 'Match % : résultat validé, modification interdite (règlement §3).', OLD.id;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_arena_verrou_match_valide
  BEFORE UPDATE ON arena.matchs
  FOR EACH ROW EXECUTE FUNCTION arena.verrou_match_valide();

-- ============================================================================
-- arena.logs — journal d'audit APPEND-ONLY (règlement : « tout est historisé »)
-- ============================================================================
CREATE TABLE arena.logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  acteur_id   uuid REFERENCES auth.users(id),
  action      text NOT NULL,   -- TOURNOI_DEMARRE, SCORE_SAISI, SCORE_MODIFIE, MATCH_VALIDE, JOUEUR_CHECKIN, CONSENTEMENT, ...
  tournoi_id  uuid REFERENCES arena.tournois(id) ON DELETE SET NULL,
  match_id    uuid REFERENCES arena.matchs(id) ON DELETE SET NULL,
  detail      jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_arena_logs_tournoi ON arena.logs(tournoi_id, created_at);

-- ============================================================================
-- arena.consentements — RGPD, journal APPEND-ONLY. L'état courant d'un
-- consentement = la DERNIÈRE ligne (joueur, type). Cases indépendantes,
-- jamais pré-cochées (côté UI), chaque changement horodaté.
-- ============================================================================
CREATE TABLE arena.consentements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  joueur_id   uuid NOT NULL REFERENCES arena.joueurs(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN (
                'CGU',                        -- conditions d'utilisation
                'AFFICHAGE_PUBLIC',           -- apparaître dans résultats/classements publics
                'COMMUNICATION_PRODUIT',      -- actus ARENA
                'COMMUNICATION_COMMERCIALE')),-- ≠ produit : case distincte (exigence RGPD)
  accorde     boolean NOT NULL,
  source      text NOT NULL DEFAULT 'web',   -- web / staff / import
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_arena_consentements_joueur ON arena.consentements(joueur_id, type, created_at DESC);

-- Immutabilité des journaux : interdit à TOUT rôle (trigger > RLS).
CREATE OR REPLACE FUNCTION arena.interdire_modification()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Table %.% : journal en append-only, % interdit.',
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP;
END;
$$;
CREATE TRIGGER trg_arena_logs_append_only
  BEFORE UPDATE OR DELETE ON arena.logs
  FOR EACH ROW EXECUTE FUNCTION arena.interdire_modification();
CREATE TRIGGER trg_arena_consentements_append_only
  BEFORE UPDATE OR DELETE ON arena.consentements
  FOR EACH ROW EXECUTE FUNCTION arena.interdire_modification();

-- ============================================================================
-- arena.badges — socle commun (attribution automatique au Lot 4)
-- ============================================================================
CREATE TABLE arena.badges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,   -- ex: PREMIER_TOURNOI, CHAMPION, FIDELE
  nom         text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE arena.badges_joueurs (
  joueur_id    uuid NOT NULL REFERENCES arena.joueurs(id) ON DELETE CASCADE,
  badge_id     uuid NOT NULL REFERENCES arena.badges(id) ON DELETE CASCADE,
  tournoi_id   uuid REFERENCES arena.tournois(id) ON DELETE SET NULL,
  attribue_le  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (joueur_id, badge_id)
);

-- ============================================================================
-- RLS — lecture publique filtrée par Postgres, écritures via service_role
-- (Server Actions après requireStaff). Aucune policy d'écriture pour
-- authenticated : la surface d'écriture directe est nulle par défaut.
-- ============================================================================
ALTER TABLE arena.joueurs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.tournois        ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.participations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.matchs          ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.consentements   ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.badges          ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.badges_joueurs  ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON ALL TABLES IN SCHEMA arena TO anon, authenticated;
GRANT ALL    ON ALL TABLES IN SCHEMA arena TO service_role;

-- Joueurs : pseudo public (pseudonymisation par défaut), sauf anonymisés.
CREATE POLICY joueurs_lecture ON arena.joueurs
  FOR SELECT USING (anonymise = false);

-- Tournois : publics sauf brouillons ; le staff de l'orga voit tout.
CREATE POLICY tournois_lecture ON arena.tournois
  FOR SELECT USING (statut <> 'BROUILLON' OR arena.est_staff(organisation_id));

-- Participations / matchs : visibles si le tournoi parent est visible.
CREATE POLICY participations_lecture ON arena.participations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM arena.tournois t WHERE t.id = tournoi_id
      AND (t.statut <> 'BROUILLON' OR arena.est_staff(t.organisation_id))));
CREATE POLICY matchs_lecture ON arena.matchs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM arena.tournois t WHERE t.id = tournoi_id
      AND (t.statut <> 'BROUILLON' OR arena.est_staff(t.organisation_id))));

-- Logs : staff de l'organisation du tournoi uniquement. Jamais public.
CREATE POLICY logs_lecture_staff ON arena.logs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM arena.tournois t WHERE t.id = tournoi_id
      AND arena.est_staff(t.organisation_id)));

-- Consentements : chaque joueur (avec compte) lit les siens. Point.
CREATE POLICY consentements_lecture_soi ON arena.consentements
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM arena.joueurs j WHERE j.id = joueur_id AND j.user_id = auth.uid()));

-- Badges : lecture publique (le catalogue et les attributions sont publics).
CREATE POLICY badges_lecture ON arena.badges FOR SELECT USING (true);
CREATE POLICY badges_joueurs_lecture ON arena.badges_joueurs
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM arena.joueurs j WHERE j.id = joueur_id AND j.profil_public = true));

COMMIT;

-- ============================================================================
-- SEED (à exécuter séparément, une fois) — le staff arena = permissions
-- shared existantes. Exemple pour donner les droits sur l'orga VEA :
--
--   INSERT INTO shared.user_permissions (user_id, organization_id, scope)
--   SELECT u.id, o.id, 'owner'
--   FROM auth.users u, shared.organizations o
--   WHERE u.email = 'TON_EMAIL' AND o.slug = 'vea'
--   ON CONFLICT DO NOTHING;
--
-- (Si la ligne existe déjà via VEA, rien à faire : mêmes droits, même table.)
-- ============================================================================

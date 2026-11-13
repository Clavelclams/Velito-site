-- ============================================================================
-- BOÎTES À LIVRES D'AMIENS : schéma `livres` (13/11/2026)
-- À exécuter dans l'éditeur SQL Supabase (projet partagé velito-hub), puis
-- ajouter `livres` aux schémas exposés (Settings > API > Exposed schemas).
-- ============================================================================
-- PRINCIPES (cahier des charges du 30/05/2026) :
--  - Lecture publique des boîtes, sans compte.
--  - AUCUNE donnée personnelle sur les habitants : un signalement ne garde ni
--    nom, ni e-mail, ni adresse IP. Juste la boîte, le type et un message
--    facultatif.
--  - AUCUNE écriture directe depuis le navigateur. Les signalements passent
--    par une action serveur (limite d'abus, validation) qui écrit avec
--    service_role. Les bénévoles écrivent pareil, après contrôle de leurs
--    droits (staff de l'organisation VEA dans shared.user_permissions).
--  - Signalements jamais publics (un message libre peut contenir n'importe
--    quoi) : seuls l'état de la boîte et sa date de mise à jour le sont.
-- Idempotente.
-- ============================================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS livres;

CREATE TABLE IF NOT EXISTS livres.boites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 60),
  nom           text NOT NULL CHECK (char_length(btrim(nom)) BETWEEN 2 AND 80),
  adresse       text CHECK (adresse IS NULL OR char_length(adresse) <= 200),
  quartier      text CHECK (quartier IS NULL OR char_length(quartier) <= 80),
  description   text CHECK (description IS NULL OR char_length(description) <= 1000),
  lat           double precision NOT NULL CHECK (lat BETWEEN 49.7 AND 50.1),
  lng           double precision NOT NULL CHECK (lng BETWEEN 2.0 AND 2.6),
  photo_url     text CHECK (photo_url IS NULL OR photo_url ~ '^https://'),
  etat          text NOT NULL DEFAULT 'inconnu' CHECK (etat IN ('bon', 'a_remplir', 'abimee', 'inconnu')),
  etat_maj_le   timestamptz,
  -- Compteur anonyme : nombre de « j'ai déposé un livre » (V2 du CDC : compteur public).
  depots_total  int NOT NULL DEFAULT 0 CHECK (depots_total >= 0),
  -- Référent bénévole : prénom + initiale seulement (minimisation, CDC §3).
  referent      text CHECK (referent IS NULL OR char_length(referent) <= 40),
  -- D'où vient la boîte : ajoutée par l'asso, existante recensée, posée par la Ville.
  origine       text NOT NULL DEFAULT 'existante' CHECK (origine IN ('existante', 'velito', 'ville', 'budget_participatif')),
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_livres_boites_active ON livres.boites(active);

CREATE TABLE IF NOT EXISTS livres.signalements (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boite_id    uuid NOT NULL REFERENCES livres.boites(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('depot', 'prise', 'vide', 'abimee')),
  message     text CHECK (message IS NULL OR char_length(message) <= 300),
  created_at  timestamptz NOT NULL DEFAULT now(),
  traite_le   timestamptz,
  traite_par  uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_livres_signalements_boite ON livres.signalements(boite_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_livres_signalements_a_traiter ON livres.signalements(created_at) WHERE traite_le IS NULL;

-- Droits ----------------------------------------------------------------------
ALTER TABLE livres.boites ENABLE ROW LEVEL SECURITY;
ALTER TABLE livres.signalements ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA livres TO anon, authenticated, service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA livres FROM anon, authenticated;
GRANT SELECT ON livres.boites TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA livres TO service_role;

DROP POLICY IF EXISTS boites_lecture_publique ON livres.boites;
CREATE POLICY boites_lecture_publique ON livres.boites FOR SELECT USING (active = true);
-- Pas de policy sur signalements : anon et authenticated n'y ont aucun droit.

COMMIT;

-- VÉRIFICATIONS
--   select has_table_privilege('anon','livres.signalements','SELECT');  -- false
--   select has_table_privilege('anon','livres.boites','INSERT');         -- false
-- Retour arrière (avant toute donnée réelle) :
--   DROP SCHEMA livres CASCADE;

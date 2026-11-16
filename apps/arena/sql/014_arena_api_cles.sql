-- ============================================================================
-- 014 : clés de l'API publique (14/11/2026)
--
-- LE BESOIN (doctrine de complémentarité, Lot 4 « API publique par clé ») :
-- un club, une ligue ou un développeur doit pouvoir lire ses tournois ARENA
-- depuis son propre site ou son propre outil, gratuitement. Toornament
-- facture cet accès 229 €/mois ; chez nous il est gratuit, c'est le
-- positionnement.
--
-- POURQUOI UNE CLÉ si les données sont déjà publiques :
--   - savoir QUI consomme l'API (une clé = une organisation, un nom) ;
--   - limiter le débit (120 requêtes par minute et par clé) pour qu'un
--     script mal écrit ne fasse pas tomber le site un jour de tournoi ;
--   - pouvoir couper un abus sans couper tout le monde (révocation).
-- La clé ne donne AUCUN droit en plus : les routes /api/v1 lisent avec le
-- client ANONYME, donc la RLS publique s'applique (pas de brouillon, pas de
-- mineur en mode restreint, colonnes publiques des joueurs seulement).
--
-- SÉCURITÉ DES CLÉS :
--   - la clé complète n'est montrée qu'UNE fois, à la création ; la base ne
--     garde que son empreinte SHA-256 (comme un mot de passe : une fuite de
--     la table ne donne aucune clé utilisable) et un préfixe lisible pour que
--     le staff reconnaisse ses clés ;
--   - tables sans policy RLS et sans GRANT pour anon / authenticated : seul
--     le serveur (service_role) y touche, APRÈS requireStaff() pour la
--     gestion, et via arena.api_consommer() pour la vérification.
--
-- Idempotente (IF NOT EXISTS, CREATE OR REPLACE).
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS arena.api_cles (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  uuid NOT NULL REFERENCES shared.organizations(id) ON DELETE CASCADE,
  nom              text NOT NULL CHECK (char_length(nom) BETWEEN 2 AND 60),
  prefixe          text NOT NULL,
  empreinte        text NOT NULL UNIQUE CHECK (empreinte ~ '^[0-9a-f]{64}$'),
  cree_par         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  cree_le          timestamptz NOT NULL DEFAULT now(),
  revoquee_le      timestamptz,
  dernier_usage_le timestamptz
);
CREATE INDEX IF NOT EXISTS idx_arena_api_cles_orga ON arena.api_cles(organisation_id);

-- Compteur par clé et par minute (fenêtre fixe). Une ligne par minute
-- active, purgée au fil de l'eau (plus d'un jour = supprimée).
CREATE TABLE IF NOT EXISTS arena.api_usage (
  cle_id  uuid NOT NULL REFERENCES arena.api_cles(id) ON DELETE CASCADE,
  minute  timestamptz NOT NULL,
  nb      int NOT NULL DEFAULT 0,
  PRIMARY KEY (cle_id, minute)
);

ALTER TABLE arena.api_cles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena.api_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON arena.api_cles, arena.api_usage FROM anon, authenticated;
GRANT ALL ON arena.api_cles, arena.api_usage TO service_role;

-- ----------------------------------------------------------------------------
-- arena.api_consommer : vérifie une clé et compte la requête, en UNE
-- instruction atomique (INSERT ... ON CONFLICT DO UPDATE) : deux requêtes
-- simultanées ne peuvent pas lire le même compteur et passer toutes les deux.
-- Ne renvoie AUCUNE ligne si la clé est inconnue ou révoquée.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION arena.api_consommer(p_empreinte text, p_limite int DEFAULT 120)
RETURNS TABLE (cle_id uuid, organisation_id uuid, autorise boolean, restant int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
-- Les colonnes de sortie (cle_id, organisation_id) portent le même nom que
-- des colonnes de table : sans cette ligne, « cle_id » serait ambigu.
#variable_conflict use_column
DECLARE
  v_cle  arena.api_cles%ROWTYPE;
  v_nb   int;
  v_min  timestamptz := date_trunc('minute', now());
BEGIN
  SELECT * INTO v_cle FROM arena.api_cles c
   WHERE c.empreinte = p_empreinte AND c.revoquee_le IS NULL;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO arena.api_usage AS u (cle_id, minute, nb)
  VALUES (v_cle.id, v_min, 1)
  ON CONFLICT (cle_id, minute) DO UPDATE SET nb = u.nb + 1
  RETURNING u.nb INTO v_nb;

  -- Une écriture de « dernier usage » par minute au plus, pas par requête.
  IF v_nb = 1 THEN
    UPDATE arena.api_cles SET dernier_usage_le = now() WHERE id = v_cle.id;
    DELETE FROM arena.api_usage WHERE cle_id = v_cle.id AND minute < now() - interval '1 day';
  END IF;

  RETURN QUERY SELECT v_cle.id, v_cle.organisation_id, v_nb <= p_limite, greatest(p_limite - v_nb, 0);
END;
$$;

REVOKE ALL ON FUNCTION arena.api_consommer(text, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION arena.api_consommer(text, int) TO service_role;

COMMIT;

-- Vérification :
-- SELECT to_regclass('arena.api_cles'), to_regclass('arena.api_usage');
-- SELECT has_function_privilege('anon', 'arena.api_consommer(text, int)', 'EXECUTE');  -- attendu : false
--
-- Retour arrière :
-- DROP FUNCTION IF EXISTS arena.api_consommer(text, int);
-- DROP TABLE IF EXISTS arena.api_usage;
-- DROP TABLE IF EXISTS arena.api_cles;

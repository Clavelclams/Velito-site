-- ============================================================================
-- VEA — Previsionnel "monde attendu" : pre-inscription a un evenement A VENIR
-- ============================================================================
-- BUT
--   Le bouton "S'inscrire" de l'agenda enregistre un PREVISIONNEL (qui compte
--   venir) SANS donner d'XP ni de presence. Distinct de vea.presences (le reel
--   du jour J, qui lui donne l'XP via le scan QR).
--
--   - Connecte  : 1 clic -> ligne pour SA fiche participant. "Je ne viens plus"
--                 = suppression de sa ligne.
--   - Non connecte : mini formulaire (prenom, nom, telephone) via RPC guest
--                 qui find_or_create la fiche participant (meme logique que le
--                 scan), puis insere le previsionnel. AUCUN XP.
--
--   Cote admin : "Monde attendu : N" + liste sur /admin/evenements/[id].
--
-- IDEMPOTENT : rejouable (IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vea.preinscriptions_event (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_slug     text NOT NULL,
  participant_id uuid NOT NULL REFERENCES vea.participants(id) ON DELETE CASCADE,
  source         text NOT NULL DEFAULT 'agenda',
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_slug, participant_id)   -- pas de double previsionnel
);

CREATE INDEX IF NOT EXISTS idx_vea_preinsc_event_slug
  ON vea.preinscriptions_event(event_slug);

COMMENT ON TABLE vea.preinscriptions_event IS
  'Previsionnel "monde attendu" par evenement. AUCUN XP (distinct de vea.presences).';

-- ----------------------------------------------------------------------------
-- 2. RLS + GRANT
-- ----------------------------------------------------------------------------
ALTER TABLE vea.preinscriptions_event ENABLE ROW LEVEL SECURITY;

-- Lecture : editor+ vea (dashboard) OU le participant lui-meme (savoir s'il est inscrit)
DROP POLICY IF EXISTS "vea_preinsc_select" ON vea.preinscriptions_event;
CREATE POLICY "vea_preinsc_select" ON vea.preinscriptions_event
  FOR SELECT TO authenticated
  USING (
    vea.is_vea_editor()
    OR participant_id IN (SELECT id FROM vea.participants WHERE user_id = auth.uid())
  );

-- Insert connecte : uniquement pour SA fiche
DROP POLICY IF EXISTS "vea_preinsc_insert_own" ON vea.preinscriptions_event;
CREATE POLICY "vea_preinsc_insert_own" ON vea.preinscriptions_event
  FOR INSERT TO authenticated
  WITH CHECK (
    participant_id IN (SELECT id FROM vea.participants WHERE user_id = auth.uid())
  );

-- Delete ("je ne viens plus") : sa fiche, ou admin
DROP POLICY IF EXISTS "vea_preinsc_delete_own_or_admin" ON vea.preinscriptions_event;
CREATE POLICY "vea_preinsc_delete_own_or_admin" ON vea.preinscriptions_event
  FOR DELETE TO authenticated
  USING (
    vea.is_vea_editor()
    OR participant_id IN (SELECT id FROM vea.participants WHERE user_id = auth.uid())
  );

GRANT SELECT, INSERT, DELETE ON vea.preinscriptions_event TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. RPC guest (anon) : find_or_create participant + insert previsionnel, 0 XP
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION vea.register_preinscription_event(
  p_event_slug text,
  p_prenom     text,
  p_nom        text,
  p_phone      text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vea, public
AS $$
DECLARE
  v_phone          text;
  v_participant_id uuid;
  v_event_id       uuid;
BEGIN
  IF coalesce(trim(p_prenom), '') = '' OR coalesce(trim(p_nom), '') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Prenom et nom requis.');
  END IF;

  v_phone := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  IF length(v_phone) < 8 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Numero de telephone invalide.');
  END IF;

  -- L'evenement doit exister (et ne pas etre annule)
  SELECT id INTO v_event_id
  FROM vea.evenements
  WHERE event_slug = p_event_slug
    AND coalesce(statut, '') <> 'annule'
  LIMIT 1;

  IF v_event_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Evenement introuvable.');
  END IF;

  -- find_or_create participant (par telephone normalise + nom/prenom insensibles a la casse)
  SELECT id INTO v_participant_id
  FROM vea.participants
  WHERE regexp_replace(coalesce(phone, ''), '\s', '', 'g') = v_phone
    AND lower(nom)    = lower(trim(p_nom))
    AND lower(prenom) = lower(trim(p_prenom))
  LIMIT 1;

  IF v_participant_id IS NULL THEN
    INSERT INTO vea.participants (prenom, nom, phone, pre_inscrit)
    VALUES (trim(p_prenom), trim(p_nom), v_phone, true)
    RETURNING id INTO v_participant_id;
  END IF;

  -- previsionnel (idempotent)
  INSERT INTO vea.preinscriptions_event (event_slug, participant_id, source)
  VALUES (p_event_slug, v_participant_id, 'agenda')
  ON CONFLICT (event_slug, participant_id) DO NOTHING;

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN others THEN
  RETURN jsonb_build_object('success', false, 'error', sqlerrm);
END;
$$;

GRANT EXECUTE ON FUNCTION vea.register_preinscription_event(text, text, text, text)
  TO anon, authenticated;

COMMIT;

-- VERIF rapide :
--   SELECT event_slug, count(*) FROM vea.preinscriptions_event GROUP BY 1;

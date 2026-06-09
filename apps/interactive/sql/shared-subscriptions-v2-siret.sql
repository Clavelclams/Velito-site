-- ============================================================================
-- VELITO INTERACTIVE — Subscriptions V2 : SIRET + statut compte
-- À exécuter APRÈS shared-subscriptions-v1.sql.
-- ============================================================================
-- POURQUOI :
--   - Distinguer "établissement" (siret valide) vs "particulier" (pas de siret)
--   - Les établissements bénéficient de l'essai 7 jours gratuit
--   - Les particuliers : seul Loup-Garou est gratuit, le reste nécessite un
--     abonnement payant DIRECT (pas d'essai)
-- ============================================================================

BEGIN;

ALTER TABLE shared.subscriptions
  ADD COLUMN IF NOT EXISTS siret text,
  ADD COLUMN IF NOT EXISTS siren text,
  /** 'establishment' (siret valide) | 'individual' (particulier) */
  ADD COLUMN IF NOT EXISTS account_type text DEFAULT 'individual'
    CHECK (account_type IN ('establishment','individual'));

COMMENT ON COLUMN shared.subscriptions.siret IS
  'SIRET (14 chiffres) de l''établissement. NULL si particulier.';
COMMENT ON COLUMN shared.subscriptions.siren IS
  'SIREN (9 chiffres) = les 9 premiers du SIRET.';
COMMENT ON COLUMN shared.subscriptions.account_type IS
  'establishment ou individual. Conditionne accès à l''essai gratuit.';

-- Index pour anti-doublon : un même SIRET ne peut activer plusieurs essais
CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_siret
  ON shared.subscriptions(siret)
  WHERE siret IS NOT NULL;

-- Update du helper pour intégrer la règle "particuliers = pas d'essai"
CREATE OR REPLACE FUNCTION shared.has_active_subscription(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  sub_row shared.subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO sub_row FROM shared.subscriptions WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  -- Essai en cours (seulement pour les établissements)
  IF sub_row.plan = 'trial'
     AND sub_row.account_type = 'establishment'
     AND sub_row.trial_ends_at > now() THEN
    RETURN true;
  END IF;
  -- Abonnement payant (établissement OU particulier)
  IF sub_row.plan IN ('early_adopter','standard','multi_sites')
     AND sub_row.paid_until IS NOT NULL
     AND sub_row.paid_until > now() THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMIT;

SELECT 'Subscriptions v2 OK — SIRET + account_type + helper mis à jour' AS status;

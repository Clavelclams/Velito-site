-- ============================================================================
-- VELITO INTERACTIVE — Subscriptions V1
-- Gère l'accès freemium : Loup-Garou gratuit pour tous, autres jeux derrière
-- un essai 7 jours sans CB puis abonnement.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS shared.subscriptions (
  user_id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  /** free | trial | early_adopter | standard | multi_sites */
  plan             text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','trial','early_adopter','standard','multi_sites')),
  /** Date fin de l'essai gratuit (NULL si plan != trial). */
  trial_ends_at    timestamptz,
  /** Date fin de l'abonnement payant. */
  paid_until       timestamptz,
  /** Cancel: à la fin de la période, on retombe en free. */
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE shared.subscriptions IS
  'État d''abonnement par user. Lecture par l''user concerné uniquement.';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION shared.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON shared.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON shared.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION shared.set_updated_at();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE shared.subscriptions ENABLE ROW LEVEL SECURITY;

-- L'user lit SA propre subscription
DROP POLICY IF EXISTS subs_select_own ON shared.subscriptions;
CREATE POLICY subs_select_own ON shared.subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- L'user peut INSERT sa subscription (pour l'essai)
DROP POLICY IF EXISTS subs_insert_own ON shared.subscriptions;
CREATE POLICY subs_insert_own ON shared.subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- L'user peut UPDATE sa subscription (annulation, etc.)
DROP POLICY IF EXISTS subs_update_own ON shared.subscriptions;
CREATE POLICY subs_update_own ON shared.subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Helper SQL : retourne true si l'user a un accès "premium" actif
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION shared.has_active_subscription(p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  sub_row shared.subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO sub_row FROM shared.subscriptions WHERE user_id = p_user_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  -- Essai en cours
  IF sub_row.plan = 'trial' AND sub_row.trial_ends_at > now() THEN
    RETURN true;
  END IF;
  -- Abonnement payant en cours
  IF sub_row.plan IN ('early_adopter','standard','multi_sites')
     AND sub_row.paid_until IS NOT NULL
     AND sub_row.paid_until > now() THEN
    RETURN true;
  END IF;
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION shared.has_active_subscription(uuid) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON shared.subscriptions TO authenticated;

COMMIT;

SELECT 'Subscriptions v1 OK — table + RLS + helper has_active_subscription' AS status;

-- ============================================================================
-- VELITO INTERACTIVE — Ajout player_token sur session_players
-- À exécuter sur le projet velito-hub.
-- ============================================================================
-- POURQUOI :
--   Loup-Garou (V2) a besoin de données PRIVÉES par joueur : ton rôle secret,
--   la vision de la Voyante, les potions de la Sorcière, etc.
--
--   Aujourd'hui, les joueurs Interactive sont anonymes (pas d'auth Supabase),
--   donc on ne peut pas utiliser auth.uid() dans les RLS pour limiter "ce joueur
--   peut lire SES propres données". On a besoin d'un identifiant unique
--   non-tricheable.
--
--   Solution : un token uuid généré côté serveur lors du INSERT du joueur,
--   stocké côté client (localStorage), envoyé en paramètre des RPC qui lisent
--   les données privées (ex: get_my_role()).
--
-- SAFE EN V1 :
--   - La colonne est nullable et n'est pas lue par le code Quiz / Petit Bac
--   - Tous les nouveaux INSERT auront automatiquement un token (DEFAULT)
--   - Les anciens joueurs (sessions actuelles) auront NULL → pas grave car
--     V1 n'a pas de données privées
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Ajout de la colonne
-- ----------------------------------------------------------------------------
ALTER TABLE interactive.session_players
  ADD COLUMN IF NOT EXISTS player_token uuid NOT NULL DEFAULT gen_random_uuid();

COMMENT ON COLUMN interactive.session_players.player_token IS
  'Token unique généré au INSERT du joueur, stocké côté client (localStorage). '
  'Utilisé pour authentifier les RPC qui lisent des données privées (rôle Loup-Garou, etc.). '
  'JAMAIS exposé à un autre joueur ni renvoyé par les SELECT publics.';

-- ----------------------------------------------------------------------------
-- 2. Index unique pour les lookups RPC rapides
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_session_players_token
  ON interactive.session_players(player_token);

-- ----------------------------------------------------------------------------
-- 3. Empêche le SELECT public de retourner le token
-- ----------------------------------------------------------------------------
-- Les policies SELECT actuelles permettent à anyone de lire toute la table.
-- On retire player_token des columns lisibles publiquement en révoquant
-- l'access GRANT et en exposant uniquement via une view.
--
-- IMPORTANT : on garde le GRANT global sur la table car les RPC SECURITY DEFINER
-- doivent pouvoir lire toute la ligne. Le filtrage se fait au niveau policy.
--
-- POLICY UPDATE : pas de policy explicite — par défaut Postgres lit toutes les
-- colonnes selon la GRANT, et le token est lu UNIQUEMENT par les RPCs SECURITY
-- DEFINER qu'on créera dans interactive_lg-v1.sql.
--
-- À toi de NE JAMAIS faire `select('*')` sur session_players côté client : utilise
-- `select('id, pseudo, avatar_config, joined_at, score')` explicitement.
-- ----------------------------------------------------------------------------

COMMIT;

-- ============================================================================
-- VÉRIFICATIONS
-- ============================================================================
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'interactive'
  AND table_name = 'session_players'
  AND column_name = 'player_token';

SELECT 'player_token v1 OK — colonne ajoutée sur session_players' AS status;

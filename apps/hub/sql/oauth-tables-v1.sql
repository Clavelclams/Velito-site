-- ============================================================================
-- VELITO HUB — OAuth 2.0 / OIDC Authorization Server : tables V1 — 30/05/2026
-- À exécuter sur le projet velito-hub. Voir docs/OAUTH_ARCHITECTURE.md.
-- ============================================================================
-- CE QUE CETTE MIGRATION CRÉE :
--   1. shared.oauth_clients              — apps qui peuvent demander des tokens
--   2. shared.oauth_authorization_codes  — codes éphémères 60s (PKCE flow)
--   3. shared.oauth_refresh_tokens       — refresh tokens avec rotation + family
--   4. shared.oauth_consents             — consentements user × app × scopes
--   5. shared.oauth_jwks                 — paires RSA pour signer les JWT
--   6. RLS server-only (PAS de policy pour anon/authenticated)
--   7. Helper cleanup_expired_oauth() pour purge périodique
--   8. Seed des 5 first-party clients Velito (interactive, arena, prevention,
--      vena, hub lui-même pour les flows interne futurs)
--
-- CE QUE CETTE MIGRATION NE FAIT PAS :
--   - La paire RSA pour shared.oauth_jwks NE peut PAS être générée en SQL pur
--     (Postgres + pgcrypto ne supportent pas keypair generation directement).
--     → Voir scripts/generate-oauth-jwks.mjs (Node openssl) + INSERT manuel.
--     Ça doit être fait UNE fois après cette migration. Voir doc OAuth §2.4.
--
-- SÉPARATION VEA :
--   VEA n'est PAS dans la seed des oauth_clients. C'est volontaire (cf.
--   docs/SSO_ARCHITECTURE.md §7 bis — séparation asso/SASU).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. oauth_clients — apps autorisées à demander des tokens
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared.oauth_clients (
  client_id        text PRIMARY KEY,
  client_secret    text,                                 -- NULL = client public (SPA, mobile, popup)
  name             text NOT NULL,
  description      text,
  logo_url         text,
  redirect_uris    text[] NOT NULL,                      -- whitelist EXACTE (pas de glob ici, validation stricte au /oauth/authorize)
  allowed_scopes   text[] NOT NULL DEFAULT ARRAY['openid','email','profile'],
  is_first_party   boolean NOT NULL DEFAULT false,       -- true → skip consent automatique
  created_at       timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE shared.oauth_clients IS
  'Apps OAuth autorisées à demander des tokens depuis hub.velito.fr. Voir docs/OAUTH_ARCHITECTURE.md §3.';

-- ----------------------------------------------------------------------------
-- 2. oauth_authorization_codes — codes éphémères (PKCE flow)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared.oauth_authorization_codes (
  code                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id              text NOT NULL REFERENCES shared.oauth_clients(client_id),
  user_id                uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri           text NOT NULL,                  -- doit matcher 1:1 entre /authorize et /token (anti substitution)
  scope                  text[] NOT NULL,
  code_challenge         text NOT NULL,                  -- SHA256(code_verifier) côté client — PKCE RFC 7636
  code_challenge_method  text NOT NULL CHECK (code_challenge_method = 'S256'),  -- on REFUSE 'plain'
  nonce                  text,                           -- inclus dans id_token (OIDC anti-replay)
  expires_at             timestamptz NOT NULL DEFAULT (now() + interval '60 seconds'),
  consumed_at            timestamptz,                    -- single-use : NULL = utilisable, sinon brûlé
  created_at             timestamptz NOT NULL DEFAULT now()
);

-- Index sur expires_at pour le cleanup, partial pour ne pas indexer les codes déjà consommés.
CREATE INDEX IF NOT EXISTS idx_oauth_codes_expires
  ON shared.oauth_authorization_codes(expires_at)
  WHERE consumed_at IS NULL;

COMMENT ON TABLE shared.oauth_authorization_codes IS
  'Codes d''autorisation courte durée du flow Authorization Code + PKCE. Single-use (consumed_at).';

-- ----------------------------------------------------------------------------
-- 3. oauth_refresh_tokens — opaques, single-use, family-revocable
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared.oauth_refresh_tokens (
  token            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        text NOT NULL REFERENCES shared.oauth_clients(client_id),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope            text[] NOT NULL,
  family_id        uuid NOT NULL DEFAULT gen_random_uuid(),  -- chaîne de rotation : si un ancien token est ré-utilisé, on révoque TOUTE la family (anti replay)
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_rt_user
  ON shared.oauth_refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_rt_family
  ON shared.oauth_refresh_tokens(family_id);

COMMENT ON TABLE shared.oauth_refresh_tokens IS
  'Refresh tokens opaques avec rotation single-use + family revocation. Pattern RFC 6819 §5.2.2.3.';

-- ----------------------------------------------------------------------------
-- 4. oauth_consents — l'user accepte les scopes une fois pour une app
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared.oauth_consents (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id   text NOT NULL REFERENCES shared.oauth_clients(client_id),
  scope       text[] NOT NULL,                           -- les scopes acceptés
  granted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_id)
);

COMMENT ON TABLE shared.oauth_consents IS
  'Trace RGPD du consentement utilisateur. Permet de skip le consent screen aux passages suivants sauf si scope change.';

-- ----------------------------------------------------------------------------
-- 5. oauth_jwks — paires RSA pour signer les JWT (access_token + id_token)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shared.oauth_jwks (
  kid            text PRIMARY KEY,                      -- key id, référencé dans le header `kid` du JWT
  alg            text NOT NULL DEFAULT 'RS256',
  use_for        text NOT NULL DEFAULT 'sig',           -- "use" est un mot réservé en SQL → use_for. Mappé à JWK "use":"sig" via la vue/JS
  private_pem    text NOT NULL,                         -- ⚠️ secret absolu, JAMAIS exposé, jamais commité
  public_jwk     jsonb NOT NULL,                        -- exposée via GET /jwks.json
  created_at     timestamptz NOT NULL DEFAULT now(),
  rotated_at     timestamptz                            -- NULL = clé active, sinon date de rotation (toujours dans jwks publique tant que des JWT valides référencent ce kid)
);

CREATE INDEX IF NOT EXISTS idx_oauth_jwks_active
  ON shared.oauth_jwks(created_at DESC)
  WHERE rotated_at IS NULL;

COMMENT ON TABLE shared.oauth_jwks IS
  'Paires RSA pour signer les JWT. La clé privée NE quitte jamais cette table. Rotation via INSERT d''une nouvelle ligne + UPDATE de rotated_at sur l''ancienne.';

-- ============================================================================
-- 6. RLS — TOUT EST SERVER-ONLY (aucun client navigateur ne doit lire ces tables)
-- ============================================================================
-- Toutes ces tables sont accessibles UNIQUEMENT via service_role (côté serveur)
-- ou via des fonctions SECURITY DEFINER dédiées (qu'on créera en Phase 3).
-- On active RLS mais on ne crée AUCUNE policy → personne d'autre que service_role
-- ne peut lire/écrire. C'est volontaire : la sécurité OAuth ne se fait JAMAIS
-- au niveau RLS Postgres, toujours au niveau code applicatif côté serveur.

ALTER TABLE shared.oauth_clients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.oauth_authorization_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.oauth_refresh_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.oauth_consents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.oauth_jwks                  ENABLE ROW LEVEL SECURITY;

-- Pas de GRANT à anon/authenticated. Seul service_role (super-user implicit) y a accès.

-- ============================================================================
-- 7. Helper cleanup — purge périodique des tokens expirés
-- ============================================================================
-- À appeler via Vercel cron ou Supabase pg_cron toutes les heures.
-- On garde 1h de marge sur les codes (pour debug) et 7j sur les refresh tokens
-- (au cas où un client refresh juste après expiration et veut du contexte).
CREATE OR REPLACE FUNCTION shared.cleanup_expired_oauth()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = shared, public
AS $$
  DELETE FROM shared.oauth_authorization_codes
   WHERE expires_at < now() - interval '1 hour';

  DELETE FROM shared.oauth_refresh_tokens
   WHERE expires_at < now() - interval '7 days'
      OR revoked_at < now() - interval '7 days';
$$;

COMMENT ON FUNCTION shared.cleanup_expired_oauth() IS
  'Purge les codes/refresh tokens expirés. À appeler en cron (toutes les heures).';

-- ============================================================================
-- 8. Seed des first-party clients Velito
-- ============================================================================
-- 5 clients VENA-side (PAS VEA — cf. séparation §7 bis). On utilise des SPA
-- public clients (client_secret = NULL) parce qu'on est en flow PKCE.
-- Les redirect_uris incluent localhost ET prod pour fluidité dev.

INSERT INTO shared.oauth_clients (client_id, name, description, redirect_uris, is_first_party)
VALUES
  (
    'hub',
    'Hub Velito',
    'Point d''entrée de l''écosystème — galaxie, compte unique, recherche globale.',
    ARRAY[
      'https://hub.velito.fr/oauth/callback',
      'http://localhost:3000/oauth/callback'
    ],
    true
  ),
  (
    'interactive',
    'Velito Interactive',
    'Jeux interactifs pour bars et lieux d''animation.',
    ARRAY[
      'https://interactive.velito.fr/oauth/callback',
      'http://localhost:3004/oauth/callback'
    ],
    true
  ),
  (
    'arena',
    'Velito Arena',
    'Plateforme de tournois esport.',
    ARRAY[
      'https://arena.velito.fr/oauth/callback',
      'http://localhost:3003/oauth/callback'
    ],
    true
  ),
  (
    'prevention',
    'Velito Prévention',
    'Infrastructure de prévention numérique pour structures jeunesse.',
    ARRAY[
      'https://prevention.velito.fr/oauth/callback',
      'http://localhost:3005/oauth/callback'
    ],
    true
  ),
  (
    'vena',
    'VENA Services',
    'Agence numérique amiénoise (SASU).',
    ARRAY[
      'https://velito.fr/oauth/callback',
      'http://localhost:3002/oauth/callback'
    ],
    true
  )
ON CONFLICT (client_id) DO NOTHING;

COMMIT;

-- ============================================================================
-- VÉRIFICATIONS post-migration
-- ============================================================================
SELECT 'oauth_clients' AS table_name, COUNT(*) AS rows FROM shared.oauth_clients
UNION ALL
SELECT 'oauth_authorization_codes', COUNT(*) FROM shared.oauth_authorization_codes
UNION ALL
SELECT 'oauth_refresh_tokens', COUNT(*) FROM shared.oauth_refresh_tokens
UNION ALL
SELECT 'oauth_consents', COUNT(*) FROM shared.oauth_consents
UNION ALL
SELECT 'oauth_jwks', COUNT(*) FROM shared.oauth_jwks
ORDER BY table_name;

SELECT 'OAuth tables v1 OK — reste à INSERER la paire RSA dans shared.oauth_jwks (voir scripts/generate-oauth-jwks.mjs)' AS status;

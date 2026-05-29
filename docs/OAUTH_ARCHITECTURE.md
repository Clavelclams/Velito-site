# Velito OAuth 2.0 / OIDC — Architecture complète

> **Cible** : transformer `hub.velito.fr` en **Identity Provider OAuth/OIDC** complet, conforme RFC 6749 + RFC 7636 (PKCE) + OIDC Core 1.0.
>
> **Pourquoi** : chaque app de l'écosystème (Interactive, Arena, Prévention, futures apps partenaires) pourra demander à un utilisateur de se logger via un popup "Continuer avec VENA" qui fonctionne **comme Google Sign-In**.
>
> **Public de cette doc** : Clavel (lui-même pour son jury CDA avril 2027) + futurs contributeurs.
> **Dernière maj** : 29/05/2026.

---

## 0. Avertissement sécurité

L'authentification est le périmètre le plus sensible d'une app. **Une seule erreur d'archi = comptes compromis en masse**.

Cette doc choisit explicitement des standards industriels (PKCE, JWT signés RSA, state token, nonce, consent screen, refresh tokens). On ne réinvente RIEN.

Si à un moment tu as le moindre doute sur un détail (genre "est-ce que je peux stocker le code en localStorage ?" → NON), **arrête, relis cette doc, relis le RFC**. Le jury CDA te demandera *exactement* ce genre de détails.

---

## 1. Vue d'ensemble

```
                  ┌────────────────────────────────────┐
                  │           Browser utilisateur       │
                  │  (sur interactive.velito.fr/signup) │
                  └──────────────┬──────────────────────┘
                                 │
                       Clic "Continuer avec VENA"
                                 │
                                 ▼
                  ┌────────────────────────────────────┐
                  │  Popup window 480x640 px            │
                  │  → hub.velito.fr/oauth/authorize    │
                  │     ?client_id=interactive          │
                  │     &redirect_uri=…/callback        │
                  │     &response_type=code             │
                  │     &scope=openid+email+profile     │
                  │     &state=<csrf>                   │
                  │     &code_challenge=<sha256>        │
                  │     &code_challenge_method=S256     │
                  └──────────────┬──────────────────────┘
                                 │
                                 ▼
                  ┌────────────────────────────────────┐
                  │  Hub /oauth/authorize handler       │
                  │                                     │
                  │  1. Valide client_id + redirect_uri │
                  │  2. Valide state + PKCE challenge   │
                  │  3. Si pas loggé → /login (form)    │
                  │  4. Si loggé → /oauth/consent       │
                  └──────────────┬──────────────────────┘
                                 │
                                 ▼
                  ┌────────────────────────────────────┐
                  │  Hub /oauth/consent (page)          │
                  │  "Interactive demande accès à :     │
                  │   - ton adresse email               │
                  │   - ton nom & photo de profil       │
                  │   [ Refuser ] [ Autoriser ]         │
                  └──────────────┬──────────────────────┘
                                 │ Click "Autoriser"
                                 │
                                 ▼
                  ┌────────────────────────────────────┐
                  │  Hub génère un AUTHORIZATION CODE   │
                  │  (uuid à courte durée de vie 60s)   │
                  │  stocké en DB avec :                │
                  │   - user_id                         │
                  │   - client_id                       │
                  │   - scope[]                         │
                  │   - code_challenge (déjà reçu)      │
                  │   - expires_at                      │
                  │                                     │
                  │  Redirect vers redirect_uri :       │
                  │   …/callback?code=<UUID>&state=…    │
                  └──────────────┬──────────────────────┘
                                 │
                                 ▼
                  ┌────────────────────────────────────┐
                  │  Popup arrive sur                  │
                  │  interactive.velito.fr/oauth/callback│
                  │                                     │
                  │  1. Vérifie state (anti-CSRF)       │
                  │  2. POST hub /oauth/token avec :    │
                  │     - code                          │
                  │     - code_verifier (PKCE)          │
                  │     - client_id                     │
                  │     - redirect_uri                  │
                  └──────────────┬──────────────────────┘
                                 │
                                 ▼
                  ┌────────────────────────────────────┐
                  │  Hub /oauth/token handler           │
                  │                                     │
                  │  1. Lookup code dans DB             │
                  │  2. Vérifie expiration              │
                  │  3. Vérifie SHA256(verifier) ==     │
                  │     challenge (PKCE check)          │
                  │  4. Vérifie redirect_uri identique  │
                  │  5. Marque code consumed            │
                  │  6. Génère :                        │
                  │     - access_token (JWT RS256)      │
                  │     - id_token (JWT RS256)          │
                  │     - refresh_token (opaque UUID)   │
                  └──────────────┬──────────────────────┘
                                 │ JSON response
                                 ▼
                  ┌────────────────────────────────────┐
                  │  Interactive callback :             │
                  │  1. Pose un cookie de session local │
                  │     (interactive.velito.fr)         │
                  │  2. postMessage({ok:true}) au       │
                  │     window parent                   │
                  │  3. window.close()                  │
                  └──────────────┬──────────────────────┘
                                 │
                                 ▼
                  ┌────────────────────────────────────┐
                  │  Page parent reçoit le message      │
                  │  → router.refresh() → user loggé    │
                  └────────────────────────────────────┘
```

---

## 2. Choix techniques

| Décision | Choix | Pourquoi |
|---|---|---|
| Provider OIDC | **Implémentation manuelle** (pas de lib oidc-provider) | Le jury CDA veut voir QU'ON SAIT comment ça marche. Une lib black-box ne se défend pas. |
| Signature JWT | **RS256** (RSA 2048 bits) | Standard industrie. Permet la vérification par JWKS public. HS256 est rejeté car partage le secret. |
| Storage codes/tokens | Tables Supabase `shared.oauth_*` | Pas de Redis (overkill MVP). Cleanup via `pg_cron` ou job côté Vercel. |
| Consent screen | Page Next.js Server Component sur le hub | Cohérent avec le reste de l'app. |
| PKCE | **Obligatoire** (S256), pas de fallback `plain` | RFC 7636. Protège contre l'interception du code par un attaquant local. |
| State token | UUID v4 côté client, stocké en `sessionStorage` avant le popup | Protège contre CSRF. Vérifié au retour. |
| Nonce | UUID v4 dans l'authorize, inclus dans l'id_token | Anti-replay côté id_token. |
| Refresh tokens | Opaque (UUID), lookup en DB, **single-use** (rotation) | Anti-replay des refresh tokens. |
| Cookie de session Interactive | HttpOnly + Secure + SameSite=Lax, domain spécifique | NE PARTAGE PAS le cookie hub. Chaque app a sa propre session. |

**Note importante** : ce SSO OAuth est **différent** du SSO cookie partagé `.velito.fr` qu'on a fait précédemment. Pourquoi les deux ?

- **Cookie partagé `.velito.fr`** : pour les apps Velito internes (qu'on contrôle). Zéro friction, pas de consent screen, c'est interne.
- **OAuth/OIDC** : pour quand l'app cliente est externe OU quand on veut le pattern "Continuer avec VENA" comme Google. Avec consent screen, scopes, etc.

À terme, les apps Velito internes peuvent profiter des **DEUX** : cookie pour la session navigateur native, OAuth pour les API calls server-to-server avec scopes.

---

## 3. Schéma de base de données

À créer dans le schéma `shared` du projet Supabase `velito-hub`.

```sql
-- ===========================================================================
-- shared.oauth_clients — applications qui peuvent demander des tokens
-- ===========================================================================
CREATE TABLE shared.oauth_clients (
  client_id        text PRIMARY KEY,
  client_secret    text,                 -- NULL pour clients publics (SPA, mobile)
  name             text NOT NULL,
  description      text,
  logo_url         text,
  redirect_uris    text[] NOT NULL,      -- whitelist EXACTE
  allowed_scopes   text[] NOT NULL DEFAULT ARRAY['openid','email','profile'],
  is_first_party   boolean NOT NULL DEFAULT false,  -- skip consent si true
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- Seed initial : nos 5 apps Velito
INSERT INTO shared.oauth_clients (client_id, name, redirect_uris, is_first_party)
VALUES
  ('interactive', 'Velito Interactive', ARRAY['https://interactive.velito.fr/oauth/callback','http://localhost:3004/oauth/callback'], true),
  ('arena',       'Velito Arena',       ARRAY['https://arena.velito.fr/oauth/callback','http://localhost:3003/oauth/callback'], true),
  ('prevention',  'Velito Prévention',  ARRAY['https://prevention.velito.fr/oauth/callback','http://localhost:3005/oauth/callback'], true);

-- ===========================================================================
-- shared.oauth_authorization_codes — codes éphémères (60s) du flow code grant
-- ===========================================================================
CREATE TABLE shared.oauth_authorization_codes (
  code             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        text NOT NULL REFERENCES shared.oauth_clients(client_id),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  redirect_uri     text NOT NULL,
  scope            text[] NOT NULL,
  code_challenge   text NOT NULL,        -- SHA256(verifier) côté client (PKCE)
  code_challenge_method text NOT NULL CHECK (code_challenge_method = 'S256'),
  nonce            text,                 -- inclus dans id_token si OIDC
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '60 seconds'),
  consumed_at      timestamptz,          -- single-use : NULL = utilisable, sinon brûlé
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_oauth_codes_expires ON shared.oauth_authorization_codes(expires_at) WHERE consumed_at IS NULL;

-- ===========================================================================
-- shared.oauth_refresh_tokens — refresh tokens opaques (rotation)
-- ===========================================================================
CREATE TABLE shared.oauth_refresh_tokens (
  token            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        text NOT NULL REFERENCES shared.oauth_clients(client_id),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope            text[] NOT NULL,
  family_id        uuid NOT NULL DEFAULT gen_random_uuid(),  -- pour révoquer toute la chaîne en cas de réutilisation
  expires_at       timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at       timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_oauth_rt_user ON shared.oauth_refresh_tokens(user_id);
CREATE INDEX idx_oauth_rt_family ON shared.oauth_refresh_tokens(family_id);

-- ===========================================================================
-- shared.oauth_consents — l'user accepte une fois, on sauvegarde
-- ===========================================================================
CREATE TABLE shared.oauth_consents (
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id        text NOT NULL REFERENCES shared.oauth_clients(client_id),
  scope            text[] NOT NULL,                 -- les scopes consentis
  granted_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_id)
);

-- ===========================================================================
-- shared.oauth_jwks — paire RSA pour signer les JWT
-- ===========================================================================
CREATE TABLE shared.oauth_jwks (
  kid              text PRIMARY KEY,                -- key id (référence dans le JWT header)
  alg              text NOT NULL DEFAULT 'RS256',
  use              text NOT NULL DEFAULT 'sig',
  private_pem      text NOT NULL,                   -- jamais exposée
  public_jwk       jsonb NOT NULL,                  -- exposée via /jwks.json
  created_at       timestamptz NOT NULL DEFAULT now(),
  rotated_at       timestamptz                      -- NULL = clé active
);

-- ===========================================================================
-- RLS : toutes ces tables sont SERVER-ONLY (accès via SECURITY DEFINER ou
-- service_role). Aucune RLS pour anon/authenticated → on bloque tout par défaut.
-- ===========================================================================
ALTER TABLE shared.oauth_clients               ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.oauth_authorization_codes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.oauth_refresh_tokens        ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.oauth_consents              ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared.oauth_jwks                  ENABLE ROW LEVEL SECURITY;
-- Pas de policy = personne d'autre que service_role ne peut lire/écrire.

-- ===========================================================================
-- Cleanup job (à exécuter via Vercel cron toutes les heures)
-- ===========================================================================
CREATE OR REPLACE FUNCTION shared.cleanup_expired_oauth()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = shared, public
AS $$
  DELETE FROM shared.oauth_authorization_codes WHERE expires_at < now() - interval '1 hour';
  DELETE FROM shared.oauth_refresh_tokens      WHERE expires_at < now() - interval '7 days';
$$;
```

---

## 4. Endpoints (côté hub.velito.fr)

### 4.1 Discovery

**GET `/.well-known/openid-configuration`** — JSON statique
```json
{
  "issuer": "https://hub.velito.fr",
  "authorization_endpoint": "https://hub.velito.fr/oauth/authorize",
  "token_endpoint": "https://hub.velito.fr/oauth/token",
  "userinfo_endpoint": "https://hub.velito.fr/oauth/userinfo",
  "jwks_uri": "https://hub.velito.fr/jwks.json",
  "revocation_endpoint": "https://hub.velito.fr/oauth/revoke",
  "response_types_supported": ["code"],
  "subject_types_supported": ["public"],
  "id_token_signing_alg_values_supported": ["RS256"],
  "scopes_supported": ["openid", "email", "profile"],
  "code_challenge_methods_supported": ["S256"],
  "grant_types_supported": ["authorization_code", "refresh_token"]
}
```

**GET `/jwks.json`** — clés publiques du `shared.oauth_jwks` (uniquement les actives)

### 4.2 Authorization Code flow

**GET `/oauth/authorize`** (Server Component)
- Valide tous les paramètres avant d'afficher quoi que ce soit
- Si user pas loggé → redirect `/login?return=<authorize URL complète>`
- Si user loggé + déjà consenti → génère code, redirect callback
- Si user loggé + pas consenti → redirect `/oauth/consent`

**GET `/oauth/consent`** (Server Component)
- Affiche : nom du client (depuis `oauth_clients.name`), logo, scopes demandés
- Bouton "Autoriser" → Server Action qui :
  1. Insère dans `oauth_consents`
  2. Génère un `oauth_authorization_codes` (60s TTL, single-use)
  3. Redirect `<redirect_uri>?code=<UUID>&state=<state>`
- Bouton "Refuser" → redirect `<redirect_uri>?error=access_denied&state=<state>`

### 4.3 Token endpoint

**POST `/oauth/token`** (Route Handler, pas de Server Component)
- Body `application/x-www-form-urlencoded` (RFC compliant)
- Pour `grant_type=authorization_code` :
  1. Lookup code → vérifier `expires_at > now()` et `consumed_at IS NULL`
  2. Vérifier `redirect_uri` correspond exactement (anti substitution)
  3. Vérifier `SHA256(code_verifier) === code_challenge`
  4. Marquer code consumed (single-use)
  5. Générer `access_token` (JWT RS256, claims: `sub`, `iss`, `aud`, `scope`, `exp` 1h)
  6. Générer `id_token` si scope contient `openid` (claims OIDC : `sub`, `iss`, `aud`, `nonce`, `email`, `name`, `picture`)
  7. Générer `refresh_token` (UUID, stocké dans `oauth_refresh_tokens`)
- Pour `grant_type=refresh_token` :
  1. Lookup token → vérifier non-expired, non-revoked
  2. **Détection réutilisation** : si déjà consommé → révoquer TOUTE la `family_id` (sécurité critique)
  3. Émettre nouveau access_token + nouveau refresh_token (rotation), marquer l'ancien revoked

### 4.4 UserInfo endpoint

**GET `/oauth/userinfo`** — Bearer access_token requis
- Vérifie signature JWT via JWKS interne
- Vérifie `aud` + `iss` + `exp`
- Retourne les claims selon le scope du token (email, profile, ...)

### 4.5 Revocation

**POST `/oauth/revoke`** — sur logout côté client
- Body : `token=<refresh_token>&token_type_hint=refresh_token`
- Marque le token revoked dans DB

---

## 5. Côté client (Interactive et autres apps)

### 5.1 Génération du PKCE pair côté navigateur
```ts
// Au moment du clic sur "Continuer avec VENA"
const code_verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
const code_challenge = base64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code_verifier)));
const state = crypto.randomUUID();
const nonce = crypto.randomUUID();

sessionStorage.setItem('oauth_verifier', code_verifier);
sessionStorage.setItem('oauth_state', state);
sessionStorage.setItem('oauth_nonce', nonce);

const url = new URL('https://hub.velito.fr/oauth/authorize');
url.searchParams.set('client_id', 'interactive');
url.searchParams.set('redirect_uri', `${window.location.origin}/oauth/callback`);
url.searchParams.set('response_type', 'code');
url.searchParams.set('scope', 'openid email profile');
url.searchParams.set('state', state);
url.searchParams.set('nonce', nonce);
url.searchParams.set('code_challenge', code_challenge);
url.searchParams.set('code_challenge_method', 'S256');

const popup = window.open(url.toString(), 'oauth', 'width=480,height=640');
```

### 5.2 Listener postMessage
```ts
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;   // anti-XSS strict
  if (event.data?.type !== 'oauth_callback') return;

  if (event.data.ok) {
    router.refresh();   // le cookie est posé, on re-fetch l'état d'auth
  } else {
    setError(event.data.error ?? 'Connexion annulée');
  }
});
```

### 5.3 Page `/oauth/callback`

Server Component qui :
1. Lit `code` + `state` depuis searchParams
2. Vérifie `state` correspond à celui en sessionStorage (côté client)
3. POST `/oauth/token` avec `code_verifier` (depuis sessionStorage)
4. Reçoit tokens, pose un cookie HttpOnly local
5. Envoie `window.opener.postMessage({type:'oauth_callback', ok:true})`
6. `window.close()`

**Note critique** : le `state` check + `code_verifier` lookup se font côté client (sessionStorage). C'est OK parce que le risque XSS est limité par les CSP qu'on doit configurer.

---

## 6. Sécurité — checklist par menace

| Menace | Mitigation |
|---|---|
| CSRF sur authorize | `state` token vérifié au callback |
| Interception du code (man-in-the-browser) | PKCE — sans le `code_verifier`, le code est inutile |
| Replay de l'id_token | `nonce` vérifié côté client après réception |
| Replay du refresh_token | Single-use + family revocation |
| Open redirect via redirect_uri | Whitelist exacte (pas de glob) dans `oauth_clients.redirect_uris` |
| Substitution redirect_uri | Vérifier au token endpoint que `redirect_uri` est identique à celui de l'authorize |
| Token leakage via URL (referrer) | Token JAMAIS en URL — uniquement POST + headers |
| Token leakage via localStorage | Refresh token en cookie HttpOnly, access token en mémoire React |
| Clickjacking sur consent screen | Header `X-Frame-Options: DENY` + `Content-Security-Policy: frame-ancestors 'none'` |
| Phishing du popup | Bien afficher l'URL `hub.velito.fr` dans le titre du popup + barre d'adresse visible |
| Brute force /login (avant authorize) | Rate limiting via Vercel Edge Middleware (à ajouter) |
| Compromise de la clé privée | Rotation périodique (cron) via `shared.oauth_jwks.rotated_at` |

---

## 7. Roadmap des sessions futures

| Phase | Effort estimé | Bloque quoi |
|---|---|---|
| **2 — SQL + JWKS génération** | 2h | Le reste |
| **3 — Endpoints authorize + token + userinfo + discovery + jwks** | 3-4h | Le flow OAuth fonctionnel |
| **4 — Consent screen + storage** | 2-3h | UX RGPD-compliant + skip pour first-party |
| **5 — Client OAuth Interactive (popup + PKCE + callback)** | 2-3h | UX visible "Continuer avec VENA" comme Google |
| **6 — Tests E2E + audit sécu + doc finale jury** | 2h | Confidence prod |

**Total : 12-15h** sur 5 sessions. Le découpage permet de toujours s'arrêter sur un état cohérent.

---

## 8. Défense jury CDA — points clés à mettre en avant

1. **Conformité standards** : RFC 6749 (OAuth 2.0) + RFC 7636 (PKCE) + OIDC Core 1.0. Pas de bricolage.
2. **PKCE obligatoire** = protection contre l'interception du code dans des contextes mobiles ou browser malveillant. Norme imposée par OAuth 2.1 (la prochaine version du standard).
3. **JWT RS256** = vérifiable par tout serveur via la clé publique JWKS, sans appel à la DB → scaling horizontal.
4. **Refresh token rotation + family revocation** = ce qui distingue les implémentations OAuth amateurs des sérieuses (cf. RFC 6819 section 5.2.2.3).
5. **Consent screen RGPD-friendly** = on demande l'accord explicite et on stocke la preuve.
6. **JWKS rotation** = la clé privée n'est jamais éternelle, on peut la changer sans casser les tokens en cours via le `kid` header.
7. **First-party clients** = on skip le consent pour les apps qu'on contrôle déjà (Interactive, Arena…) → UX fluide tout en gardant le standard pour les apps externes futures.
8. **Différence cookie partagé `.velito.fr` vs OAuth** = on a les deux, on explique pourquoi, on montre qu'on comprend l'arbitrage.

---

## 8 bis. Faille spécifique à NE JAMAIS introduire — "Reset password = signup déguisé"

### Le scénario
1. Tu vas sur `/forgot-password` et tu tapes `victime@target.com`
2. Le site envoie un email "reset your password"
3. La victime n'a aucun compte chez nous mais reçoit le mail
4. Elle clique, le site lui demande de définir un mot de passe
5. → un compte est créé à son nom **sans qu'elle ait jamais voulu s'inscrire**

Variante : c'est l'utilisateur lui-même qui pense avoir oublié son mot de passe alors qu'il n'a jamais créé de compte, et qui se retrouve avec un compte qu'il n'a pas consciemment voulu.

### Pourquoi c'est une faille
- **Pollution de base utilisateur** : on crée des comptes à des emails qui ne nous appartiennent pas.
- **Vecteur de spear-phishing** : un attaquant peut "réveiller" des comptes au nom de cibles précises pour ensuite social-engineer.
- **Atteinte RGPD** : créer un traitement de données personnelles sans consentement explicite est interdit.

### Côté Supabase Auth — ce qui est SAFE et ce qui NE L'EST PAS

| API Supabase | Crée un compte si email inconnu ? | Use case |
|---|---|---|
| `supabase.auth.resetPasswordForEmail(email)` | **NON** (safe par défaut) | Pour le flow reset password |
| `supabase.auth.signUp({email, password})` | **OUI** (c'est le but) | Pour le flow signup, pas pour reset |
| `supabase.auth.signInWithOtp({email, options: {shouldCreateUser: true}})` | **OUI** (NE JAMAIS faire ça pour reset) | Magic link signup (à éviter) |
| `supabase.auth.signInWithOtp({email, options: {shouldCreateUser: false}})` | **NON** (safe) | Magic link sur compte existant uniquement |

### Règles d'or à respecter dans tout le code Velito
1. **Reset password** → uniquement `resetPasswordForEmail()`. Pas de magic link.
2. **Magic link** → si on en met un jour, **toujours `shouldCreateUser: false`** sur les flows "se connecter à un compte existant".
3. **Anti-énumération** → le serveur retourne le même message générique que l'email existe ou pas ("Si un compte existe avec cet email, tu recevras un lien."). Pas de "email inconnu" vs "email envoyé".
4. **Aucun lien dans aucun email envoyé par Velito** ne doit déclencher une création de compte. Les liens reset ne servent qu'à changer le mot de passe d'un compte EXISTANT.
5. **Le seul point d'entrée pour créer un compte = `/signup`** (avec form email/mdp explicite ou bouton OAuth-style "Continuer avec VENA"). Pas d'autre voie cachée.

### Checklist de revue de code à cocher pour chaque PR auth
- [ ] Aucun appel à `signInWithOtp(..., shouldCreateUser: true)` dans la branche
- [ ] Aucun lien email ne mène à une page qui appelle `signUp()`
- [ ] Le message retourné par `/forgot-password` est identique pour email connu et inconnu
- [ ] Aucun email d'invitation/admin n'est wireable depuis le flow "reset"

---

## 9. Limites connues / dette technique (à mentionner si demandé)

- **Pas de rate limiting** sur authorize/token au lancement → à ajouter via Vercel Edge Middleware.
- **Storage des codes en DB plutôt qu'en cache** : OK pour MVP, Redis sera plus performant à 100 req/s.
- **Pas de session management OIDC** (`/oauth/session/end`) : si l'user veut logout de TOUTES les apps en 1 clic, faut l'ajouter.
- **Pas de dynamic client registration** : les clients sont seedés à la main dans `oauth_clients`. Pour ouvrir aux apps tierces, faut un endpoint `/oauth/register` + admin moderation.

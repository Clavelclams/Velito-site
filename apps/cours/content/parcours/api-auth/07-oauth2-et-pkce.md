---
titre: "OAuth 2.0 + PKCE : déléguer l'identité sans partager le mot de passe"
parcours: "api-auth"
ordre: 7
niveau: "expert"
duree: 30
date: 2026-09-09
---

## Le cours

Interactive n'a pas de page de connexion. Quand un utilisateur veut se connecter, Interactive l'envoie au hub, le hub l'authentifie, et renvoie Interactive avec une preuve d'identité. Interactive ne voit jamais le mot de passe. C'est **OAuth 2.0**, et le hub est un **serveur d'autorisation** complet. Cette leçon suit le flow pas à pas, avec les raisons de chaque étape.

**Les rôles.** Le **client** (Interactive) veut savoir qui est l'utilisateur. Le **serveur d'autorisation** (hub) connaît l'utilisateur et émet des jetons. L'**utilisateur** (toi) donne son accord. La **ressource** (les API de l'écosystème) accepte les jetons du hub.

**Le flow Authorization Code, étape par étape.**

1. **Interactive prépare.** Il tire un `state` aléatoire (anti-CSRF : il vérifiera que la réponse correspond à *sa* demande), un `nonce` (anti-rejeu du id_token), et un `code_verifier` (43–128 caractères aléatoires). Il calcule `code_challenge = base64url(sha256(code_verifier))`. Il garde verifier, state, nonce en mémoire.

2. **Redirection vers le hub.** `GET hub.velito.fr/oauth/authorize?client_id=interactive&redirect_uri=https://interactive.velito.fr/callback&response_type=code&scope=openid email&state=…&nonce=…&code_challenge=…&code_challenge_method=S256`.

3. **Le hub valide tout.** `client_id` connu ? `redirect_uri` **exactement** dans la liste du client ? `code_challenge_method` = `S256` (`plain` refusé) ? Scopes autorisés pour ce client ? Si `client_id` ou `redirect_uri` sont invalides → page d'erreur **sur le hub**, pas de redirection (parcours Sécurité, leçon 7). Sinon, erreur renvoyée au `redirect_uri` avec `?error=…&state=…`.

4. **L'utilisateur s'authentifie** si besoin (le hub redirige vers `/login?return=<URL authorize complète>`, puis revient). Si le client est tiers, écran de consentement ; first-party (Interactive), pas de consentement.

5. **Le hub émet un code.** Une chaîne aléatoire, stockée en base avec : `client_id`, `redirect_uri`, `code_challenge`, `user_id`, `nonce`, expiration **60 secondes**, `consumed_at = NULL`. Redirection : `https://interactive.velito.fr/callback?code=…&state=…`.

6. **Interactive vérifie le `state`** (c'est bien sa demande), puis **échange le code** en POST serveur-à-serveur : `POST hub.velito.fr/oauth/token` avec `grant_type=authorization_code&code=…&redirect_uri=…&client_id=…&code_verifier=…` (corps `x-www-form-urlencoded`, pas JSON — la spec).

7. **Le hub vérifie et émet.** Code existant, non consommé, non expiré ? `client_id` et `redirect_uri` identiques à l'étape 2 (anti-substitution) ? `sha256(code_verifier)` = `code_challenge` stocké ? Si tout est bon : marque le code `consumed_at = now()` (**usage unique**), génère `access_token` (JWT 1 h), `id_token` (JWT avec le `nonce`), `refresh_token` (opaque 30 j). Réponse JSON.

8. **Interactive vérifie l'id_token** (signature via JWKS, `iss`, `aud`, `nonce`) et sait qui est l'utilisateur.

**Pourquoi un code, puis un échange ?** L'étape 5 passe par le **navigateur** — une URL, qui finit dans l'historique, le `Referer`, les logs. Un token n'a rien à y faire. Le code, lui, expire en 60 s, ne sert qu'une fois, et **ne vaut rien sans le `code_verifier`** que seul Interactive possède. Les tokens transitent à l'étape 7, en POST, jamais dans une URL.

**Pourquoi PKCE.** Sans lui, quelqu'un qui intercepte le code (XSS sur le callback, log de proxy) pourrait l'échanger contre des tokens. Avec PKCE, il lui faudrait aussi le `code_verifier`, resté en mémoire du client légitime. `S256` obligatoire : `plain` enverrait le verifier en clair dès l'étape 2. PKCE était fait pour les apps mobiles sans secret ; OAuth 2.1 et les bonnes pratiques IETF l'imposent à **tous** les clients, parce qu'il ferme l'injection de code que le `client_secret` ne couvre pas.

**Le rafraîchissement.** Une heure plus tard, l'access token expire. `POST /oauth/token` avec `grant_type=refresh_token&refresh_token=…`. Le hub vérifie en base, **révoque** l'ancien refresh, en émet un nouveau (même `family_id`), plus un nouvel access token. Si un refresh **déjà consommé** revient — donc volé et rejoué — toute la famille est révoquée : victime et voleur dehors, la victime se reconnecte (fiche `hub-rotation-refresh-token-family`).

**OpenID Connect par-dessus.** OAuth donne un access token (« le porteur a le droit de… »). OIDC ajoute le `scope=openid` et l'**id_token** (« voici qui est cette personne » : `sub`, `email`, `name`, `nonce`). Plus `/oauth/userinfo` (les infos de profil contre un access token) et `/.well-known/openid-configuration` (la découverte : où sont les endpoints, quels algorithmes). C'est ce qui fait du hub un fournisseur d'identité et pas seulement un serveur de jetons.

**Ce qui distingue le SSO par cookie du flow OAuth.** Les sept apps Velito partagent un cookie `.velito.fr` — c'est du SSO simple, sans OAuth, qui marche parce que tout est sur un même domaine parent. Le flow OAuth sert quand le client est **ailleurs** : un autre domaine, une app mobile, un tiers. Le hub sait faire les deux ; l'un est un raccourci, l'autre est le protocole.

## À retenir

- Quatre rôles : client, serveur d'autorisation, utilisateur, ressource. Le client ne voit jamais le mot de passe.
- Code (60 s, usage unique, dans l'URL) puis échange en POST (tokens, jamais dans l'URL).
- PKCE S256 : le code ne vaut rien sans le verifier. Obligatoire pour tous les clients.
- `state` anti-CSRF, `nonce` anti-rejeu, `redirect_uri` exact, `aud` vérifié.
- Refresh avec rotation et famille : un rejeu tue tout, la victime se reconnecte.
- OIDC = OAuth + identité (id_token, userinfo, découverte).

## Mise en pratique

Objectif : dérouler le flow à la main avec `curl` contre le hub en local, et casser chaque protection.

1. Hub en local (`npm run dev --filter=hub`), un client enregistré dans `oauth_clients` (utilise celui d'Interactive ou crée-en un de test avec `redirect_uri = http://localhost:9999/cb`).
2. Génère PKCE en Node : `node -e "const c=require('crypto'); const v=c.randomBytes(32).toString('base64url'); const ch=c.createHash('sha256').update(v).digest('base64url'); console.log({v,ch})"`. Garde les deux.
3. Ouvre dans le navigateur : `http://localhost:3000/oauth/authorize?client_id=…&redirect_uri=http://localhost:9999/cb&response_type=code&scope=openid%20email&state=abc&nonce=xyz&code_challenge=<ch>&code_challenge_method=S256`. Connecte-toi. Tu es redirigé vers `localhost:9999/cb?code=…&state=abc` (la page n'existe pas — copie le `code` depuis l'URL). **Vite** : 60 secondes.
4. Échange : `curl -X POST http://localhost:3000/oauth/token -d "grant_type=authorization_code&code=<code>&redirect_uri=http://localhost:9999/cb&client_id=…&code_verifier=<v>"`. → JSON avec `access_token`, `id_token`, `refresh_token`. Colle l'`id_token` sur jwt.io : `nonce: "xyz"`, `sub`, `email`.
5. Casse : rejoue le **même** `curl` → `invalid_grant` (code consommé). Refais les étapes 3–4 avec un mauvais `code_verifier` → `invalid_grant` (PKCE). Avec un `redirect_uri` différent → refus. Avec `code_challenge_method=plain` à l'étape 3 → refus dès l'authorize.
6. Refresh : `curl -X POST …/oauth/token -d "grant_type=refresh_token&refresh_token=<rt>&client_id=…"` → nouveaux tokens. Rejoue avec l'**ancien** refresh → refus, et en base `SELECT revoked_at FROM shared.oauth_refresh_tokens WHERE family_id = …` : toute la famille révoquée. Le nouveau refresh ne marche plus non plus. C'est le kill switch.
7. `curl http://localhost:3000/.well-known/openid-configuration` : lis la découverte. Puis `curl -H "Authorization: Bearer <access_token>" http://localhost:3000/oauth/userinfo`.

Résultat attendu : tu as fait le flow complet à la main, et vu chaque protection refuser : code unique, PKCE, redirect_uri exact, méthode plain, rejeu de refresh.

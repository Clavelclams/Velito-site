---
titre: "Session par cookie ou jeton dans l'en-tête : deux façons de dire qui tu es"
parcours: "api-auth"
ordre: 4
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Une API est sans état : chaque requête doit dire qui l'envoie. Deux mécanismes, et tu utilises les deux.

**Le cookie de session (le web).** Après connexion, le serveur pose un cookie. Le navigateur le **renvoie automatiquement** à chaque requête vers ce domaine. Le serveur le lit, retrouve la session, sait qui tu es. C'est ce que fait Symfony sur `manager.mabb.fr` (session PHP) et Supabase Auth sur tout Velito-site (cookie `sb-…-auth-token`).

Avantages : le navigateur gère tout, `HttpOnly` protège du vol par XSS, `SameSite` protège du CSRF. Inconvénients : lié à un domaine (le SSO `.velito.fr` est une astuce de domaine parent), exposé au CSRF si mal configuré, et **inadapté à une app mobile** — une app n'est pas un navigateur, elle n'a pas de « jar » de cookies automatique, et elle ne partage pas de domaine avec le serveur.

**Le jeton dans l'en-tête (l'API).** Après connexion, le serveur renvoie un jeton. L'app le stocke (dans le stockage sécurisé du téléphone) et l'envoie **explicitement** à chaque requête : `Authorization: Bearer <jeton>`. Le serveur le vérifie, sait qui tu es. C'est ce que fait l'app Venaball avec `ApiToken`, et ce que fait le hub avec ses JWT OAuth.

Avantages : indépendant du domaine, **pas de CSRF** (un site tiers ne peut pas ajouter cet en-tête à une requête forgée), fonctionne pour n'importe quel client (app, script, autre serveur). Inconvénients : c'est à toi de le stocker correctement côté client, et s'il est volé, il est utilisable jusqu'à expiration ou révocation.

**« Bearer » veut dire « porteur ».** Quiconque **porte** le jeton est considéré comme son propriétaire. Pas de vérification supplémentaire. C'est pour ça que le jeton est un secret : il doit être en HTTPS (sinon lisible sur le réseau), stocké de façon sûre (`SecureStore` sur Expo, jamais `AsyncStorage` en clair), jamais dans une URL (elle finit dans les logs et l'historique), et **court** (une heure) ou **révocable** (en base).

**Où mettre le jeton côté client.** Sur mobile : le trousseau du système (Keychain iOS, Keystore Android), via `expo-secure-store`. Sur web (si tu fais une SPA sans cookie) : c'est le débat sans fin — `localStorage` est lisible par un XSS, un cookie `HttpOnly` ne l'est pas mais expose au CSRF. La réponse moderne est le cookie `HttpOnly` + `SameSite` pour le web, le jeton pour le mobile — exactement ta répartition.

**Le même serveur, les deux mécanismes.** Symfony le gère par **firewalls** : `config/packages/security.yaml` a un firewall `manager` (host `manager.*`, session par formulaire) et un firewall `api` (chemin `/api/`, `access_token` authenticator, sans état). Une requête est traitée par le premier firewall dont le motif correspond. Le firewall `api` a `stateless: true` : pas de session, pas de cookie, seulement l'en-tête. C'est la séparation par host et par chemin de l'ADR-0002.

**Ce que le jeton porte.** Deux écoles, deux leçons :

- **Opaque** (leçon 5) : une chaîne aléatoire qui ne veut rien dire. Le serveur la cherche en base pour savoir à qui elle appartient. Révocable instantanément.
- **Auto-porteur, JWT** (leçon 6) : le jeton contient l'identité, signée. Le serveur vérifie la signature sans base. Non révocable avant expiration.

Venaball a choisi l'opaque pour l'API mobile (ADR-0007/0010) ; le hub a choisi le JWT pour OAuth. Les deux sont justes pour leur usage — et les raisons sont dans les deux leçons suivantes.

**La déconnexion.** Cookie : le serveur invalide la session, efface le cookie (centralisé sur le hub pour le SSO — parcours Sécurité, leçon 5). Jeton opaque : le serveur le supprime ou le marque révoqué en base. JWT : impossible côté serveur avant expiration — l'app efface le jeton localement, et le refresh token est révoqué. C'est la différence de nature.

## À retenir

- Cookie : automatique, lié au domaine, `HttpOnly`+`SameSite`, pour le web. Pas pour le mobile.
- Jeton `Authorization: Bearer` : explicite, sans domaine, sans CSRF, pour les apps et les scripts.
- Bearer = porteur. Le jeton est un secret : HTTPS, stockage sûr, jamais en URL, court ou révocable.
- Symfony : un firewall par mécanisme (session sur `manager.*`, `stateless` sur `/api/`).
- Opaque (base, révocable) vs JWT (signé, autonome, non révocable). Chacun son usage.

## Mise en pratique

Objectif : voir les deux mécanismes en action sur Venaball, et vérifier le stockage côté app.

1. `config/packages/security.yaml` : lis la section `firewalls`. Pour chaque firewall : quel motif (host ? chemin ?), quel mécanisme (form_login ? access_token ?), `stateless` ou non ? Dessine le tableau.
2. Web : connecte-toi sur `manager.mabb.fr`, F12 → Application → Cookies. Trouve le cookie de session PHP (`PHPSESSID` ou nom custom). Attributs `HttpOnly`, `Secure`, `SameSite` cochés ? Sinon, `framework.yaml` → session → corrige.
3. API : `curl -i -X POST https://api.venaball.fr/api/auth/login -H "Content-Type: application/json" -d '{"email":"…","password":"…"}'` (compte de test). Réponse : un jeton. Note qu'il **n'y a pas** de `Set-Cookie` dans la réponse : l'API ne pose pas de cookie.
4. `curl -i https://api.venaball.fr/api/club/moi -H "Authorization: Bearer <jeton>"` → 200. Sans l'en-tête → 401. Avec l'en-tête mais sur `manager.mabb.fr/joueuses` (le firewall web) → redirection vers login : le jeton ne vaut rien là. Deux firewalls, deux mondes.
5. Pirb store : `findstr /s "SecureStore\|AsyncStorage" *.ts *.tsx`. Le jeton est-il dans `SecureStore` ? Si tu trouves `AsyncStorage.setItem("token", …)`, c'est du stockage en clair : migre vers `expo-secure-store`.
6. Écris pour le jury, 5 lignes : « Pourquoi mon API mobile utilise un jeton et mon site un cookie ». Utilise : domaine, CSRF, navigateur, Bearer.

Résultat attendu : tu as vu les deux firewalls répondre différemment à la même identité, et vérifié que l'app stocke le jeton en sécurité.

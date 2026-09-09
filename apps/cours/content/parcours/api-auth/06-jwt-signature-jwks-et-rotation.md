---
titre: "JWT : un jeton qui se vérifie sans base, et le prix à payer"
parcours: "api-auth"
ordre: 6
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

Le hub émet des JWT. Un *JSON Web Token* est l'inverse d'un jeton opaque : il **contient** l'information, et il est **signé** pour qu'on ne puisse pas la modifier. Le serveur qui le reçoit n'a pas besoin de base : il vérifie la signature et lit le contenu.

**La forme.** Trois parties en base64url, séparées par des points : `en-tête.charge-utile.signature`.

- **En-tête** : `{ "alg": "RS256", "kid": "clé-2026-08", "typ": "JWT" }` — l'algorithme et **quelle clé** a signé.
- **Charge utile** (*payload*) : les *claims*. `{ "iss": "https://hub.velito.fr", "sub": "<user-id>", "aud": "interactive", "exp": 1757500000, "iat": 1757496400, "scope": "openid email" }`. Qui a émis, pour qui, pour quel client, jusqu'à quand.
- **Signature** : le hash des deux premières parties, chiffré avec la **clé privée** du hub.

Colle un JWT sur jwt.io : tu **lis** l'en-tête et la charge utile — ils ne sont pas chiffrés, juste encodés. Un JWT n'est pas secret dans son contenu ; il est **inaltérable**. Ne mets jamais dedans ce que le porteur ne doit pas voir.

**RS256 : asymétrique, et pourquoi c'est le bon choix.** Le hub signe avec sa clé **privée**. Les apps clientes vérifient avec la clé **publique**, publiée sur `/.well-known/jwks.json`. Vérifier ne permet pas de signer : une app cliente compromise ne peut pas forger de jeton. Avec HS256 (symétrique), la même clé signe et vérifie — il faudrait la donner à chaque client, et chacun pourrait fabriquer des jetons. Le choix asymétrique est ce qui rend le hub un fournisseur d'identité et non un secret partagé.

**Le JWKS et le `kid`.** `jwks.json` est un tableau de clés publiques, chacune avec un identifiant `kid`. L'app cliente télécharge le JWKS une fois, le met en cache, et pour chaque JWT reçu, lit le `kid` dans l'en-tête, prend la clé correspondante, vérifie. Zéro appel au hub par requête. C'est ce qui **scale** : dix apps, dix mille requêtes, un seul JWKS téléchargé.

**La rotation.** Une clé de signature doit pouvoir changer — par hygiène, ou parce qu'elle a fui. Mais des jetons signés avec l'ancienne circulent encore une heure. `keys.ts` du hub :

- pour **signer** : la clé active (`rotated_at IS NULL`) la plus récente ;
- pour **vérifier** : **toute** clé non révoquée.

Rotation = marquer l'ancienne `rotated_at = now()`, insérer la nouvelle. Les nouveaux jetons portent le nouveau `kid` ; les anciens restent vérifiables jusqu'à expiration ; une heure après, l'ancienne clé peut sortir du JWKS. Personne n'est déconnecté. Sans cette asymétrie, changer de clé déconnecterait tout l'écosystème.

**Le prix : l'irrévocabilité.** Un JWT valide le reste jusqu'à `exp`. Si un compte est compromis, l'attaquant garde l'accès jusqu'à expiration — d'où **une heure**, pas un mois. Pour couper avant : introspection (l'app demande au hub à chaque requête — on perd l'intérêt du JWT), ou liste de révocation (le hub publie les `jti` révoqués, les apps la consultent — ça déplace le problème). Le hub a choisi la durée courte, et compense avec le **refresh token opaque** (30 jours, en base, révocable) : l'access token expire vite, le refresh le renouvelle, et révoquer le refresh coupe le renouvellement. Le meilleur des deux mondes, avec une fenêtre d'une heure assumée.

**Les claims à vérifier, toujours.** Une app cliente qui reçoit un JWT vérifie **quatre** choses, pas une : la signature (avec la bonne clé), `exp` (pas expiré), `iss` (émis par le hub, pas par un autre serveur qui aurait une clé dans un JWKS différent), `aud` (destiné à **cette** app — un jeton pour `interactive` ne doit pas être accepté par `arena`). Oublier `aud` fait qu'un jeton volé sur une app ouvre les autres.

**`getUser()` vs `getSession()`, encore.** Supabase Auth émet aussi des JWT. `getSession()` les **décode** (lit le payload) ; `getUser()` les **vérifie** (signature, auprès de Supabase). Décoder sans vérifier, c'est faire confiance à ce que le client dit être — un JWT forgé avec `alg: none` ou une fausse signature passe. Côté serveur : toujours vérifier.

## À retenir

- JWT = en-tête.payload.signature. Lisible, pas modifiable. Rien de secret dedans.
- RS256 : clé privée signe (hub), clé publique vérifie (JWKS). Vérifier ≠ pouvoir signer.
- `kid` + JWKS en cache : zéro appel au hub par requête.
- Rotation : signer avec la nouvelle, vérifier avec toutes les non révoquées.
- Irrévocable jusqu'à `exp` → durée courte + refresh token opaque révocable.
- Vérifier signature, `exp`, `iss`, `aud`. Décoder n'est pas vérifier.

## Mise en pratique

Objectif : lire un JWT du hub, le vérifier à la main avec le JWKS, et tenter de le forger.

1. Récupère un access token du hub (via le flow OAuth d'Interactive en local, ou depuis les cookies Supabase pour un JWT Supabase). Colle-le sur jwt.io. Lis chaque claim. Note `kid`, `iss`, `aud`, `exp` (convertis en date).
2. `curl https://hub.velito.fr/.well-known/jwks.json`. Trouve la clé dont le `kid` correspond. C'est la clé publique qui vérifie ton jeton.
3. Vérifie avec `jose` en Node : `node -e "const {jwtVerify, createRemoteJWKSet} = require('jose'); const jwks = createRemoteJWKSet(new URL('https://hub.velito.fr/.well-known/jwks.json')); jwtVerify('<jwt>', jwks, { issuer: 'https://hub.velito.fr', audience: '<aud>' }).then(r => console.log(r.payload)).catch(e => console.error(e.message))"`. → le payload. Change `audience` → erreur `unexpected "aud"`. Change une lettre du jeton → erreur de signature.
4. Forge : sur jwt.io, modifie `sub` dans le payload. Le jeton affiché change (nouvelle signature invalide). Vérifie avec le script : refusé. Essaie `alg: "none"` avec une signature vide : `jose` refuse (il n'accepte pas `none` par défaut). C'est pour ça qu'on utilise une bibliothèque sérieuse, jamais un `JSON.parse(atob(payload))` maison.
5. Lis `apps/hub/src/lib/oauth/keys.ts` en entier. Trouve : la requête de la clé de signature, le cache de 5 minutes, la fonction de vérification qui accepte plusieurs clés. Puis `apps/hub/sql/oauth-tables-v1.sql` : la table `oauth_jwks`, ses colonnes `rotated_at`, `private_pem`, `public_jwk`.
6. Simule une rotation (en local) : insère une nouvelle clé, marque l'ancienne `rotated_at = now()`. Un jeton signé avant est-il encore vérifié ? (Oui, si la clé est non révoquée.) Un nouveau jeton porte-t-il le nouveau `kid` ? (Après expiration du cache de 5 min, ou redémarrage.)

Résultat attendu : tu as lu, vérifié et tenté de forger un JWT, et tu as vu la rotation fonctionner sans déconnexion.

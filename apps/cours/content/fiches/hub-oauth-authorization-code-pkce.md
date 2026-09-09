---
titre: "Pourquoi OAuth passe par un code avant de donner un token"
projet: "hub"
bloc: 3
themes: ["securite-applicative", "api", "architecture"]
source: "apps/hub/src/app/oauth/authorize/page.tsx, lib/oauth/pkce.ts"
date: 2026-09-04
---

## Le concept

Le hub Velito n'est pas seulement une page de connexion : c'est un **serveur d'autorisation OAuth 2.0 / OpenID Connect**. Les autres apps de l'écosystème ne gèrent aucun mot de passe — elles envoient l'utilisateur au hub et récupèrent une identité signée.

Le flow implémenté est **Authorization Code + PKCE**, en deux temps :

1. L'app cliente redirige le navigateur vers `/oauth/authorize` avec `client_id`, `redirect_uri`, `response_type=code`, `scope`, `state`, `nonce`, `code_challenge`, `code_challenge_method=S256`.
2. Le hub valide tout, authentifie l'utilisateur si besoin, puis redirige vers `redirect_uri?code=...&state=...`.
3. L'app cliente **échange** ce code contre les tokens, en `POST` serveur-à-serveur sur `/oauth/token`.

La question à laquelle il faut savoir répondre : pourquoi ce détour ? Pourquoi ne pas renvoyer directement le token ?

Parce que l'étape 2 passe **par le navigateur**, donc par une URL. Une URL finit dans l'historique, dans l'en-tête `Referer`, dans les logs du proxy, sur une capture d'écran. Un token qui vaut une heure d'accès n'a rien à faire là. Le **code**, lui, ne vaut presque rien : il expire en 60 secondes, il est à usage unique, et il ne sert à rien sans la deuxième étape. Les tokens, eux, transitent dans une réponse HTTP à un POST — pas dans une URL.

**PKCE** (RFC 7636) ferme la dernière brèche : et si quelqu'un interceptait le code ? Le client tire au hasard un `code_verifier`, en envoie le SHA-256 en base64url comme `code_challenge` à l'étape 1, puis présente le verifier en clair à l'étape 3.

```ts
export function verifyPkceChallenge(codeVerifier: string, storedChallenge: string): boolean {
  if (!codeVerifier || codeVerifier.length < 43 || codeVerifier.length > 128) return false;
  const hash = createHash("sha256").update(codeVerifier).digest();
  return base64urlEncode(hash) === storedChallenge;
}
```

Le serveur recalcule le hash et compare. Un attaquant qui a volé le code dans une URL n'a pas le verifier — il est resté en mémoire du client légitime. Le code seul ne vaut rien.

Deux refus explicites. `code_challenge_method` doit valoir **S256** : la méthode `plain` envoie le verifier en clair dès l'étape 1 et n'apporte rien. Et le `state` est renvoyé tel quel au callback — c'est le jeton anti-CSRF du client, qui vérifie qu'il reçoit la réponse à *sa* demande.

## Comment je l'explique au jury

« Le hub est un serveur d'autorisation OAuth 2.0 avec OpenID Connect. J'ai implémenté le flow Authorization Code avec PKCE. Le principe : le navigateur ne transporte jamais de token, seulement un code à usage unique valable soixante secondes, que l'app cliente échange ensuite en POST serveur-à-serveur. Un token dans une URL finit dans l'historique et les logs ; un code expiré depuis une minute ne vaut rien. PKCE ajoute une preuve de possession : le client envoie le SHA-256 d'un secret à l'autorisation et le secret en clair à l'échange. Celui qui vole le code n'a pas le secret, donc ne peut rien en faire. Je refuse la méthode "plain", je n'accepte que S256. »

## La question vicieuse du jury

**« PKCE a été inventé pour les applications mobiles, qui ne peuvent pas garder un secret. Vos clients sont des serveurs Next.js. Pourquoi l'imposer ? »**

C'est exact historiquement — PKCE vient de la RFC 7636, pensée pour les clients publics incapables de stocker un `client_secret`. Mais l'IETF l'a généralisé depuis : le *OAuth 2.0 Security Best Current Practice* le recommande **pour tous les clients**, confidentiels compris, et OAuth 2.1 le rend obligatoire. La raison est que PKCE ne protège pas du même risque que le `client_secret` : le secret prouve *quelle application* parle, PKCE prouve que *la requête d'échange vient de la même session* que la demande d'autorisation. Il ferme l'injection de code d'autorisation, qu'un secret partagé ne couvre pas. Concrètement, dans mon écosystème, une app first-party comme Interactive est effectivement confidentielle — mais mes clients sont des applications Next.js dont une partie du code tourne dans le navigateur, et la frontière est plus poreuse qu'il n'y paraît. Imposer S256 partout coûte quelques lignes et supprime une classe d'attaque : je préfère une règle unique et stricte à une exception par type de client, qui est exactement le genre de nuance qu'on finit par appliquer au mauvais endroit.

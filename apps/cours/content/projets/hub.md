---
titre: "Hub Velito"
avancement: 80
statut: "en prod"
maj: 2026-09-04
---

## C'est quoi

`hub.velito.fr` est le point d'entrée de l'écosystème Velito : la galaxie 3D qui présente les modules, et surtout **le fournisseur d'identité de toutes les applications**. C'est le seul endroit où l'on crée un compte, où l'on se connecte, où l'on se déconnecte. VEA, ARENA, Interactive, Compta et Cours ne gèrent aucun mot de passe.

Ce n'est donc pas une page d'accueil avec un formulaire de login : c'est un **serveur d'autorisation OAuth 2.0 / OpenID Connect** complet, avec ses endpoints standards.

## Comment c'est construit

**Stack** : Next.js 16 (App Router), TypeScript, Tailwind, Supabase Auth, `jose` pour la signature JWT, OGL/WebGL pour la galaxie. Déployé sur Vercel.

Les endpoints OAuth suivent les RFC : `/oauth/authorize` (RFC 6749 §4.1.1), `/oauth/token` (§4.1.3 et §6), `/oauth/userinfo`, `/oauth/consent`, plus les documents de découverte `/.well-known/openid-configuration` et `/.well-known/jwks.json`. Les tables (`oauth_clients`, `oauth_authorization_codes`, `oauth_refresh_tokens`, `oauth_jwks`) vivent dans le schéma `shared`, avec deux fichiers SQL versionnés.

À côté du flow OAuth, un second mécanisme plus simple sert les apps de l'écosystème : le **cookie de session posé sur `.velito.fr`**, que le navigateur envoie automatiquement à tous les sous-domaines.

## Les décisions techniques et POURQUOI

- **Authorization Code + PKCE, S256 obligatoire, `plain` refusé** : le navigateur ne transporte jamais qu'un code à usage unique valable 60 s, les tokens transitent en POST serveur-à-serveur. PKCE est imposé à tous les clients, y compris confidentiels, conformément aux bonnes pratiques de sécurité OAuth 2.0 et à OAuth 2.1.
- **Access token JWT RS256 (1 h) + refresh token opaque (30 j)** : le JWT est vérifiable hors ligne via le JWKS — donc pas d'appel au hub à chaque requête — mais irrévocable, d'où la durée courte. Le refresh est opaque et stocké en base, donc révocable instantanément.
- **Rotation des refresh tokens avec `family_id`** : chaque usage révoque le précédent. La réapparition d'un jeton consommé signale un vol, et toute la famille est révoquée.
- **Signature asymétrique et non symétrique** : en HS256, chaque client aurait eu la clé de signature, donc le pouvoir de forger des tokens. En RS256, la clé publique ne permet que de vérifier.
- **Vérification tolérante à la rotation** : on signe avec la clé active la plus récente, mais on accepte toute clé non révoquée — changer de clé n'invalide pas les tokens en circulation.
- **Déconnexion centralisée sur le hub** : un `signOut()` depuis un sous-domaine ne poserait qu'un cookie vide local et laisserait la session active partout ailleurs. Bug classique de SSO cross-sous-domaine, évité par un POST vers `hub.velito.fr/logout`.
- **Listes blanches d'origines exactes** partout où une destination vient d'un paramètre, et interdiction de rediriger avant d'avoir validé la `redirect_uri` — sinon le mécanisme de report d'erreur OAuth serait lui-même l'open redirect.

## État d'avancement honnête

Le serveur OAuth est fonctionnel de bout en bout : autorisation, échange de code, rafraîchissement avec rotation, userinfo, écran de consentement pour les clients tiers, découverte OIDC, JWKS. Le SSO par cookie fonctionne sur les sept sous-domaines. La galaxie 3D et la recherche globale sont en place.

Points faibles connus :
- **La clé privée de signature est stockée en base**, chiffrée par rien d'autre que les droits d'accès. Un accès `service_role` donne la clé. Un KMS serait la réponse propre.
- **Un jeton de rafraîchissement expiré déclenche le kill switch de famille**, alors qu'une expiration n'est pas un rejeu. Le comportement correct serait de refuser sans révoquer la famille.
- **Pas de fenêtre de tolérance sur la rotation** : une requête de refresh perdue en route peut déclencher une révocation à tort.
- **Aucun test automatisé** sur cette application — c'est la plus critique de l'écosystème et la moins couverte.
- Cache des clés à 5 min : après une rotation, il faut attendre ou redéployer.

## Prochaines étapes

1. Séparer expiration et révocation dans `rotateRefreshToken`, et ajouter une fenêtre de grâce de quelques secondes.
2. Écrire des tests sur le flow complet — au minimum : code à usage unique, échec PKCE, `redirect_uri` non conforme, détection de rejeu.
3. Évaluer le passage de la clé privée vers un KMS.
4. Journaliser les révocations de famille pour pouvoir diagnostiquer les déconnexions.

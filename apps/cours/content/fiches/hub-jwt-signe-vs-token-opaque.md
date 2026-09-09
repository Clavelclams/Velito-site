---
titre: "Access token signé, refresh token opaque : deux besoins, deux formats"
projet: "hub"
bloc: 3
themes: ["securite-applicative", "api", "architecture"]
source: "apps/hub/src/lib/oauth/tokens.ts"
date: 2026-09-04
---

## Le concept

Le hub émet trois jetons, et ils ne sont pas du même type. C'est le choix le plus intéressant du module.

**`access_token` — un JWT signé RS256, valable 1 h.** Il porte les claims OAuth standards : `iss` (qui l'a émis), `sub` (l'utilisateur), `aud` (pour quel client), `exp`, `iat`, `scope`. L'app cliente le **vérifie toute seule** : elle récupère la clé publique sur `/.well-known/jwks.json`, la met en cache, et valide la signature localement. Aucun aller-retour vers le hub à chaque requête.

**`id_token` — un JWT signé aussi, mais qui répond à une autre question.** L'access token dit « le porteur a le droit de faire ça ». L'id_token dit « voici qui est cette personne » : email, nom, avatar selon le scope, plus le `nonce` fourni au départ. C'est la couche OpenID Connect posée au-dessus d'OAuth — OAuth fait de l'*autorisation*, OIDC ajoute l'*authentification*.

**`refresh_token` — un UUID opaque, valable 30 jours, stocké en base.** Aucune information dedans, aucune signature à vérifier : c'est juste une clé de recherche dans `oauth_refresh_tokens`.

Pourquoi ce mélange ? Parce que les deux formats ont des propriétés opposées.

Un **JWT est autoportant** : rapide, vérifiable hors ligne, scalable horizontalement — et donc **impossible à révoquer**. Tant qu'il n'est pas expiré, il vaut. C'est acceptable sur une heure.

Un **token opaque doit être vérifié en base** — un aller-retour à chaque usage — et c'est précisément ce qui le rend **révocable à l'instant**. Sur trente jours, c'est indispensable : un compte compromis doit pouvoir être coupé tout de suite.

Le compromis est donc explicite : la durée de vie courte compense l'irrévocabilité du JWT, et le contrôle en base compense la lenteur du refresh — appelé une fois par heure, pas à chaque requête.

## Comment je l'explique au jury

« J'ai deux formats de jeton parce que j'ai deux besoins opposés. L'access token est un JWT signé RS256 d'une heure : l'app cliente le vérifie seule avec la clé publique du JWKS, sans appeler le hub — ça scale. Le prix, c'est qu'un JWT ne se révoque pas : tant qu'il n'est pas expiré il vaut, d'où la durée courte. Le refresh token, lui, est un UUID opaque de trente jours stocké en base : il exige un aller-retour, mais je peux le révoquer instantanément. Et j'ai un troisième jeton, l'id_token, qui relève d'OpenID Connect : il ne dit pas ce que le porteur a le droit de faire, il dit qui il est. »

## La question vicieuse du jury

**« Une heure sans pouvoir révoquer. Si un compte est compromis, l'attaquant garde l'accès une heure ? »**

Oui, dans le pire cas — c'est le coût assumé du JWT autoportant, et je préfère le dire que prétendre le contraire. Ce qui limite les dégâts : révoquer le refresh token coupe le renouvellement, donc la compromission a une durée maximale bornée et connue, elle ne s'étend pas. Et l'access token est lié à un `aud` — un client précis — donc il n'ouvre pas tout l'écosystème. Si j'avais besoin d'une révocation immédiate, deux options existent : introspection (RFC 7662), où chaque app interroge le hub à chaque requête — ce qui revient à jeter l'intérêt du JWT — ou une liste de révocation publiée que les clients consultent, ce qui déplace le problème sans le supprimer. Le vrai réglage, c'est la durée : une heure est un choix pour un écosystème associatif où le risque est modéré. Sur une application bancaire je descendrais à cinq minutes, et j'accepterais le surcoût de refresh que ça implique.

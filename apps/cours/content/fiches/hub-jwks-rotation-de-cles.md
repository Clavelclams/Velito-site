---
titre: "Changer la clé qui signe les tokens sans déconnecter personne"
projet: "hub"
bloc: 3
themes: ["securite-applicative", "api", "base-de-donnees"]
source: "apps/hub/src/lib/oauth/keys.ts, app/.well-known/jwks.json"
date: 2026-09-04
---

## Le concept

Les tokens du hub sont signés en **RS256** — chiffrement asymétrique. La clé **privée** signe, elle ne quitte jamais le serveur. La clé **publique** vérifie, et elle est publiée à tout le monde sur `/.well-known/jwks.json`.

C'est ce qui permet à une app cliente de valider un token sans jamais parler au hub : elle télécharge le JWKS une fois, met la clé publique en cache, et vérifie les signatures localement. Avec un algorithme symétrique comme HS256, il aurait fallu partager la clé de signature avec chaque client — donc donner à chacun le pouvoir de **fabriquer** des tokens. Asymétrique, la vérification ne donne pas le pouvoir de signer.

Le sujet difficile est la **rotation**. Une clé de signature doit pouvoir être changée — périodiquement, ou en urgence si elle fuit. Mais au moment où je change, des tokens signés avec l'ancienne clé sont encore valables pour une heure. Si je supprime la clé publique correspondante, tous ces tokens deviennent invalides d'un coup et tout le monde est déconnecté.

D'où l'asymétrie de traitement, écrite dans l'en-tête du module :

> pour **signer**, la clé active (`rotated_at IS NULL`) la plus récente ; pour **vérifier**, **toute clé non révoquée**.

```sql
SELECT * FROM shared.oauth_jwks
 WHERE rotated_at IS NULL
 ORDER BY created_at DESC LIMIT 1;
```

Une rotation devient donc indolore : je marque l'ancienne clé `rotated_at = now()` et j'en insère une nouvelle. Les tokens neufs sont signés avec la nouvelle ; les anciens restent vérifiables jusqu'à leur expiration naturelle. Une heure plus tard, plus personne n'utilise l'ancienne, et je peux la retirer du JWKS.

Ce qui rend le raccordement possible, c'est le **`kid`** (key id) placé dans l'en-tête de chaque JWT : le vérificateur sait exactement quelle clé du jeu utiliser, sans les essayer toutes.

Dernier point, plus discutable : les clés sont **cachées cinq minutes en mémoire**, parce qu'aller chercher la clé en base à chaque signature serait absurde. Le commentaire assume la contrepartie : après une rotation, il faut attendre l'expiration du cache ou redéployer.

## Comment je l'explique au jury

« Les tokens sont signés en RS256. La clé privée reste sur le serveur, la clé publique est publiée sur `/.well-known/jwks.json` — c'est ce qui permet aux apps clientes de vérifier une signature sans appeler le hub. En symétrique j'aurais dû partager la clé de signature avec chaque client, donc leur donner le pouvoir de forger des tokens. Pour la rotation, je traite signature et vérification différemment : je signe avec la clé active la plus récente, mais j'accepte à la vérification toute clé non révoquée. Ça me permet de changer de clé sans invalider les tokens en circulation — ils expirent naturellement en une heure. Le `kid` dans l'en-tête du JWT indique quelle clé utiliser. »

## La question vicieuse du jury

**« Vous stockez la clé privée en base, en PEM. Si quelqu'un lit votre base, il signe ce qu'il veut. »**

C'est exact, et c'est le point faible réel de cette architecture. Ce qui l'entoure : la table est en `shared.` et n'est lisible que par `service_role`, jamais par `anon` ni `authenticated` — aucune requête venue d'un navigateur ne peut l'atteindre. Mais je ne prétendrai pas que c'est équivalent à un coffre : quelqu'un qui obtient la clé de service obtient la clé privée. La réponse propre serait un **KMS** ou un HSM, où la clé privée ne sort jamais du module — on lui envoie un condensé à signer, elle rend une signature, et personne, pas même l'administrateur, ne peut l'exfiltrer. C'est ce que je ferais si le hub gardait des données sensibles ou de l'argent. Ce que la base me donne quand même, et qui n'est pas rien : la rotation est **outillée**. Je peux révoquer une clé compromise en une requête, et l'infrastructure de rotation existe déjà — ce qui est la vraie différence entre une fuite gênante et une fuite catastrophique. Une clé en variable d'environnement, elle, ne se change qu'en redéployant tout.

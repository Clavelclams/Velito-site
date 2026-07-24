---
titre: "getUser() vs getSession() : ne jamais décider de la sécurité sur un cookie"
projet: "compta"
bloc: 1
themes: ["securite", "authentification"]
source: "apps/compta/middleware.ts"
date: 2026-07-10
---

## Le concept

Avec Supabase Auth côté serveur, deux façons de savoir "qui est connecté" :

- `getSession()` **lit le cookie local** et fait confiance à son contenu.
  Rapide, mais un cookie peut être forgé ou périmé : c'est une déclaration
  du client, pas une preuve.
- `getUser()` **revalide le jeton auprès du serveur Supabase** à chaque
  appel. Plus lent (un aller-retour réseau), mais le résultat est vérifié.

Règle que j'applique dans le middleware de Velito Compta : **toute décision
de sécurité (laisser passer / bloquer / rediriger) se prend sur `getUser()`**.
`getSession()` ne sert au mieux qu'à de l'affichage non sensible.

C'est le même principe que la validation serveur des formulaires : on ne
fait jamais confiance à ce qui vient du client — un cookie VIENT du client.

## Comment je l'explique au jury

« Dans mon middleware, je protège toutes les routes avec getUser plutôt que
getSession : getSession se contente de lire le cookie local, qui est une
donnée fournie par le client et donc falsifiable, alors que getUser revalide
le jeton auprès du serveur d'authentification. Pour une décision de
sécurité, j'accepte le coût d'un aller-retour réseau en échange d'une
identité vérifiée. »

## La question vicieuse du jury

**« Un appel réseau à chaque requête, ce n'est pas un problème de
performance ? »** Réponse : c'est un arbitrage assumé sécurité/latence sur
un outil de gestion interne à faible trafic — quelques dizaines de
millisecondes par navigation. Si le trafic explosait, la solution n'est pas
de repasser à getSession, mais de vérifier la signature du JWT localement
avec la clé publique du serveur d'auth : on garde une preuve cryptographique
sans aller-retour. La mauvaise réponse, c'est de faire confiance au cookie.

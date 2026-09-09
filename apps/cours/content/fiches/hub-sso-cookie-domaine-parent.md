---
titre: "Un cookie sur .velito.fr, et la déconnexion qui ne marche qu'au bon endroit"
projet: "hub"
bloc: 3
themes: ["securite-applicative", "http", "architecture"]
source: "apps/hub/src/app/logout/route.ts, lib/supabase/server.ts"
date: 2026-09-04
---

## Le concept

Sept applications, un seul compte. Le SSO de Velito ne repose pas sur un protocole compliqué mais sur une propriété du navigateur : un cookie posé avec `Domain=.velito.fr` est **envoyé à tous les sous-domaines**. Le hub s'authentifie, pose le cookie de session sur le domaine parent, et `vea.velito.fr`, `arena.velito.fr`, `cours.velito.fr` le reçoivent automatiquement.

La conséquence non évidente, c'est la **déconnexion**.

Le réflexe serait de faire un `supabase.auth.signOut()` depuis l'app où l'utilisateur se trouve. Ça ne marche pas, et le bug est vicieux parce qu'il *a l'air* de marcher. Un cookie posé depuis `interactive.velito.fr` a pour domaine `interactive.velito.fr` — le sous-domaine, pas le parent. Supprimer un cookie, c'est en reposer un vide avec **exactement le même domaine et le même chemin**. Depuis le sous-domaine, on pose donc une version locale vide qui masque le cookie parent *sur cette app seulement*. L'utilisateur se voit déconnecté d'Interactive… et reste connecté partout ailleurs.

D'où la centralisation :

1. L'app cliente fait un `POST` vers `https://hub.velito.fr/logout` avec `return=<URL actuelle>`.
2. Le hub valide que `return` est dans sa liste blanche d'origines.
3. Le hub exécute `signOut()` — les cookies partent avec `Domain=.velito.fr`, le bon.
4. Le hub renvoie le navigateur vers `return` : l'utilisateur revient là où il était, déconnecté partout.

Un détail conditionne que ça fonctionne : les cookies sont en **`SameSite=Lax`**. En `Strict`, le POST cross-sous-domaine depuis Interactive vers le hub n'emporterait pas le cookie de session — le hub verrait une requête anonyme et ne déconnecterait personne. `Lax` autorise l'envoi sur une navigation de haut niveau, ce qui est exactement le cas ici.

## Comment je l'explique au jury

« Le SSO repose sur un cookie posé avec `Domain=.velito.fr`, que le navigateur envoie à tous les sous-domaines. La subtilité est à la déconnexion : si une app cliente essaie de supprimer le cookie elle-même, elle pose un cookie vide sur *son* sous-domaine, qui masque le cookie parent localement. L'utilisateur a l'air déconnecté sur cette app et reste connecté sur les six autres — c'est un bug classique de SSO cross-sous-domaine, et il est trompeur parce que le test le plus évident passe. Donc la déconnexion est centralisée sur le hub, en POST, avec l'URL de retour validée contre une liste blanche. Et les cookies sont en SameSite=Lax, sans quoi le POST cross-sous-domaine n'emporterait pas la session. »

## La question vicieuse du jury

**« `Domain=.velito.fr` envoie votre cookie de session à tous les sous-domaines. Si l'un d'eux est compromis, ou si vous en confiez un à un prestataire ? »**

C'est le prix du SSO par cookie de domaine parent, et il faut le regarder en face : un sous-domaine compromis voit passer la session de tous les autres. La règle qui en découle est stricte — **aucun sous-domaine de `velito.fr` ne peut être délégué**. Un service tiers, un site client, un outil hébergé ailleurs vont sur un autre domaine, pas sur un sous-domaine du mien. Ce qui atténue le reste : les cookies sont `HttpOnly` (inaccessibles au JavaScript, donc un XSS sur un sous-domaine ne les lit pas), `Secure` (jamais en clair), et `SameSite=Lax`. Et surtout, être authentifié ne suffit jamais : `cours.velito.fr` a une liste blanche d'emails, `compta` a du RLS, `arena` distingue le staff du public. **Authentifié n'est pas autorisé** — c'est la règle qui fait que le partage d'une session n'est pas le partage d'un accès. L'alternative sans ce risque serait de ne pas partager de cookie du tout et de refaire un flow OAuth par application, ce que le hub sait faire par ailleurs : c'est plus étanche, et beaucoup plus lourd pour un utilisateur qui passe d'une app à l'autre dix fois par jour.

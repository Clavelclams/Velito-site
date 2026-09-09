---
titre: "L'open redirect : la faille qui transforme mon site en tremplin"
projet: "hub"
bloc: 3
themes: ["securite-applicative", "http"]
source: "apps/hub/src/app/oauth/authorize/page.tsx, app/logout/route.ts"
date: 2026-09-04
---

## Le concept

Le hub redirige beaucoup : après connexion, après autorisation OAuth, après déconnexion. Chaque redirection dont la destination vient d'un paramètre est une **faille d'open redirect** potentielle.

Le scénario : un attaquant envoie `https://hub.velito.fr/logout?return=https://evil.com/faux-login`. La victime voit un domaine de confiance dans le lien, clique, et atterrit sur une copie de la page de connexion. Mon site a servi de tremplin, et c'est ma réputation qui a servi d'appât.

La parade est une **liste blanche d'origines exactes** :

```ts
const ALLOWED_RETURN_ORIGINS = new Set([
  "https://hub.velito.fr",
  "https://velito.fr",
  "https://vea.velito.fr",
  "https://interactive.velito.fr",
  "https://arena.velito.fr",
  /* … + localhost en dev */
]);
```

Ce qui est refusé et pourquoi : une vérification par `startsWith("https://velito.fr")` laisserait passer `https://velito.fr.evil.com`. Un test « contient velito.fr » aussi. Un motif `*.velito.fr` accepterait n'importe quel sous-domaine, y compris un que je ne contrôlerais plus. Seule l'**égalité exacte sur l'origine** — protocole + domaine + port — tient.

Même logique côté OAuth, avec une nuance importante. La `redirect_uri` doit figurer dans la liste blanche **exacte** du client enregistré, pas dans un motif. Et surtout, l'ordre des opérations :

```ts
if (!params.client_id)    return <FatalError … />;
if (!params.redirect_uri) return <FatalError … />;
// … puis seulement après validation, on a le droit de rediriger
```

Le commentaire du fichier dit l'essentiel : *« Erreur fatale AVANT validation du redirect_uri : on N'A PAS le droit de rediriger vers une URL non validée. »* Une erreur OAuth se signale normalement en redirigeant vers le callback avec `error=...` — mais tant que la `redirect_uri` n'est pas validée, cette redirection **serait elle-même l'open redirect**. Donc avant validation : page d'erreur affichée sur mon domaine. Après validation : redirection normale avec le code d'erreur standard et le `state` préservé.

Dernier détail sur le logout : il est **POST uniquement**. Un GET permettrait de déconnecter quelqu'un avec une simple balise `<img src="https://hub.velito.fr/logout">` cachée dans une page. Une action qui modifie un état n'est jamais un GET.

## Comment je l'explique au jury

« Toutes mes redirections dont la destination vient d'un paramètre sont validées contre une liste blanche d'origines exactes. Pas de `startsWith`, qui laisserait passer `velito.fr.evil.com`, pas de joker sur les sous-domaines : égalité stricte. Sur l'endpoint d'autorisation, l'ordre compte : tant que la `redirect_uri` n'est pas validée, je n'ai pas le droit de rediriger, même pour signaler une erreur — je rends une page d'erreur sur mon propre domaine. Sinon le mécanisme de report d'erreur serait lui-même la faille. Et le logout est en POST, parce qu'un GET permettrait de déconnecter un utilisateur avec une balise image cachée. »

## La question vicieuse du jury

**« Votre liste est en dur dans le code. Vous redéployez à chaque nouveau sous-domaine ? »**

Oui, et c'est délibéré pour les origines de logout : ce sont mes propres applications, elles n'apparaissent pas toutes les semaines, et une liste en dur est **auditable** — elle est dans le diff, elle passe par une revue, elle ne peut pas être modifiée par quelqu'un qui aurait un accès à la base. Une table de configuration transformerait une compromission de base en compromission de redirection. Le raisonnement s'inverse en revanche pour les `redirect_uri` OAuth : elles appartiennent à des clients qui peuvent être enregistrés dynamiquement, elles vivent donc dans `oauth_clients` en base, avec la même exigence d'égalité exacte. La règle que je retiens : ce qui décrit **mon** périmètre reste dans le code, ce qui décrit des **tiers** vit en base — et les deux se valident de la même façon.

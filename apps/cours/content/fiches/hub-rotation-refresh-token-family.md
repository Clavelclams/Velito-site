---
titre: "Détecter un token volé sans jamais voir le voleur"
projet: "hub"
bloc: 3
themes: ["securite-applicative", "api"]
source: "apps/hub/src/lib/oauth/tokens.ts (rotateRefreshToken)"
date: 2026-09-04
---

## Le concept

Un refresh token vit trente jours. Si quelqu'un le vole, il peut fabriquer des access tokens pendant un mois — et je n'ai aucun moyen de savoir qu'il n'est pas le propriétaire légitime. Les deux se présentent avec le même jeton valide.

La parade s'appelle **rotation avec détection de rejeu**, et elle repose sur une observation : un refresh token est **à usage unique**. Chaque échange le révoque et en émet un nouveau. Donc si un jeton **déjà utilisé** revient, c'est qu'il existe deux copies en circulation — le légitime et le voleur. Je ne sais pas lequel des deux vient de me parler, mais je sais qu'il y a un problème.

La réponse est de tout couper, grâce au `family_id` — l'identifiant de la chaîne : le jeton d'origine et tous ses successeurs partagent la même famille.

```ts
const isExpired = new Date(row.expires_at).getTime() < Date.now();
const isRevoked = row.revoked_at !== null;

if (isExpired || isRevoked) {
  // Rejeu détecté → on révoque TOUTE la famille (kill switch)
  await supabase.from("oauth_refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("family_id", row.family_id)
    .is("revoked_at", null);
  return null;
}
```

Le scénario complet. Le voleur récupère le token T1. Deux cas.

**Il l'utilise avant la victime** : il obtient T2, mais T1 est maintenant révoqué. À la prochaine connexion de la victime, celle-ci présente T1 → rejeu détecté → toute la famille meurt, y compris le T2 du voleur. La victime se reconnecte, le voleur est dehors.

**La victime l'utilise avant lui** : T1 est révoqué, elle a T2. Quand le voleur tente T1 → même détection, même exécution de la famille.

Dans les deux sens, l'attaque se termine à la première collision. Le prix payé est une reconnexion pour la victime — une gêne, contre un mois d'accès pour l'attaquant.

Le détail qui compte : après émission du nouveau jeton, on lui **réattribue la `family_id` de l'ancien**. Sans cette ligne, chaque rotation créerait une famille neuve et la chaîne serait rompue — la détection de rejeu ne remonterait jamais au-delà d'un seul maillon.

## Comment je l'explique au jury

« Un refresh token vit trente jours, donc son vol est le vrai risque. J'applique la rotation : chaque usage le révoque et en émet un nouveau. Comme il est à usage unique, la réapparition d'un jeton déjà consommé signifie qu'il en existe deux copies — donc un vol. Je ne peux pas distinguer la victime du voleur, alors je révoque toute la chaîne d'un coup, via un identifiant de famille partagé par tous les jetons successifs. L'attaque s'arrête à la première utilisation croisée ; la victime se reconnecte, l'attaquant est éjecté. C'est le mécanisme décrit dans les bonnes pratiques de sécurité OAuth 2.0 de l'IETF. »

## La question vicieuse du jury

**« Vous révoquez la famille entière sur un simple jeton expiré. Une mauvaise connexion réseau va donc déconnecter un utilisateur ? »**

Vous avez mis le doigt sur une vraie faiblesse de mon implémentation, et je l'assume comme telle. J'ai fusionné deux cas dans le même `if` : le jeton **révoqué**, qui est bien un signal de rejeu, et le jeton **expiré**, qui n'en est pas un — il veut juste dire que l'utilisateur n'est pas revenu depuis trente jours. Traiter une expiration comme une attaque déclenche un kill switch inutile ; le comportement correct serait de rendre `null` sans toucher à la famille, et de laisser l'utilisateur se reconnecter normalement. Il y a un second cas voisin, plus subtil : une requête de refresh perdue en route, où le client renvoie l'ancien jeton alors que le serveur a déjà tourné. La RFC recommande une petite fenêtre de tolérance — quelques secondes pendant lesquelles l'ancien jeton reste accepté sans déclencher l'alerte. Aucun des deux n'est implémenté. Ce sont deux corrections précises que je sais formuler, et c'est le genre de détail qui ne se voit pas tant qu'on ne relit pas son propre code en se demandant « qu'est-ce qui déclenche vraiment ça ? ».

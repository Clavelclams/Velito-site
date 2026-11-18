---
titre: "Un code qui ne sert qu'une fois, même si deux requêtes arrivent ensemble"
projet: "hub"
bloc: 3
themes: ["authentification", "securite-applicative", "base-de-donnees"]
source: "apps/hub/src/app/oauth/token/route.ts, apps/hub/src/lib/oauth/tokens.ts"
date: 2026-11-18
---

## Le concept

Le hub est un serveur OAuth : une application cliente redirige l'utilisateur vers le hub, qui renvoie un **code d'autorisation**. L'application échange ce code contre des jetons sur `/oauth/token`. La norme (RFC 6749) est claire : un code ne sert **qu'une fois**. S'il est intercepté et rejoué, il ne doit rien rapporter.

**Le bug (corrigé le 13/11/2026).** La route faisait :

1. lire la ligne du code ;
2. vérifier `consumed_at` vide ;
3. … vérifier le client, PKCE, l'expiration … ;
4. écrire `consumed_at = now()`.

Entre l'étape 2 et l'étape 4, il y a du temps. Deux requêtes envoyées en même temps avec le même code lisent toutes les deux « pas encore consommé », passent toutes les vérifications, et obtiennent **chacune** des jetons. C'est une course (« race condition »), le même défaut que le « lire, vérifier, écrire » de partout ailleurs.

**La correction : la condition dans l'écriture.**

```ts
const { data: consomme } = await supabase
  .from("oauth_authorization_codes")
  .update({ consumed_at: new Date().toISOString() })
  .eq("code", code)
  .is("consumed_at", null)   // ← n'écrit QUE si personne ne l'a fait avant
  .select("code");

if (!consomme || consomme.length === 0) {
  // l'autre requête a gagné : celle-ci est refusée
}
```

Postgres verrouille la ligne pendant l'`UPDATE`. La première requête passe `consumed_at` de vide à rempli. La seconde ne trouve plus de ligne qui correspond à `consumed_at IS NULL` : elle ne reçoit rien, donc pas de jetons. Le `.select()` à la fin permet de savoir si l'écriture a touché une ligne.

**Même chose pour le rafraîchissement.** Un jeton de rafraîchissement sert aussi une seule fois (rotation). Si deux rafraîchissements arrivent avec le même jeton, le perdant est traité comme un **rejeu** : toute la « famille » de jetons est révoquée. Raison : si quelqu'un d'autre a le jeton, il a été volé ; mieux vaut déconnecter tout le monde que laisser le voleur continuer.

## Comment je l'explique au jury

« Un code OAuth ne doit servir qu'une fois. Mon code le vérifiait en deux temps, lire puis écrire, et deux requêtes simultanées passaient toutes les deux. J'ai mis la condition dans l'écriture : `UPDATE ... WHERE code = ? AND consumed_at IS NULL`. Postgres garantit qu'une seule requête modifie la ligne ; l'autre ne touche rien et est refusée. Pour le jeton de rafraîchissement, le perdant est traité comme un vol : je révoque toute la famille de jetons. »

## La question vicieuse du jury

**« Deux requêtes à la même milliseconde avec le même code, ça n'arrive jamais en vrai. »**

Pas par hasard, non. Mais un attaquant qui intercepte un code le rejoue **exprès** au moment où l'application légitime l'échange, justement pour exploiter cette fenêtre. Une faille qui dépend du timing est une vraie faille : on ne protège pas contre le hasard, on protège contre quelqu'un qui cherche. Et la correction ne coûte rien : une condition de plus dans une requête qui existait déjà. Ce qui reste à faire : une limitation du nombre d'essais sur `/oauth/token`, pour freiner les tentatives en rafale.

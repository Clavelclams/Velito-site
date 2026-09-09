---
titre: "Pourquoi mes fonctions pures sont testables (et le reste ne l'est pas)"
projet: "arena"
bloc: 1
themes: ["tests", "architecture"]
source: "apps/arena/lib/bracket.ts, lib/elo.ts, lib/poules.ts"
date: 2026-09-04
---

## Le concept

ARENA a **11 fichiers de tests** qui tournent en quelques millisecondes, sans base de données, sans serveur, sans mock. Ce n'est pas un exploit de testeur : c'est la conséquence d'une décision d'**architecture** prise avant d'écrire la première ligne.

Une fonction est **pure** quand, pour les mêmes entrées, elle rend toujours la même sortie et ne touche à rien d'autre — pas de lecture en base, pas d'appel réseau, pas d'horloge, pas d'écriture de fichier. `genererCalendrierPoule(["a","b","c"], 1)` rend exactement la même chose ce soir qu'en mars prochain, sur mon PC comme sur Vercel.

Tout le métier d'ARENA vit dans des modules purs : `bracket.ts`, `bracket-double.ts`, `elo.ts`, `poules.ts`, `classement.ts`, `csv.ts`, `transitions.ts`. Les fichiers qui parlent à Supabase (`actions.ts`, `lib/supabase/*`) n'ont **aucune règle métier** — ils lisent, appellent une fonction pure, écrivent.

Le piège que ça évite : l'aléatoire. `melangerJoueurs` doit tirer au sort, donc elle n'est pas pure… sauf que le générateur est un **paramètre injectable** :

```ts
export function melangerJoueurs<T>(
  joueurs: readonly T[],
  rng: () => number = Math.random   // ← prod : rien à passer
): T[] { /* Fisher-Yates */ }
```

En test, je passe un `rng` déterministe et le résultat devient prévisible. En production, la valeur par défaut reprend la main. C'est de l'**injection de dépendance**, et ça tient en un paramètre.

## Comment je l'explique au jury

« J'ai séparé la logique métier des entrées-sorties. Mes algorithmes — bracket, ELO, poules, classement, CSV — sont des fonctions pures : mêmes entrées, mêmes sorties, aucun effet de bord. Résultat, je les teste avec Vitest en quelques millisecondes, sans base ni mock. Là où j'avais besoin d'aléatoire, j'ai injecté le générateur en paramètre avec `Math.random` par défaut : les tests sont déterministes, la production ne change pas. Ce n'est pas les tests qui ont rendu le code testable, c'est l'architecture. »

## La question vicieuse du jury

**« Vos tests ne touchent jamais la base. Comment savez-vous que votre application fonctionne ? »**

Je ne le sais pas, et je ne le prétends pas. Ces tests couvrent la **logique métier**, pas l'intégration. Ce sont deux niveaux distincts de la pyramide de tests : les tests unitaires vérifient que le calcul est juste, les tests d'intégration vérifient que le branchement est bon. Sur Venaball j'ai l'autre moitié — des tests fonctionnels qui montent le noyau Symfony et tapent en base, notamment les tests anti-IDOR. Sur ARENA, les invariants critiques ne sont d'ailleurs pas gardés par du code testable mais par des **triggers Postgres** : un match validé ne peut plus bouger, même via `service_role`. La garantie est dans la base, pas dans un test.

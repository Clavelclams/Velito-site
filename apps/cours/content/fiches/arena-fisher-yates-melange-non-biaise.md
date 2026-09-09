---
titre: "sort(() => Math.random() - 0.5) est un tirage truqué"
projet: "arena"
bloc: 1
themes: ["algorithmes", "tests"]
source: "apps/arena/lib/bracket.ts (melangerJoueurs)"
date: 2026-09-04
---

## Le concept

Pour mélanger un tableau, tout le monde écrit ça un jour :

```ts
const melange = [...joueurs].sort(() => Math.random() - 0.5); // ❌
```

Ça a l'air malin et c'est **faux**. `sort` n'est pas fait pour ça : il attend un comparateur *cohérent* — si `a < b` et `b < c`, alors `a < c`. Ici le comparateur répond au hasard, donc il se contredit lui-même. L'algorithme de tri du moteur (Timsort dans V8) ne visite pas toutes les paires : il en compare certaines une fois, d'autres jamais, selon la taille et l'ordre initial. Conséquence : **certaines permutations sortent bien plus souvent que d'autres**, et la distribution dépend du moteur JavaScript.

Pour un tirage de tournoi, ce n'est pas une subtilité théorique : ça veut dire que le joueur inscrit en premier a statistiquement plus de chances de se retrouver toujours au même endroit du bracket. Devant un orga, c'est indéfendable.

La bonne méthode est **Fisher-Yates**, où chaque permutation a exactement la même probabilité :

```ts
export function melangerJoueurs<T>(joueurs: readonly T[], rng = Math.random): T[] {
  const copie = [...joueurs];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));   // j ∈ [0, i]
    const tmp = copie[i]!;
    copie[i] = copie[j]!;
    copie[j] = tmp;
  }
  return copie;
}
```

On part de la fin, on tire une position **au hasard parmi celles pas encore figées** (`0` à `i` inclus), on échange, on rétrécit. Chaque élément a exactement une chance sur `n` d'atterrir à chaque place.

Détail utile : `copie` est reconstruit avec `[...joueurs]` et le paramètre est `readonly` — la fonction ne modifie jamais le tableau qu'on lui passe.

## Comment je l'explique au jury

« Le tirage au sort du bracket utilise Fisher-Yates, pas `sort` avec un comparateur aléatoire. Le comparateur aléatoire est incohérent — il viole la transitivité que `sort` suppose — donc le résultat est biaisé et dépend du moteur JavaScript. Fisher-Yates garantit que les `n!` permutations sont équiprobables, en `O(n)` et en place. Sur un tirage de tournoi, l'équité n'est pas négociable : c'est la première chose qu'un orga va contester. »

## La question vicieuse du jury

**« Vous testez une fonction aléatoire. Comment un test peut-il passer à tous les coups ? »**

Parce que le générateur est un **paramètre**, pas une dépendance cachée : `rng: () => number = Math.random`. En test j'injecte une suite de valeurs contrôlées et je vérifie la permutation exacte attendue. Je teste aussi les propriétés qui doivent tenir quel que soit le tirage : même longueur en sortie, aucun joueur perdu, aucun dupliqué, tableau d'entrée non modifié. Ce que je ne teste **pas**, c'est la qualité statistique de `Math.random` lui-même — ce n'est pas mon code, et un test statistique dans une CI serait instable par nature. Si j'avais besoin d'un tirage inattaquable — un tirage officiel contesté en justice — `Math.random` ne suffirait plus et je passerais à `crypto.getRandomValues`.

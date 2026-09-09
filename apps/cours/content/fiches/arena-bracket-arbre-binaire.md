---
titre: "Un bracket, c'est un arbre binaire — et ça supprime une table"
projet: "arena"
bloc: 1
themes: ["algorithmes", "modelisation"]
source: "apps/arena/lib/bracket.ts"
date: 2026-09-04
---

## Le concept

Un tournoi à élimination simple est un **arbre binaire** : chaque match a deux entrées et une sortie, et la sortie alimente le match du tour suivant.

Ma spécification de mars prévoyait une table `BracketNode` avec un `parent_id` pour relier les matchs entre eux. Je l'ai supprimée, parce qu'un match repéré par un couple `(round, position)` porte déjà l'information :

> le match parent de `(round, position)` est **toujours** `(round + 1, floor(position / 2))`.

C'est une propriété mathématique de l'arbre, pas une donnée à stocker. Les positions 0 et 1 du round 1 se rejoignent en position 0 du round 2 ; les positions 2 et 3 en position 1 ; et ainsi de suite. Une table en moins, et surtout **zéro risque de désynchronisation** entre le lien stocké et la réalité de l'arbre.

Le dimensionnement suit la même logique. Avec N joueurs, on arrondit à la puissance de 2 supérieure : 5 joueurs → bracket de 8 → `log2(8) = 3` rounds. Les `taille − N` places vides sont des **byes** : un joueur seul dans son match du premier tour passe automatiquement.

Le bug que ça a coûté : ma première version pouvait produire un match `(null, null)` avec 5 joueurs — un trou définitif dans l'arbre. La version actuelle garantit **au plus un bye par paire** au round 1, et c'est démontrable : le nombre de byes est `taille − N`, or `N > taille/2` par définition de la taille, donc `nbByes < taille/2`, c'est-à-dire moins d'un bye par match du premier tour.

## Comment je l'explique au jury

« Un bracket est un arbre binaire. J'avais prévu une table de nœuds avec un `parent_id`, je l'ai supprimée : la relation parent se déduit du couple `(round, position)` par la formule `(round+1, position/2)` arrondie. C'est une propriété de l'arbre, pas une donnée. Ça m'enlève une table, une jointure, et surtout la classe de bugs où le lien stocké ne correspond plus à l'arbre réel. Le nombre de tours vaut `log2` de la taille arrondie à la puissance de 2, et les places vides deviennent des byes — j'ai démontré qu'il ne peut jamais y en avoir deux dans le même match. »

## La question vicieuse du jury

**« Et si demain vous voulez un tournoi en double élimination ? Votre formule ne tient plus. »**

Elle ne tient plus telle quelle, et c'est pour ça que `bracket-double.ts` est un module séparé. La double élimination introduit un deuxième arbre — le *loser bracket* — dont les entrées viennent du premier ; la migration `002` ajoute d'ailleurs une colonne `bracket` avec la contrainte `CHECK (bracket IN ('W','L','GF'))` pour distinguer winner, loser et grande finale. Le principe reste le même : la topologie est calculée, pas stockée. J'ai préféré deux modules explicites à une abstraction unique qui aurait essayé de couvrir les deux formats — et qui aurait été illisible pour couvrir aussi les poules, qui ne sont pas un arbre du tout.

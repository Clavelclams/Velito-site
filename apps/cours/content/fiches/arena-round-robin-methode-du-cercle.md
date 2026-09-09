---
titre: "Faire jouer tout le monde contre tout le monde : la méthode du cercle"
projet: "arena"
bloc: 1
themes: ["algorithmes", "metier"]
source: "apps/arena/lib/poules.ts (genererCalendrierPoule)"
date: 2026-09-04
---

## Le concept

En élimination directe, la moitié des joueurs a fini après un seul match. Pour un événement associatif qui dure une journée, c'est un mauvais produit : les gens sont venus pour jouer. D'où le format **poules puis phase finale** — plusieurs matchs garantis à tout le monde, puis une élimination directe entre les qualifiés.

Générer un calendrier de poule, c'est résoudre un problème connu : chaque joueur doit affronter tous les autres **exactement une fois**, réparti en journées où personne ne joue deux fois. La solution classique est la **méthode du cercle** : on fixe le premier joueur, et on fait tourner tous les autres d'un cran à chaque journée.

```ts
for (let journee = 1; journee <= n - 1; journee++) {
  for (let i = 0; i < n / 2; i++) {
    const a = liste[i]!;
    const b = liste[n - 1 - i]!;      // on apparie les extrémités
    /* ... */
  }
  liste.splice(1, 0, liste.pop()!);   // rotation : le 1er reste fixe
}
```

À chaque journée on apparie les extrémités de la liste : le premier avec le dernier, le deuxième avec l'avant-dernier, etc. Puis on retire le dernier élément et on le réinsère en position 1 — la rotation. En `n − 1` journées, toutes les paires sont sorties, et on obtient bien `n(n−1)/2` matchs.

Le cas impair se règle par une **sentinelle** : si l'effectif est impair, on ajoute un joueur fictif `__REPOS__`. Les paires qui le contiennent ne produisent pas de match — le joueur concerné se repose ce tour-là. Aucun cas particulier à écrire dans la boucle : l'astuce est dans les données, pas dans le code.

Détail de confort : une journée sur deux, j'inverse l'ordre de la paire. Sans ça, le même joueur serait systématiquement « joueur 1 », ce qui donne un affichage bancal.

## Comment je l'explique au jury

« Le calendrier des poules utilise la méthode du cercle : un joueur reste fixe, les autres tournent d'un cran à chaque journée, et on apparie les extrémités de la liste. En `n−1` journées chaque joueur a rencontré tous les autres une fois, soit `n(n−1)/2` matchs. Pour un effectif impair, j'ajoute un joueur fictif "repos" : les paires qui le contiennent ne produisent pas de match. C'est une sentinelle — je règle le cas particulier dans la donnée plutôt qu'avec un `if` dans la boucle, et l'algorithme reste le même. »

## La question vicieuse du jury

**« Vous générez le calendrier au démarrage. Que se passe-t-il si un joueur ne vient pas ? »**

Rien ne casse, et c'est voulu. Le classement ne compte que les matchs **validés** : `classementPoule` filtre sur `m.valide` avant tout calcul. Un match non joué n'entre dans aucun total — il ne compte ni comme victoire, ni comme défaite, ni comme forfait. Et `pouleTerminee` compare le nombre de matchs validés au nombre attendu `n(n−1)/2` : tant que le compte n'y est pas, la phase finale ne peut pas être générée, et le staff doit trancher explicitement — annuler le match, le déclarer forfait, ou attendre. Je n'ai pas voulu d'un forfait automatique : sur un événement d'asso, un joueur en retard de vingt minutes est un cas fréquent, et une décision humaine vaut mieux qu'une règle rigide. C'est aussi pour ça que la phase finale est une **seconde action** explicite, et pas la suite automatique des poules.

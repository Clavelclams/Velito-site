---
titre: "Les cas limites : là où les bugs vivent"
parcours: "tests"
ordre: 4
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Un test du cas normal prouve que ça marche quand tout va bien. Les bugs ne vivent pas là. Ils vivent aux **bords** : zéro, un, vide, négatif, trop grand, doublon, `null`, la limite exacte. Un bon fichier de test passe plus de temps sur les bords que sur le milieu.

**La check-list des bords, à dérouler sur chaque fonction.**

- **Vide** : tableau vide, chaîne vide, `null`, `undefined`. `repartirEnPoules([], 2)` doit lever une erreur claire, pas planter sur `undefined[0]`.
- **Un seul** : un joueur dans un bracket, une ligne dans un CSV. Beaucoup d'algorithmes marchent à N ≥ 2 et cassent à 1.
- **La limite exacte** : `facteurK(9)` vaut 40, `facteurK(10)` vaut 20. Le test doit vérifier **9 et 10**, pas 5 et 50. Un `<` à la place d'un `<=` ne se voit qu'à la frontière.
- **Puissance de 2 et juste à côté** : bracket à 4 joueurs (exact), 5 joueurs (un bye), 8 (exact), 9 (sept byes). Le bug du double-bye d'ARENA vivait à 5.
- **Doublons** : deux joueurs avec le même pseudo, deux fois le même id dans une liste.
- **Négatif et zéro** : score de −1, `p_points` négatif dans `add_player_score` (c'est pour ça que `greatest(0, …)` existe).
- **Unicode et caractères spéciaux** : un pseudo `L";DROP`, un nom avec accent dans un CSV, une chaîne avec un saut de ligne. `echapperChampCsv` existe pour ça, et son test le prouve.
- **Trop grand** : un pseudo de 10 000 caractères, une liste de 100 000 joueurs (est-ce que ça finit ?).

**Tester les erreurs, pas seulement les succès.** Une fonction qui refuse une entrée invalide doit être testée sur ce refus :

```ts
it("refuse une poule sans assez de joueurs", () => {
  expect(() => repartirEnPoules(["a", "b", "c"], 2)).toThrow("Effectif insuffisant");
});
```

Deux choses à vérifier : **que** ça lève, et **quel message**. Le message fait partie du contrat — c'est ce que l'orga verra. Un test qui vérifie juste `toThrow()` sans message laisse passer une erreur qui lève pour la mauvaise raison (un `TypeError` sur `undefined`, par exemple).

**L'égalité interdite.** `bracket.ts` refuse un score égal en élimination simple. Le test correspondant est plus important que celui du cas normal : c'est une **règle métier négative** — « ceci ne doit jamais arriver » — et c'est exactement ce qu'un futur toi oubliera en réécrivant la fonction.

**Les propriétés plutôt que les valeurs.** Pour un tirage aléatoire ou un algorithme complexe, tu ne peux pas toujours prédire la sortie exacte. Mais tu peux vérifier des **propriétés** qui doivent tenir quelle que soit la sortie :

```ts
it("ne perd ni ne duplique aucun joueur", () => {
  const entree = ["a", "b", "c", "d", "e"];
  const sortie = melangerJoueurs(entree);
  expect(sortie).toHaveLength(5);
  expect([...sortie].sort()).toEqual([...entree].sort());
  expect(entree).toEqual(["a", "b", "c", "d", "e"]);   // l'entrée n'est pas modifiée
});
```

Même sans connaître l'ordre, tu prouves : même longueur, mêmes éléments, entrée intacte. Pour `genererCalendrierPoule` : chaque paire apparaît exactement une fois, personne ne joue deux fois dans la même journée, `n(n−1)/2` matchs. Ce sont des invariants — et ce sont souvent les tests les plus solides.

**Le test qui documente un choix.** `ordonnerQualifies` refuse plus de 2 qualifiés par poule — décision V1 assumée. Le test qui vérifie ce refus dit à quiconque lit : « ce n'est pas un oubli, c'est voulu ». Quand la V2 arrivera, ce test cassera, et c'est exactement le moment de relire la décision.

**Un bug trouvé = un test ajouté.** Le bug du doublon d'affectation du 19 août, le bug des fratries fusionnées de VEA, le bug du J−230 : chacun aurait dû produire un test qui le reproduit **avant** la correction (rouge), puis le vérifie **après** (vert). C'est le seul moyen de garantir qu'il ne revient pas — et c'est une habitude, pas une technique.

## À retenir

- Les bugs vivent aux bords : vide, un, limite exacte, doublon, négatif, spécial, trop grand.
- Tester les refus avec `toThrow("message")` — le message fait partie du contrat.
- Les règles négatives (« ne doit jamais ») sont plus importantes à tester que les cas normaux.
- Quand la sortie exacte est imprévisible, tester des propriétés : longueur, éléments, entrée intacte.
- Un bug trouvé = un test qui le reproduit, ajouté avant de corriger.

## Mise en pratique

Objectif : trouver les bords non testés d'un module ARENA, et en couvrir cinq.

1. Ouvre `apps/arena/lib/poules.ts` et `poules.test.ts` côte à côte. Pour chaque fonction exportée, déroule la check-list des bords et coche ce qui est déjà testé.
2. Écris cinq tests manquants dans `poules.test.ts` — par exemple : `genererCalendrierPoule` avec 2 joueurs (un seul match), avec 3 (repos), `classementPoule` sans aucun match validé (tous à zéro, ordre d'entrée), avec un match non validé (ignoré), `ordonnerQualifies` avec un nombre impair de poules.
3. Un test de propriété : pour une poule de 7 joueurs, vérifie que chaque paire apparaît **exactement une fois** (construis un `Set` de `"a|b"` triés) et qu'il y a 21 matchs.
4. Un test de refus avec message : `pouleTerminee` ou `repartirEnPoules` sur une entrée invalide, `toThrow("…")` avec le début exact du message.
5. Lance en watch. Si un de tes nouveaux tests est rouge **et que tu penses que le test est juste**, tu as trouvé un bug. Vérifie, corrige le code, commit séparément : `fix(arena): …` puis `test(arena): …`.
6. Reproduis un bug passé : sur `apps/cours/lib/progression.ts`, écris le test qui aurait attrapé « le compte à rebours est figé » — c'est impossible sur du code qui lit `Date.now()` sans paramètre. Constate-le, et note que la leçon 3 (injection) est ce qui le rendrait possible.

Résultat attendu : cinq tests de bords sur du code réel, au moins un test de propriété, et l'habitude de dérouler la check-list.

---
titre: "Fast-forward ou merge commit : ce que fait vraiment git merge"
parcours: "git-avance"
ordre: 2
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Le 9 septembre tu as tapé `git merge feat/arena-palmares-saisie-manuelle` sur `main`, et Git a répondu `Fast-forward`. Pas de commit de merge, pas de conflit, l'étiquette `main` a juste sauté 7 commits en avant. Pourquoi ce cas-là, et quand Git fait-il autrement ?

**Le cas simple : fast-forward.** Quand la branche cible (`main`) est un **ancêtre direct** de la branche fusionnée — autrement dit, quand `main` n'a reçu aucun commit depuis la création de la branche — il n'y a rien à fusionner. Les commits de la branche prolongent simplement l'histoire de `main`. Git **déplace l'étiquette** `main` jusqu'au bout de la branche. C'est tout. Aucun nouveau commit n'est créé.

```
avant :  A ← B ← C ← D ← E ← F      (feat)
         ↑
        main

après :  A ← B ← C ← D ← E ← F
                             ↑
                       main, feat
```

C'est exactement ton cas : `git merge-base --is-ancestor main HEAD` renvoyait vrai, donc aucun conflit n'était possible. Un fast-forward ne peut **jamais** produire de conflit, parce qu'il ne combine rien : il avance.

**Le cas général : merge commit.** Si `main` a avancé de son côté pendant que tu travaillais sur la branche — un fix rapide, un merge d'une autre branche — les deux lignes ont **divergé**. Git doit alors créer un **commit de merge**, qui a **deux parents** : la pointe de `main` et la pointe de la branche. Son instantané est la combinaison des deux.

```
        C ← D        (feat)
       ↙       ↘
A ← B           M     (main, après merge)
       ↖       ↗
        E ← F        (main avant)
```

C'est là que les conflits peuvent apparaître : si les deux côtés ont modifié la même ligne du même fichier, Git ne peut pas décider seul. Il marque le fichier, s'arrête, et attend ton arbitrage (tu l'as pratiqué dans le parcours Terminal, leçon 9).

**Le point que peu de gens comprennent : un merge commit est une vraie photo.** Il ne contient pas « les changements de la branche ». Il contient l'état complet des fichiers après fusion. Si tu résous un conflit en écrivant n'importe quoi, ce n'importe quoi est ce que `main` contiendra. Git n'a aucune opinion sur le contenu — il fusionne des lignes, pas du sens.

**Choisir : `--ff-only` et `--no-ff`.** Deux options qui rendent explicite ce que tu veux :

- `git merge --ff-only feat` : « fusionne seulement si c'est un fast-forward, sinon refuse ». C'est la version sûre quand tu veux être certain de ne pas créer de merge commit ni de conflit. Si Git refuse, c'est que `main` a bougé — tu sais alors qu'il faut regarder avant d'agir.
- `git merge --no-ff feat` : « crée un merge commit même si un fast-forward était possible ». Ça garde une trace visible que ces N commits formaient un lot cohérent. Certaines équipes l'imposent pour que `git log --graph` montre chaque fonctionnalité comme une bosse identifiable.

Lequel choisir ? Si tu travailles seul et que tu fusionnes des branches courtes : fast-forward, historique linéaire, lisible. Si tu veux pouvoir dire « la fonctionnalité X, c'est ce merge-là » : `--no-ff`. Ce qu'il faut éviter, c'est de ne pas savoir lequel des deux vient de se produire.

**Ce qui se passe sur GitHub avec une Pull Request.** Le bouton « Merge » propose trois stratégies : *Create a merge commit* (= `--no-ff`), *Squash and merge* (les N commits de la branche deviennent UN commit sur main), *Rebase and merge* (les commits sont rejoués sur main, historique linéaire, on y vient leçon 3). La première garde tout, la deuxième simplifie, la troisième aplatit.

## À retenir

- Fast-forward = `main` n'avait pas bougé → Git déplace l'étiquette, zéro commit créé, zéro conflit possible.
- Merge commit = les deux branches ont divergé → un commit à deux parents, conflits possibles.
- `--ff-only` refuse tout sauf le cas sûr. `--no-ff` force un commit de merge visible.
- Un merge commit est une photo complète : ce que tu écris en résolvant un conflit est ce que main contiendra.
- Sur GitHub : merge commit / squash / rebase sont trois façons différentes d'écrire l'histoire.

## Mise en pratique

Objectif : produire les deux cas — fast-forward puis merge commit — dans ton dépôt d'entraînement, et les distinguer au `git log`.

1. `cd "C:\Users\Velito Adventure\Documents\terminal-lab"`, `git status` propre, `git switch main`.
2. **Fast-forward :** `git switch -c ff-demo`, ajoute une ligne dans `recette.md`, `git add recette.md`, `git commit -m "Ingredient bonus"`. `git switch main`. `git merge --ff-only ff-demo`. Lis la sortie : `Fast-forward`. `git log --oneline --graph -5` : une ligne droite.
3. **Merge commit :** `git switch -c mc-demo`, modifie la **première** ligne de `recette.md`, commit `"Titre en majuscules"`. `git switch main`. Modifie la **dernière** ligne (pas la même !), commit `"Note de fin"`. Maintenant main a bougé. `git merge --ff-only mc-demo` : Git **refuse** (« Not possible to fast-forward »). C'est le signal.
4. `git merge mc-demo` : Git ouvre un éditeur pour le message du merge commit (ferme-le pour accepter). `git log --oneline --graph -6` : tu vois la fourche et le commit de merge avec deux parents.
5. `git show --stat HEAD` : le merge commit. Note la ligne `Merge: xxxx yyyy` — ses deux parents.
6. Réflexion (à écrire dans un fichier `notes.md` du lab) : le 9 septembre, ton merge était-il un fast-forward ou un merge commit ? Pourquoi ? (Indice : `main` avait-il bougé entre la création de la branche et le merge ?)

Résultat attendu : tu reconnais les deux cas à la sortie de la commande et au graphe, et tu sais utiliser `--ff-only` comme filet de sécurité.

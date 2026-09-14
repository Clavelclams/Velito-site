---
titre: "Rebase sans peur : réécrire l'histoire, et quand ne pas le faire"
parcours: "git-avance"
ordre: 3
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

`rebase` a une réputation de commande dangereuse. Elle l'est si on ne comprend pas ce qu'elle fait ; elle est banale sinon. Cette leçon la démystifie avec le modèle du graphe.

**Ce que fait `git rebase main` depuis une branche :** Git prend tes commits — ceux que `main` n'a pas — et les **rejoue un par un** par-dessus la pointe actuelle de `main`. Chaque commit rejoué est un **nouveau commit** : même contenu, même message, mais un parent différent, donc un hash différent. Les anciens commits ne sont pas supprimés (ils restent dans la base de données de Git un moment), mais ta branche pointe maintenant sur les nouveaux.

```
avant :   A ← B ← C ← D        (main)
               ↖
                 E ← F         (feat)

après :   A ← B ← C ← D        (main)
                       ↖
                         E' ← F'   (feat)
```

Résultat : ta branche repart de la pointe de `main`, comme si tu l'avais créée aujourd'hui. Un merge derrière sera un **fast-forward** — historique linéaire, propre, sans commit de merge.

**Pourquoi c'est utile.** Deux cas concrets dans ta façon de travailler :

1. Tu as une branche `feat/arena-poules` de trois jours. Pendant ce temps tu as poussé un fix sur `main`. Avant de merger, `git rebase main` sur ta branche : tu vois immédiatement si tes commits sont compatibles avec le fix, tu résous les éventuels conflits **dans ta branche** (pas sur `main`), et ton merge final est un fast-forward garanti.
2. Tu as fait 5 commits « wip », « fix typo », « oups » sur une branche. `git rebase -i main` (interactif) te laisse les **réordonner, fusionner (`squash`), renommer, supprimer**. Tu pousses une histoire lisible au lieu d'un brouillon.

**La règle d'or, la seule qui compte : ne rebase jamais des commits que quelqu'un d'autre a déjà.** Rebase crée de nouveaux hashes. Si un collègue — ou Vercel, ou ton autre PC — a déjà les anciens, vous avez désormais deux histoires incompatibles pour les mêmes changements. Le prochain `pull` produit des doublons et des conflits absurdes. Concrètement :

- Rebaser une branche **locale**, jamais poussée, ou poussée mais que tu es seul à utiliser : **oui, librement**.
- Rebaser `main`, ou toute branche partagée : **jamais**.

Tu travailles seul sur tes dépôts. Ça te donne beaucoup de liberté — et une seule vraie exception : Vercel. Vercel a déjà les commits que tu as poussés. Si tu rebases une branche déjà poussée et que tu forces le push (`--force`), Vercel verra une branche dont l'histoire a changé ; ça marche, il rebuilde, mais les déploiements précédents pointent vers des hashes qui n'existent plus dans ta branche. Pas grave pour une branche de feature, catastrophique pour `main`.

**Le push après rebase.** Puisque les hashes ont changé, `git push` normal est refusé : le serveur voit que ta branche ne « contient » plus ce qu'il a. Il faut `git push --force-with-lease`. **Pas `--force`.** La différence : `--force` écrase quoi qu'il arrive ; `--force-with-lease` refuse si le serveur a reçu entre-temps des commits que tu n'as pas vus. C'est le filet qui évite d'effacer le travail d'un autre — ou le tien depuis un autre poste.

**Rebase interactif, en pratique.** `git rebase -i main` ouvre un fichier listant tes commits, un par ligne, avec `pick` devant chacun. Tu remplaces `pick` par :

- `squash` (ou `s`) : fusionner avec le commit du dessus, en combinant les messages ;
- `fixup` (ou `f`) : fusionner en jetant ce message ;
- `reword` (ou `r`) : garder le commit, changer son message ;
- `drop` (ou `d`) : supprimer le commit ;
- et tu peux réordonner les lignes.

Sauvegarde, ferme : Git exécute le plan. Si un conflit survient à une étape, il s'arrête ; tu résous, `git add`, `git rebase --continue`. Si tu paniques : `git rebase --abort` remet tout comme avant. **Rien n'est perdu tant que tu n'as pas poussé.**

## À retenir

- Rebase rejoue tes commits par-dessus une autre branche : nouveaux hashes, histoire linéaire.
- Règle unique : jamais sur des commits que quelqu'un d'autre possède. `main` = jamais.
- Après rebase d'une branche poussée : `git push --force-with-lease`, jamais `--force`.
- `rebase -i` = ménage avant de partager : squash, reword, réordonner.
- `git rebase --abort` annule tout. Tu ne peux rien casser tant que tu n'as pas poussé.

## Mise en pratique

Objectif : rebaser une branche divergente, puis nettoyer trois commits brouillons en un seul.

1. Dans `terminal-lab`, `git switch main`. Crée `git switch -c rb-demo`. Fais **trois** commits successifs sur `recette.md` : `"wip"`, `"wip2"`, `"fini"` (une ligne ajoutée à chaque fois).
2. `git switch main`, ajoute une ligne **ailleurs** dans le fichier, commit `"Correction sur main"`. Les branches ont divergé.
3. `git switch rb-demo`, puis `git log --oneline --graph --all -8` : observe la fourche.
4. `git rebase main`. Si conflit : ouvre le fichier, arbitre, `git add recette.md`, `git rebase --continue`. Sinon, c'est fini d'un coup.
5. `git log --oneline --graph --all -8` : la fourche a disparu, `rb-demo` part de la pointe de `main`. Note que les hashes de tes trois commits ont **changé**.
6. Nettoie : `git rebase -i main`. Dans l'éditeur, laisse `pick` sur le premier, mets `squash` sur les deux autres. Sauvegarde, ferme. Dans le second éditeur, écris un seul message : `"Recette : version finale"`. Ferme.
7. `git log --oneline -3` : un seul commit là où il y en avait trois.
8. `git switch main`, `git merge --ff-only rb-demo` : fast-forward, comme promis.
9. Lecture seule sur ton vrai dépôt : `cd "C:\Users\Velito Adventure\Documents\Velito-site"`, `git log --oneline -12`. Repère les commits « wip »-like que tu aurais pu squasher avant de merger. Ne fais rien — ils sont sur `main`, donc intouchables.

Résultat attendu : tu as vécu un rebase, un squash, et tu sais pourquoi `main` ne se rebase jamais.

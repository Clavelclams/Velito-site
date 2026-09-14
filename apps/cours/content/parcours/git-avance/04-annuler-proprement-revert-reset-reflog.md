---
titre: "Annuler proprement : revert, reset, et le reflog qui sauve tout"
parcours: "git-avance"
ordre: 4
niveau: "solide"
duree: 25
date: 2026-09-09
---

## Le cours

« J'ai cassé quelque chose, je veux revenir en arrière. » Git a quatre réponses selon la situation, et les confondre est la source de la plupart des accidents. On les prend dans l'ordre du moins destructif au plus destructif.

**1. Annuler un commit déjà partagé : `git revert`.** Tu as poussé un commit sur `main`, il est en prod, il casse. Tu ne peux pas le supprimer — Vercel l'a, GitHub l'a, l'histoire est publique. `git revert <hash>` crée un **nouveau commit** qui applique l'inverse exact du commit visé. L'histoire garde le commit fautif **et** son annulation. C'est la seule méthode correcte sur une branche partagée. Tu pousses normalement, Vercel redéploie l'état d'avant.

```bash
git revert 7c762ab          # crée "Revert 'feat(cours): 30 fiches…'"
git push
```

Un revert peut lui-même être reverté : si tu réalises que le commit était bon, `git revert <hash-du-revert>` le remet.

**2. Défaire des commits locaux non partagés : `git reset`.** Tu as fait deux commits sur une branche locale et tu veux les refaire autrement. `git reset` **déplace l'étiquette de la branche** en arrière. Trois modes, selon ce que tu veux garder :

- `git reset --soft HEAD~2` : la branche recule de 2 commits, mais les modifications restent **indexées** (prêtes à recommiter). Idéal pour « fusionner mes deux derniers commits en un ».
- `git reset --mixed HEAD~2` (le défaut) : recule de 2, modifications gardées dans le dossier de travail, mais **désindexées**. Tu retrouves tes fichiers modifiés comme avant `git add`.
- `git reset --hard HEAD~2` : recule de 2 et **jette** les modifications. Le dossier de travail est remis à l'état du commit cible. C'est la seule variante qui détruit du travail non commité.

Reset ne se fait **jamais** sur des commits déjà poussés et partagés — c'est la même règle que le rebase, pour la même raison : tu réécrirais une histoire que d'autres ont.

**3. Annuler des modifications pas encore commitées.** Deux cas :

- Fichier modifié, pas encore `add` : `git restore recette.md` remet la version du dernier commit. **Destructif** : tes modifications sont perdues.
- Fichier `add` mais pas commité : `git restore --staged recette.md` le désindexe (les modifs restent dans le fichier).

**4. Le filet de sécurité : `git reflog`.** Voici ce qui rend Git presque impossible à casser pour de bon. Chaque fois que `HEAD` bouge — commit, checkout, reset, rebase, merge — Git note l'ancien et le nouveau hash dans un journal : le **reflog**. Il garde ces entrées environ 90 jours.

Donc : tu as fait `git reset --hard` par erreur et perdu trois commits ? Ils ne sont pas perdus. `git reflog` te montre :

```
a1b2c3d HEAD@{0}: reset: moving to HEAD~3
f4e5d6c HEAD@{1}: commit: feat: la chose que je voulais garder
```

`git reset --hard f4e5d6c` (ou `HEAD@{1}`) et tout est revenu. Un rebase raté, une branche supprimée par erreur, un `--force` malheureux : le reflog a l'ancien hash. **La seule chose que Git ne peut pas retrouver, c'est du travail qui n'a jamais été commité** — d'où le réflexe de commiter souvent, même en brouillon, quitte à squasher après.

**Detached HEAD.** Si tu fais `git checkout <hash>` ou `git checkout origin/main`, `HEAD` pointe directement sur un commit, pas sur une branche. Git t'avertit : « You are in 'detached HEAD' state ». C'est normal pour *regarder* un ancien état. Si tu commites dans cet état, le commit n'appartient à aucune branche — tu le perdras en changeant de branche (sauf via reflog). Pour travailler à partir de là : `git switch -c nouvelle-branche`.

## À retenir

- Commit partagé à annuler → `revert` (nouveau commit inverse). Jamais autre chose.
- Commits locaux à défaire → `reset --soft/--mixed/--hard` selon ce que tu gardes.
- Modifs non commitées → `git restore` (destructif) / `git restore --staged` (désindexe).
- `git reflog` : le journal de tout ce que HEAD a fait. Presque rien n'est irrécupérable.
- Ce qui n'a jamais été commité est le seul vrai risque : commite souvent.

## Mise en pratique

Objectif : perdre volontairement trois commits, puis les retrouver avec le reflog. Ensuite, un revert propre.

1. Dans `terminal-lab`, sur `main`, fais trois commits distincts (`"un"`, `"deux"`, `"trois"`), une ligne chacun dans `recette.md`.
2. `git log --oneline -4` : note le hash de `"trois"`.
3. Le drame : `git reset --hard HEAD~3`. `git log --oneline -3` : les trois commits ont disparu. Ouvre `recette.md` : les lignes aussi.
4. `git reflog` : première ligne `reset: moving to HEAD~3`, seconde ligne `commit: trois` avec son hash.
5. `git reset --hard HEAD@{1}`. `git log --oneline -4` : les trois sont revenus. Ouvre le fichier : les lignes aussi. Respire.
6. Revert maintenant : `git revert HEAD` (annule `"trois"`). Un éditeur s'ouvre, ferme-le. `git log --oneline -5` : un commit `Revert "trois"` **au-dessus** de `"trois"`, qui est toujours là. C'est ça, annuler sans effacer.
7. Reset soft : `git reset --soft HEAD~2` puis `git status`. Les modifs des deux derniers commits sont indexées, prêtes. `git commit -m "deux et trois fusionnes"`. `git log --oneline -4`.
8. Detached : `git checkout HEAD~2`. Lis l'avertissement. `git switch -c depuis-le-passe`. Tu es sur une nouvelle branche partie d'un ancien commit. `git switch main` pour revenir.

Résultat attendu : tu as perdu et retrouvé des commits, fait un revert et un reset soft, et tu sais que le reflog est toujours là derrière toi.

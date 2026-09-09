---
titre: "index.lock et les trois zones : ce que Git fait entre ton fichier et le commit"
parcours: "git-avance"
ordre: 6
niveau: "intermediaire"
duree: 15
date: 2026-09-09
---

## Le cours

Deux fois cet été, tu as dû taper `del .git\index.lock` avant de pouvoir commiter. Tu l'as fait sans savoir ce que c'était. Ça mérite mieux, parce que ce fichier révèle comment Git travaille.

**Les trois zones.** Entre ton éditeur et l'historique, il y a trois états pour un fichier :

1. **Le dossier de travail** (*working tree*) : tes fichiers tels qu'ils sont sur le disque. Ce que VS Code affiche.
2. **L'index** (*staging area*) : la liste de ce qui fera partie du **prochain** commit. `git add` copie l'état actuel d'un fichier dans l'index. Physiquement, c'est le fichier binaire `.git/index`.
3. **L'historique** : les commits. `git commit` prend l'index tel quel et en fait un instantané.

Le point clé : **`git add` prend une photo à l'instant T**. Si tu modifies le fichier après `git add`, la modification n'est **pas** dans l'index. `git status` te le montre en deux couleurs : vert (« Changes to be committed », dans l'index) et rouge (« Changes not staged », dans le dossier mais pas dans l'index). Un même fichier peut apparaître dans les deux si tu l'as modifié après l'avoir indexé.

C'est pour ça que `git add -p` existe : il te laisse choisir **morceau par morceau** ce qui entre dans l'index. Tu peux commiter la moitié d'un fichier — la correction — et garder l'autre moitié — l'expérimentation — pour plus tard.

**`index.lock`.** Quand une commande Git doit écrire dans l'index (`add`, `commit`, `checkout`, `merge`, `status` parfois), elle commence par créer `.git/index.lock`. C'est un **verrou** : si un second processus Git essaie d'écrire en même temps, il voit le fichier et refuse (« Unable to create '.git/index.lock': File exists »). À la fin de l'opération, Git supprime le verrou.

Le verrou reste si Git est interrompu avant la fin — plantage, fermeture brutale, ou dans ton cas : **un processus qui a créé le fichier mais n'a pas le droit de le supprimer**. C'est exactement ce qui se passe quand je lance `git status` depuis le pont Cowork : il s'exécute sur ta machine avec un compte qui peut créer mais pas effacer dans ce dossier. Le verrou reste, et ton prochain `git commit` bute dessus.

Le diagnostic est simple : si aucun processus Git ne tourne (ferme VS Code, qui en lance en arrière-plan), un `index.lock` est un cadavre, et le supprimer est sans risque. **Si** un Git tourne vraiment, le supprimer peut corrompre l'index — d'où le réflexe de vérifier avant.

**`git stash` : mettre de côté.** Tu es au milieu d'un travail, tu dois changer de branche pour un fix urgent, mais tes modifications non commitées t'en empêchent. `git stash` les met dans une pile, remet le dossier propre. Tu changes de branche, tu fais ton fix, tu reviens, `git stash pop` restaure. Le stash est une zone de plus, temporaire. `git stash list` montre la pile ; on peut en empiler plusieurs.

**`.git` en entier.** Tout ce que tu viens de voir vit dans `.git/` : `index`, `HEAD`, `refs/heads/*` (les branches), `refs/remotes/*` (tes copies des branches distantes), `objects/` (tous les commits, arbres et fichiers, compressés), `logs/` (le reflog), `hooks/`. Supprimer `.git`, c'est supprimer tout l'historique en gardant les fichiers. Copier un dossier avec son `.git`, c'est cloner.

## À retenir

- Trois zones : dossier de travail → `git add` → index → `git commit` → historique.
- `git add` photographie l'instant : modifier après = à re-`add`.
- `index.lock` = verrou d'écriture. Reste s'il y a interruption. Cadavre si aucun Git ne tourne → suppression sûre.
- `git stash` met de côté les modifs non commitées pour changer de branche.
- Tout est dans `.git/` : branches = fichiers texte, commits = objets compressés.

## Mise en pratique

Objectif : voir l'index à l'œuvre, reproduire un `index.lock`, et utiliser stash.

1. Dans `terminal-lab`, modifie `recette.md` (ligne 1). `git add recette.md`. Modifie **encore** `recette.md` (ligne 2). `git status` : le fichier apparaît **deux fois**, en vert et en rouge. `git diff` montre la modif rouge (non indexée), `git diff --staged` montre la verte.
2. `git commit -m "Seulement la ligne 1"`. `git show HEAD` : seule la ligne 1 est dans le commit. La ligne 2 attend. `git add` puis commit `"Ligne 2"`.
3. `git add -p` : modifie deux endroits différents du fichier, lance `git add -p`, réponds `y` au premier morceau, `n` au second. `git status` : les deux couleurs. C'est ton outil pour des commits propres.
4. Reproduis le verrou : `echo. > .git\index.lock`. `git commit -m "test"` : refus avec le message exact que tu as vu cet été. `del .git\index.lock`. Réessaie : ça passe. Tu sais maintenant ce que tu supprimes.
5. Stash : modifie `recette.md` sans commiter. `git switch -c autre` échoue ou emporte la modif (selon le cas). `git stash`, `git status` propre, `git switch -c autre`, `git switch main`, `git stash pop`. La modif est revenue.
6. Explore : `dir .git`, `type .git\HEAD`, `dir .git\refs\heads`. Ouvre `.git\logs\HEAD` : c'est le reflog en clair.

Résultat attendu : tu distingues index et dossier de travail, tu sais pourquoi `index.lock` apparaît et quand le supprimer, et tu sais utiliser stash.

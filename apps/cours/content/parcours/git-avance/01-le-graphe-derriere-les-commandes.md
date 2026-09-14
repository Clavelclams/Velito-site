---
titre: "Le graphe derrière les commandes"
parcours: "git-avance"
ordre: 1
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Tu utilises Git tous les jours, mais tu le vois comme une suite de commandes magiques : `add`, `commit`, `push`. Quand quelque chose sort du script — un merge inattendu, une branche qui « ne monte pas » — tu es perdu, parce que tu n'as pas le modèle mental. Cette leçon te le donne. Après ça, chaque commande devient prévisible.

**Un commit est une photo complète, pas une différence.** C'est le premier point à désapprendre. Quand tu commites, Git ne stocke pas « ce qui a changé » : il stocke un **instantané** de tous tes fichiers à cet instant. Les fichiers identiques au commit précédent ne sont pas dupliqués (Git les référence), mais conceptuellement, chaque commit est l'arbre complet. C'est pour ça que revenir sur n'importe quel commit est instantané : il n'y a rien à recalculer.

**Chaque commit pointe vers son parent.** Un commit contient : l'instantané, un message, un auteur, une date, et **le hash de son ou ses parents**. Ça forme une chaîne — plus exactement un **graphe orienté** : chaque flèche va d'un commit vers son parent, jamais l'inverse. Ton `git log` est la lecture de ce graphe en remontant.

```
d0d616d ← b8ee6a1 ← 54a0410 ← ... ← 7c762ab
  ↑                                      ↑
 main                     feat/arena-palmares-saisie-manuelle
```

**Une branche est juste une étiquette.** C'est la deuxième chose à désapprendre. `main` n'est pas un dossier ni une copie : c'est un fichier de 41 octets dans `.git/refs/heads/main` qui contient un hash de commit. Rien d'autre. Quand tu commites sur `main`, Git crée le commit, puis **déplace l'étiquette** `main` dessus. Créer une branche = créer une étiquette. Supprimer une branche = supprimer une étiquette ; les commits restent.

**`HEAD` est l'étiquette qui dit où tu es.** Il pointe vers une branche (état normal : « tu es sur main ») ou directement vers un commit (état « detached HEAD », qu'on verra en leçon 4). Quand tu commites, c'est la branche pointée par `HEAD` qui avance.

Regarde ce qui t'est arrivé le 9 septembre avec ce modèle :

- `HEAD` pointait sur `feat/arena-palmares-saisie-manuelle`.
- Tu as commité 7 fois : l'étiquette `feat/…` a avancé 7 fois. L'étiquette `main`, elle, **n'a pas bougé** — personne ne le lui a demandé.
- `git push` a poussé la branche courante. GitHub a reçu 7 commits… sous l'étiquette `feat/…`. `origin/main` est resté où il était.
- Vercel déploie ce que pointe `origin/main`. Donc rien.

Aucune commande n'a menti. Tu avais simplement une image fausse : tu croyais que « push » voulait dire « envoyer en prod », alors que ça veut dire « copier l'étiquette courante et ses commits sur le serveur ».

**`origin/main` est une étiquette de plus** : ta copie locale de « où en est `main` sur GitHub la dernière fois que j'ai regardé ». Elle ne bouge que sur `fetch`, `pull`, `push`. Elle peut être en retard sur la réalité de GitHub — c'est pour ça que `git status` peut dire « à jour » alors qu'un collègue vient de pousser.

Les commandes pour **voir** le graphe au lieu de le deviner :

```bash
git log --oneline --graph --all -20     # le graphe, toutes branches
git branch -vv                           # chaque branche, son commit, son remote
git log --oneline main..HEAD             # ce que HEAD a et que main n'a pas
git merge-base main HEAD                 # le dernier ancêtre commun
```

La troisième est celle qui aurait révélé ton problème en une ligne : 7 commits listés, donc 7 commits absents de `main`.

## À retenir

- Un commit = un instantané complet + le hash de ses parents. Le tout forme un graphe.
- Une branche = une étiquette sur un commit. `HEAD` = l'étiquette « tu es ici ».
- Commiter fait avancer **la branche courante uniquement**. Les autres ne bougent pas.
- `push` copie l'étiquette courante sur le serveur — ce n'est pas « déployer ».
- `origin/main` est ta *dernière vue* de main distant, pas la réalité en direct.

## Mise en pratique

Objectif : voir le graphe de ton vrai dépôt et retrouver, en lecture seule, la situation du 9 septembre.

1. `cd "C:\Users\Velito Adventure\Documents\Velito-site"`.
2. `git log --oneline --graph --all -25`. Repère les étiquettes entre parenthèses : `(HEAD -> main, origin/main, …)`. Compte combien de branches pointent sur le même commit que `main`.
3. `git branch -vv`. Chaque ligne : nom, hash, `[origin/…]` et éventuellement `ahead N` / `behind N`. Ces deux mots sont ta vérité : « ahead 7 » aurait signifié « 7 commits que le remote n'a pas ».
4. Ouvre le fichier `.git\refs\heads\main` dans le Bloc-notes (`notepad .git\refs\heads\main`). Tu vois un hash. C'est TOUTE la branche main. Compare avec `git rev-parse main` : identique.
5. `git log --oneline feat/arena-palmares-saisie-manuelle..main` puis `git log --oneline main..feat/arena-palmares-saisie-manuelle`. Aujourd'hui les deux sont vides (tu as mergé). Le 9 au matin, la seconde aurait listé 7 lignes.
6. Dessine sur papier le graphe tel que tu le comprends : commits en cercles, branches en étiquettes. Puis vérifie avec `git log --graph`. Si ton dessin est faux, relis la section « Une branche est juste une étiquette ».

Résultat attendu : tu sais lire `git log --graph` et `git branch -vv`, et tu ne confondras plus jamais « push » et « déployer ».

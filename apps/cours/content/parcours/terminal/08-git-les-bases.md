---
titre: "Git les bases : status, add, commit — la photo du projet"
parcours: "terminal"
ordre: 8
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Tu commites déjà tous les jours. Cette leçon met des images mentales solides derrière les mots, pour que tu puisses expliquer chaque geste au jury.

**Git est un appareil photo pour ton projet.** Un **commit**, c'est une photo complète de tous tes fichiers à un instant donné, rangée dans un album avec une légende (ton message en français), un auteur, une date et un identifiant unique. L'album entier vit dans le dossier caché `.git` (tu l'as aperçu leçon 2 avec `ls -Force`). Tant qu'une photo est dans l'album, tu peux y revenir : c'est ça qui enlève la peur de casser son code.

La subtilité géniale de Git, c'est qu'entre « tes fichiers » et « l'album », il y a une étape intermédiaire : la **zone de staging**. Explique-la avec les mains : ta main gauche désigne ton **répertoire de travail** (les fichiers que tu modifies, le chantier) ; entre tes deux mains, il y a la **table de préparation** (le staging) ; ta main droite tient **l'album** (l'historique des commits). Le photographe ne photographie pas le chantier en vrac : tu choisis, une par une, les modifications qui montent sur la table (`git add`), et seulement ce qui est sur la table part sur la photo (`git commit`). Intérêt : tu peux avoir modifié cinq fichiers et ne photographier que les deux qui concernent la même idée — un commit = une idée cohérente.

Les quatre commandes du quotidien :

```powershell
# Transforme le dossier courant en dépôt Git (crée le dossier .git) — une seule fois par projet
git init

# LA commande à taper sans arrêt : où en est le chantier ?
# Fichiers modifiés, fichiers sur la table de staging, fichiers inconnus de Git
git status

# Monter des modifications sur la table de préparation
git add src\Entity\Membre.php     # un fichier précis
git add .                          # tout le dossier courant (le "." de la leçon 2)

# Prendre la photo de ce qui est sur la table, avec une légende
git commit -m "Ajout de l'entité Membre avec ses champs de base"
```

`git status` est ta boussole : elle ne modifie rien, tu peux la taper cinquante fois par jour. Elle classe les fichiers en trois états : *untracked* (nouveaux, jamais photographiés), *modified* (changés depuis la dernière photo), *staged* (sur la table, prêts pour la photo). Bonus précieux : `git status` te suggère souvent la commande exacte pour revenir en arrière.

Sur le message de commit : c'est la légende que toi-dans-six-mois et ton jury liront. Bonne pratique : une phrase courte qui dit **ce que le commit apporte**, pas « modifs » ni « fix ». Tes messages en français sont très bien — la cohérence compte plus que la langue. Compare : « Correction du calcul de cotisation pour les mineurs » versus « oups ». Le premier raconte l'histoire du projet.

Un mot d'identité : chaque photo est signée. Git lit ton nom et ton email dans ta configuration (`git config user.name` et `git config user.email` pour les afficher). C'est cette signature, répétée sur des mois de commits, qui prouvera au jury CDA que ce travail est le tien.

Ces commandes sont identiques sur PowerShell et bash : Git parle la même langue partout, c'est un de ses grands atouts.

## À retenir

- Un commit est une photo complète du projet avec légende, auteur, date et identifiant ; l'album vit dans le dossier caché `.git`.
- Trois zones : répertoire de travail (chantier) → staging (table de préparation, via `git add`) → historique (album, via `git commit`).
- Le staging permet de composer des commits cohérents : une photo = une idée, même si dix fichiers ont bougé.
- `git status` est ma boussole : elle ne modifie rien et me dit l'état exact des trois zones.
- Un bon message de commit dit ce que le changement apporte ; c'est la documentation vivante du projet.

## Mise en pratique

Objectif : créer un dépôt d'entraînement pour manipuler le cycle complet, puis observer un vrai projet en lecture seule. On ne commite RIEN dans tes vrais projets aujourd'hui.

1. Retourne dans ton labo (leçon 3) : `cd "C:\Users\Velito Adventure\Documents\terminal-lab"`. (S'il n'existe plus : `mkdir terminal-lab` depuis `Documents`, puis entre dedans.)
2. Vérifie ta signature : `git config user.name` et `git config user.email`. Si l'un des deux est vide, configure-le : `git config --global user.name "Clavel Ndema Moussa"` (et pareil pour l'email).
3. Initialise l'album : `git init`, puis `git status` : Git te dit qu'il n'y a encore aucun commit.
4. Crée deux fichiers : `New-Item recette.md` et `New-Item courses.md`. Tape `git status` : les deux apparaissent en *untracked* (rouges).
5. Mets UN SEUL fichier sur la table : `git add recette.md`, puis `git status` : observe la différence — `recette.md` est *staged* (vert), `courses.md` reste *untracked*. C'est le staging avec les mains.
6. Prends la photo : `git commit -m "Ajout de la recette de base"`, puis `git status` : `courses.md` est toujours là, non photographié — preuve que seul le staging part dans le commit.
7. Ajoute et commite le second : `git add courses.md` puis `git commit -m "Ajout de la liste de courses"`. Regarde l'album : `git log --oneline` — deux photos, deux légendes.
8. Observation en conditions réelles (lecture seule) : `cd "C:\Users\Velito Adventure\Documents\mabb-site"`, puis `git status` (état de ton chantier actuel) et `git log --oneline -10` (tes dix dernières photos, avec tes messages en français). Relis tes propres messages : lesquels comprendrais-tu encore dans six mois ?

Résultat attendu : ton dépôt d'entraînement contient deux commits distincts alors que les fichiers ont été créés en même temps — tu as piloté le staging volontairement. Et tu sais lire `git status` et `git log` sur mabb-site sans rien risquer : ce sont des commandes de pure lecture.

---
titre: "Manipuler fichiers et dossiers : créer, copier, déplacer sans casser"
parcours: "terminal"
ordre: 3
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Tu sais te déplacer (leçon 2). Maintenant, on agit : créer, copier, déplacer, renommer. C'est tout ce que tu fais déjà avec le clic droit de l'explorateur Windows, mais en texte — donc scriptable, et utilisable sur un serveur OVH où il n'y a pas de souris.

```powershell
# Créer un dossier ("make directory")
mkdir brouillons
# mkdir est un alias de New-Item -ItemType Directory. Même mot sur bash.

# Créer un fichier vide
New-Item notes.md
# Équivalent bash : touch notes.md

# Copier un fichier (source, puis destination)
Copy-Item notes.md notes-backup.md
# Alias PowerShell : cp — même nom que sur bash.

# Déplacer OU renommer (c'est la même commande !)
Move-Item notes.md brouillons\notes.md      # déplacer dans un dossier
Move-Item notes-backup.md ancien-nom.md     # renommer sur place
# Alias PowerShell : mv — même nom que sur bash.
```

Retiens la logique universelle : **verbe, source, destination**. Déplacer et renommer sont la même opération, car pour le système un fichier n'est qu'un chemin : changer son dossier ou changer son nom, c'est juste changer son adresse.

Parlons de la suppression, avec un avertissement solennel : `Remove-Item` (alias `rm`, `del`) **ne passe pas par la corbeille**. C'est définitif. Sur bash, `rm` est célèbre pour avoir détruit des projets entiers. Ta règle de sécurité absolue : d'abord tester avec `-WhatIf`, l'option magique de PowerShell qui **simule sans rien faire** :

```powershell
# SIMULATION : affiche ce qui SERAIT supprimé, sans rien supprimer
Remove-Item ancien-nom.md -WhatIf
# Sortie : WhatIf : opération "Supprimer le fichier" sur la cible "...\ancien-nom.md"

# Seulement si la simulation montre exactement ce que tu veux :
Remove-Item ancien-nom.md
```

`-WhatIf` marche aussi sur `Move-Item` et `Copy-Item`. Bash n'a pas d'équivalent : sur un serveur, tu remplaceras ce réflexe par `ls` sur la cible avant tout `rm`. Et jamais, jamais de suppression avec un chemin que tu n'as pas vérifié avec `pwd` et `ls` d'abord.

Deuxième outil de survie : **Ctrl+C**. Dans un terminal, ce n'est pas « copier » : c'est **interrompre le programme en cours**. Quand `npm run dev --workspace apps/cours` occupe ton terminal sur le port 3007, le prompt ne revient pas — c'est normal, le serveur tourne. Pour l'arrêter proprement : `Ctrl+C`. C'est le geste que tu fais peut-être déjà sans savoir qu'il envoie un signal d'interruption au processus. (Pour copier du texte dans le terminal VS Code : sélection puis clic droit, ou `Ctrl+Shift+C`.)

Troisième confort : **l'historique**. Le shell mémorise tout ce que tu tapes. Flèche `↑` : commande précédente ; `↓` : suivante. Tape `history` pour lister la session. Encore mieux : `Ctrl+R` ouvre une recherche interactive — tape `workspace` et il retrouve ton dernier `npm run dev --workspace apps/cours`. Les devs ne retapent presque jamais une commande longue : ils la rappellent. Sur bash, `↑`, `history` et `Ctrl+R` fonctionnent exactement pareil — un des rares points où les deux mondes sont identiques.

## À retenir

- Créer : `mkdir` (dossier) et `New-Item` (fichier, `touch` sur bash) ; copier : `Copy-Item`/`cp` ; déplacer et renommer : `Move-Item`/`mv` — logique verbe → source → destination.
- `Remove-Item` supprime **sans corbeille** : toujours simuler d'abord avec `-WhatIf` (spécifique PowerShell ; sur Linux, vérifier avec `ls` avant `rm`).
- `Ctrl+C` n'est pas « copier » dans un terminal : c'est interrompre le programme en cours (mon serveur dev, par exemple).
- Flèche `↑` et `Ctrl+R` rappellent l'historique : on ne retape pas les commandes longues, on les retrouve.

## Mise en pratique

Objectif : créer une zone d'entraînement à côté de tes projets, manipuler des fichiers, et faire une suppression 100 % encadrée. On ne touche à AUCUN fichier de tes projets.

1. Ouvre un terminal et va dans tes documents : `cd "C:\Users\Velito Adventure\Documents"` (avec Tab !).
2. Crée un dossier d'entraînement : `mkdir terminal-lab`, puis entre dedans : `cd terminal-lab`. Vérifie avec `pwd`.
3. Crée un fichier : `New-Item journal.md`. Vérifie avec `ls` qu'il existe (taille 0).
4. Copie-le : `Copy-Item journal.md journal-copie.md`, puis `ls` : tu dois voir deux fichiers.
5. Crée un sous-dossier `archives` (`mkdir archives`) et déplace la copie dedans : `Move-Item journal-copie.md archives\`. Vérifie avec `ls archives`.
6. Renomme le fichier archivé : `Move-Item archives\journal-copie.md archives\journal-2026.md`. Vérifie avec `ls archives`.
7. Suppression encadrée : tape `Remove-Item archives\journal-2026.md -WhatIf` et lis la phrase de simulation. Puis, seulement si elle décrit bien ce fichier-là, relance la commande **sans** `-WhatIf`.
8. Rappelle ta toute première commande de la session avec la flèche `↑` (appuie plusieurs fois), puis essaie `Ctrl+R` et tape `move` pour retrouver un de tes `Move-Item`.
9. Bonus vie réelle : va dans `C:\Users\Velito Adventure\Documents\Velito-site`, lance `npm run dev --workspace apps/cours`, attends que le port 3007 réponde, puis arrête le serveur proprement avec `Ctrl+C`.

Résultat attendu : `terminal-lab` contient `journal.md` et un dossier `archives` vide ; tu as vu la phrase `WhatIf` avant ta suppression ; et tu as arrêté ton vrai serveur dev avec `Ctrl+C` en sachant ce que tu faisais. Tu peux garder `terminal-lab` : il resservira aux leçons suivantes.

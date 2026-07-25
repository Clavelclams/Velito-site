---
titre: "Git branches et remote : travailler en parallèle et synchroniser"
parcours: "terminal"
ordre: 9
niveau: "solide"
duree: 25
date: 2026-07-25
---

## Le cours

Ton album de commits (leçon 8) n'est pas obligé d'être une ligne droite. Une **branche**, c'est une ligne temporelle parallèle : tu pars de la photo actuelle et tu continues l'histoire de ton côté, sans toucher à la ligne principale (`main`). Analogie : `main` est le manuscrit officiel du livre ; créer une branche, c'est photocopier le manuscrit pour tester une fin alternative. Si elle est réussie, on l'intègre au manuscrit officiel (**merge**) ; sinon, on jette la photocopie — l'original n'a jamais été en danger. C'est LA raison d'être des branches : expérimenter sans risque.

```powershell
# Lister les branches (l'étoile marque celle où tu es)
git branch

# Créer une branche ET s'y déplacer (commande moderne)
git switch -c ajout-page-contact
# Version historique équivalente : git checkout -b ajout-page-contact

# Revenir sur main
git switch main

# Depuis main : intégrer les commits de la branche dans main
git merge ajout-page-contact
```

Important : `git switch` change les fichiers que tu vois sur ton disque — chaque branche montre sa propre version du projet. Rien n'est perdu : les autres versions attendent dans `.git`.

Le **conflit**, maintenant — le mot qui fait peur pour rien. Un conflit survient quand deux branches ont modifié **les mêmes lignes du même fichier** différemment : au merge, Git refuse de choisir à ta place et te demande d'arbitrer. Il écrit alors dans le fichier des marqueurs :

```
<<<<<<< HEAD
la version de ta branche actuelle
=======
la version de l'autre branche
>>>>>>> ajout-page-contact
```

Résoudre = ouvrir le fichier (VS Code affiche même des boutons « Accepter »), garder la bonne version (ou un mélange), supprimer les trois lignes de marqueurs, puis `git add` le fichier et `git commit`. C'est tout. Un conflit n'est pas une erreur : c'est Git qui te pose poliment une question.

Dernière pièce : le **remote** (dépôt distant). Ton `.git` local est complet et autonome, mais il n'existe que sur ta machine. Un remote — presque toujours nommé `origin`, hébergé sur GitHub — est un deuxième exemplaire de l'album, qui sert de sauvegarde et de point de rencontre en équipe :

```powershell
# Voir les remotes configurés et leurs URL
git remote -v

# Envoyer mes commits locaux vers GitHub (ma branche courante)
git push

# Rapatrier les commits que le remote a et que je n'ai pas
git pull
```

Image mentale : `commit` = coller la photo dans MON album ; `push` = poster les nouvelles pages à l'album partagé ; `pull` = récupérer les pages que les autres (ou moi depuis une autre machine) y ont ajoutées. D'où la règle : **commiter ne sauvegarde que localement** — tant que tu n'as pas push, un vol de PC emporte ton travail. Et le réflexe d'équipe : `pull` avant de commencer, `push` quand c'est propre. Toutes ces commandes sont identiques sur PowerShell et sur bash — y compris quand Vercel, à chaque `push` sur GitHub, récupère tes commits et redéploie ton site automatiquement.

## À retenir

- Une branche est une ligne temporelle parallèle : j'expérimente sans jamais mettre `main` en danger ; `merge` intègre le travail réussi.
- `git switch -c ma-branche` crée et bascule ; changer de branche change les fichiers visibles sur mon disque.
- Un conflit = deux branches ont modifié les mêmes lignes ; Git me demande d'arbitrer avec des marqueurs `<<<<<<<`, je choisis, je supprime les marqueurs, j'add et je commite.
- `commit` est local ; `push` envoie vers le remote (`origin`, GitHub) ; `pull` rapatrie ce qui m'y attend.
- Réflexe pro : `pull` avant de travailler, `push` quand c'est propre — le remote est ma sauvegarde et le point de rencontre de l'équipe.

## Mise en pratique

Objectif : provoquer volontairement un vrai conflit dans ton dépôt d'entraînement, et le résoudre calmement. Tout se passe dans `terminal-lab` : tes vrais projets ne sont pas touchés.

1. `cd "C:\Users\Velito Adventure\Documents\terminal-lab"` (le dépôt de la leçon 8, avec `recette.md` déjà commité). Vérifie que tout est propre : `git status`.
2. Mets un contenu de départ : ouvre `recette.md` (`code recette.md`), écris `Cuisson : 20 minutes`, enregistre, puis `git add recette.md` et `git commit -m "Temps de cuisson initial"`.
3. Crée une branche d'expérimentation : `git switch -c test-cuisson-douce`. Modifie la ligne en `Cuisson : 45 minutes a feu doux`, enregistre, puis `git add recette.md` et `git commit -m "Essai cuisson douce"`.
4. Reviens sur main : `git switch main`. Ouvre `recette.md` : la ligne est redevenue `Cuisson : 20 minutes` — tu viens de VOIR une branche changer le disque.
5. Crée le conflit : sur main, modifie la même ligne en `Cuisson : 10 minutes au micro-ondes`, enregistre, `git add recette.md`, `git commit -m "Essai cuisson rapide"`.
6. Tente la fusion : `git merge test-cuisson-douce`. Git annonce `CONFLICT (content)` : c'est prévu, respire.
7. Tape `git status` : il liste `recette.md` comme « both modified » et t'explique quoi faire. Ouvre le fichier : observe les marqueurs `<<<<<<<`, `=======`, `>>>>>>>` encadrant les deux versions.
8. Arbitre : garde la version de ton choix (ou écris `Cuisson : 30 minutes, compromis`), supprime les trois lignes de marqueurs, enregistre. Puis `git add recette.md` et `git commit -m "Fusion : choix du temps de cuisson"`.
9. Admire l'histoire complète : `git log --oneline --graph` — tu vois les deux lignes temporelles se séparer puis se rejoindre.
10. Observation réelle (lecture seule) : `cd "C:\Users\Velito Adventure\Documents\Velito-site"`, puis `git branch` (où es-tu ?) et `git remote -v` (l'URL GitHub de ton origin — celle que Vercel écoute).

Résultat attendu : un merge conflictuel résolu de bout en bout, un graphe qui montre la fourche et la fusion, et la certitude vécue qu'un conflit est une question posée par Git, pas une catastrophe.

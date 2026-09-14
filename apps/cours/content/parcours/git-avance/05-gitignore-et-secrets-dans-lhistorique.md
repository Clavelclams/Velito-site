---
titre: ".gitignore et les secrets : ce qui est entré dans Git y reste"
parcours: "git-avance"
ordre: 5
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Le 26 juillet, un audit de `mabb-site` a trouvé dans le dépôt : un `.env` de développement avec des identifiants, des dumps SQL de la base, des PV de réunion nominatifs. Le 9 septembre, un autre : un secret de dev qui signe les tickets SSO, commité dans `.env.dev`. Cette leçon explique pourquoi c'est grave, pourquoi « supprimer le fichier » ne règle rien, et comment ne plus y revenir.

**Pourquoi `git rm` ne supprime rien.** Reprends le modèle du graphe : chaque commit est un instantané complet. Si un fichier a été commité une fois, il existe dans cet instantané **pour toujours**. Le retirer de la version courante crée un nouvel instantané sans lui — l'ancien est intact. `git log --all -- chemin/du/fichier` le liste, `git show <hash>:chemin/du/fichier` l'affiche. Quiconque clone le dépôt a tout l'historique, donc le fichier.

**Donc la seule conclusion valide : un secret commité est un secret compromis.** Pas « à nettoyer » — **à changer**. Nouveau mot de passe de base, nouvelle clé API, nouveau secret de signature. Réécrire l'historique (`git filter-repo`, BFG Repo-Cleaner) est possible, mais ça ne remonte pas le temps : pendant les jours ou mois où le secret était là, il a pu être cloné, lu par un outil, indexé. Et sur un dépôt qui a été public — le tien l'était jusqu'au 9 septembre — c'est certain.

**Le mécanisme de prévention : `.gitignore`.** Un fichier texte à la racine (ou dans n'importe quel sous-dossier) listant des motifs de chemins que Git doit **ignorer** : ils n'apparaissent pas dans `git status`, `git add .` ne les prend pas. Le `.gitignore` d'un projet Symfony contient typiquement :

```
/.env.local
/.env.*.local
/var/
/vendor/
/node_modules/
*.sql
*.log
```

Deux subtilités qui piègent tout le monde :

1. **`.gitignore` n'agit que sur les fichiers pas encore suivis.** Si `dump.sql` a déjà été commité, l'ajouter au `.gitignore` ne change rien : Git continue de le suivre. Il faut d'abord `git rm --cached dump.sql` (retire du suivi sans supprimer du disque), commiter, et **seulement alors** le `.gitignore` prend effet.
2. **Un motif sans `/` devant s'applique partout.** `*.sql` ignore tous les `.sql` de tout le dépôt — y compris tes migrations si elles étaient en `.sql` brut (ce qui est le cas sur ARENA : `apps/arena/sql/*.sql`). Là, il faut être plus précis : `/backup*.sql`, `/var/backups/`.

**La structure Symfony pour les variables d'environnement**, à connaître par cœur :

- `.env` — **commité**. Valeurs par défaut de dev, et surtout la **liste** de ce qui doit exister. C'est de la documentation exécutable.
- `.env.local` — **jamais commité**. Les vraies valeurs, sur chaque machine et sur le serveur.
- `.env.dev`, `.env.test` — commités, valeurs spécifiques à un environnement, **sans secret**. C'est là que le secret SSO du 9 septembre n'aurait pas dû être.

Même logique côté Next.js : `.env.local` ignoré, et les vraies valeurs de prod dans Vercel.

**Détecter avant de commiter.** La vigilance ne tient pas dans le temps. Deux outils qui la remplacent :

- `gitleaks` (ou `git-secrets`) en **hook pre-commit** : scanne ce que tu t'apprêtes à commiter, refuse si un motif de clé, de token, d'URL de base avec mot de passe apparaît.
- Le même scan en intégration continue (GitHub Actions), pour attraper ce qui passe malgré tout.

Un hook se pose en une commande (`gitleaks` a une doc de trois lignes pour ça). C'est le même principe que les triggers Postgres sur ARENA : une règle qui dépend de ta discipline finit par lâcher, une règle dans un mécanisme non.

**Les données personnelles sont des secrets aussi.** Les PV nominatifs ne sont pas un secret technique, ce sont des données de personnes physiques. Le RGPD ne distingue pas une fuite par faille et une fuite par dépôt Git. Un dépôt est un lieu de stockage — qui se duplique à chaque clone.

## À retenir

- Un fichier commité reste dans l'historique pour toujours. `git rm` n'y change rien.
- Un secret commité est compromis : on le **change**, on ne le nettoie pas.
- `.gitignore` n'agit que sur les fichiers pas encore suivis → `git rm --cached` d'abord.
- Symfony : `.env` commité (liste + défauts), `.env.local` jamais (vraies valeurs).
- Un hook `gitleaks` remplace la vigilance par un mécanisme.

## Mise en pratique

Objectif : vérifier ce que ton dépôt contient vraiment dans son historique, et poser un `.gitignore` qui tient.

1. `cd "C:\Users\Velito Adventure\Documents\mabb-site"`. Lecture seule : `git log --all --oneline -- .env.dev` puis `git log --all --oneline -- "*.sql"`. Chaque ligne est un commit où ces fichiers existaient. S'il y en a, tu viens de constater qu'ils sont toujours dans l'historique.
2. `git show <hash>:.env.dev` avec un hash de l'étape 1 (si applicable) : le contenu est là. Note quel secret apparaît, et **change-le** sur le serveur si ce n'est pas déjà fait (c'est le point 8 des blocages du 09/09).
3. `type .gitignore` : lis chaque ligne. Vérifie qu'il y a `/.env.local` et un motif pour les dumps. Sinon, ajoute-les.
4. Test du piège : dans `terminal-lab`, crée `secret.txt` avec `mdp=1234`, commite-le. Ajoute `secret.txt` au `.gitignore`. `git status` : le fichier n'est **pas** ignoré (modifie-le pour le voir apparaître). `git rm --cached secret.txt`, commit. Maintenant `git status` l'ignore. Mais `git log --all -- secret.txt` le liste toujours.
5. Installe un scanner : `winget install gitleaks` (ou télécharge le binaire). Dans `mabb-site` : `gitleaks detect --source . --verbose`. Lis le rapport. Chaque ligne est un secret ou un faux positif à examiner.
6. Pose le hook : crée `.git\hooks\pre-commit` (sans extension) contenant `gitleaks protect --staged` et rends-le exécutable via Git Bash (`chmod +x .git/hooks/pre-commit`). Tente de commiter un fichier avec `AKIA1234567890ABCDEF` dedans : refusé.

Résultat attendu : tu sais lire l'historique d'un fichier, tu as un `.gitignore` correct, et un hook qui t'empêche de recommencer.

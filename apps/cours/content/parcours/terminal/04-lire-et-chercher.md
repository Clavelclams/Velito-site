---
titre: "Lire et chercher : cat, Select-String et code ."
parcours: "terminal"
ordre: 4
niveau: "debutant"
duree: 20
date: 2026-07-25
---

## Le cours

Tu sais te déplacer et manipuler des fichiers. Il te manque un sens : la **lecture**. Un dev passe plus de temps à lire (des configs, des logs, des erreurs) qu'à écrire. Le terminal excelle là-dedans, surtout pour chercher une aiguille dans les milliers de fichiers d'un projet.

Afficher un fichier sans l'ouvrir dans un éditeur :

```powershell
# Affiche le contenu d'un fichier dans le terminal
cat package.json
# cat est un alias PowerShell de Get-Content. Sur bash, cat est la vraie commande.
# Windows a aussi l'ancienne commande "type", même effet.

# Afficher seulement le début (utile pour les gros fichiers)
cat package.json -Head 20
# Équivalent bash : head -n 20 package.json
```

Pourquoi c'est utile alors que VS Code existe ? Parce que c'est instantané, que ça marche sur un serveur OVH sans interface graphique, et que ça se combine avec la recherche. Justement : la recherche. C'est LA compétence de cette leçon.

Windows a deux outils. L'ancien, `findstr`, vient de l'époque MS-DOS : `findstr "dev" package.json` affiche les lignes contenant « dev ». Il dépanne, mais le vrai outil PowerShell est **`Select-String`**, l'équivalent du célèbre `grep` de Linux :

```powershell
# Chercher un mot dans un fichier (affiche fichier:ligne:contenu)
Select-String "3007" package.json

# Chercher dans tous les fichiers .json du dossier
Select-String "workspace" *.json

# Chercher récursivement dans tout un dossier (le -Recurse de Get-ChildItem
# fournit les fichiers, le pipe | les envoie à Select-String)
Get-ChildItem -Recurse -Filter *.php | Select-String "make:entity"

# Équivalent bash sur tes serveurs : grep -rn "make:entity" .
```

Le symbole `|` s'appelle un **pipe** (tuyau) : il branche la sortie d'une commande sur l'entrée de la suivante, comme des Lego. Ici : « liste tous les fichiers .php, puis cherche dedans ». C'est la philosophie du terminal : des petits outils simples qu'on assemble. Retiens juste l'idée, on ne va pas plus loin aujourd'hui.

Cas d'usage réels chez toi : retrouver dans quel fichier le port `3007` est défini dans `Velito-site` ; vérifier dans `mabb-site` quels fichiers mentionnent une entité Doctrine avant de la modifier ; chercher `typecheck` dans le `package.json` de `Pirb store` pour voir ce que le script fait vraiment.

Dernier outil, le pont entre terminal et éditeur : **`code`**. VS Code s'installe avec sa propre commande :

```powershell
# Ouvrir le dossier courant dans VS Code (le fameux "code point")
code .

# Ouvrir un fichier précis
code apps\cours\package.json
```

`code .` utilise le `.` de la leçon 2 : « ouvre VS Code sur *ici* ». C'est le geste type d'un dev : naviguer au terminal jusqu'au projet, puis `code .` pour éditer. Le workflow complet devient : je cherche avec `Select-String`, je repère le fichier et la ligne, j'ouvre avec `code`, je corrige. Toutes ces commandes sont en lecture seule (sauf `code` qui ne fait qu'ouvrir une fenêtre) : tu peux les utiliser sans aucune peur, même sur un projet client.

## À retenir

- `cat` (alias de `Get-Content`) affiche un fichier dans le terminal ; indispensable sur un serveur sans interface graphique.
- `Select-String "motif" fichier` cherche du texte : c'est l'équivalent PowerShell du `grep` de mes serveurs Linux.
- Le pipe `|` branche la sortie d'une commande sur l'entrée d'une autre : des petits outils qu'on assemble.
- `code .` ouvre VS Code sur le dossier courant : le pont entre navigation terminal et édition.
- Toutes les commandes de lecture (`cat`, `ls`, `Select-String`, `pwd`) sont sans risque : elles ne modifient rien.

## Mise en pratique

Objectif : mener une vraie enquête en lecture seule dans tes trois projets. Zéro modification.

1. Va à la racine du monorepo : `cd "C:\Users\Velito Adventure\Documents\Velito-site"`.
2. Affiche le début du package.json racine : `cat package.json -Head 25`. Repère la section `"scripts"` et la config des workspaces.
3. Enquête n°1 — le port 3007 : tape `Select-String "3007" apps\cours\package.json`. Note le numéro de ligne affiché et ce que dit la ligne (probablement le script `dev`).
4. Enquête n°2 — les workspaces : tape `Select-String "workspace" package.json, turbo.json` et observe où la notion apparaît.
5. Passe au projet Symfony : `cd "C:\Users\Velito Adventure\Documents\mabb-site"`, puis cherche la config de la base de données : `Select-String "DATABASE_URL" .env`. Lis la ligne SANS la modifier (et souviens-toi : ce genre de valeur est un secret, on en reparle à la leçon 7).
6. Passe à l'app Expo : `cd "C:\Users\Velito Adventure\Documents\Pirb store"`, puis `Select-String "typecheck" package.json` pour découvrir la vraie commande que lance `npm run typecheck`.
7. Termine en ouvrant le projet dans l'éditeur depuis le terminal : `code .` — VS Code s'ouvre sur `Pirb store`.

Résultat attendu : tu as trouvé la ligne exacte qui définit le port 3007, la commande réelle derrière `npm run typecheck`, et tu as ouvert VS Code sans toucher à la souris. Trois enquêtes résolues, zéro fichier modifié.

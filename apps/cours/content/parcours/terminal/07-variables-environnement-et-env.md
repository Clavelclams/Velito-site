---
titre: "Variables d'environnement et .env : où vivent les secrets"
parcours: "terminal"
ordre: 7
niveau: "intermediaire"
duree: 20
date: 2026-07-25
---

## Le cours

Question restée en suspens depuis la leçon 1 : quand tu tapes `npm`, comment le shell sait-il *où* trouver ce programme sur ton disque ? Réponse : grâce à une **variable d'environnement** nommée `PATH`. Il est temps de comprendre ce mécanisme, car il explique aussi où doivent vivre tes mots de passe.

Une variable d'environnement, c'est une paire nom → valeur que le système fournit à chaque programme qu'il lance. Imagine un post-it collé sur le dos de chaque programme au démarrage : « au fait, l'utilisateur s'appelle Velito Adventure, le dossier temporaire est ici, et les programmes sont rangés là ». Le programme lit ces post-its quand il en a besoin.

```powershell
# Lire une variable d'environnement en PowerShell : préfixe $env:
echo $env:USERNAME
echo $env:PATH

# Équivalent bash sur tes serveurs Linux : $ tout court, nom en majuscules
# echo $USERNAME     /     echo $PATH

# Lister TOUTES les variables d'environnement actuelles
ls env:

# Créer une variable temporaire (vivra seulement dans CE terminal)
$env:MA_COULEUR = "bleu"
echo $env:MA_COULEUR
```

`PATH` contient une liste de dossiers, séparés par `;` sur Windows (`:` sur Linux). Quand tu tapes `npm`, le shell parcourt ces dossiers dans l'ordre jusqu'à trouver un programme nommé `npm`. L'erreur classique « terme non reconnu » après l'installation d'un outil signifie presque toujours : son dossier n'est pas dans le `PATH`.

Maintenant, le lien avec tes projets. Une application a besoin de valeurs qui **changent selon la machine** : l'URL de la base de données (locale chez toi, OVH en production), des clés d'API, le mode debug. Où les mettre ? Surtout pas en dur dans le code, pour deux raisons. Un : le même code doit tourner sur plusieurs environnements sans être modifié — seule la configuration change. Deux, la raison de sécurité : ton code part sur Git, donc chez GitHub, peut-être un jour en public ou chez un client. **Un secret écrit dans le code est un secret publié.** Des robots scannent GitHub en permanence pour voler les clés d'API commitées par erreur ; c'est une vraie question de jury et un vrai risque professionnel.

La solution standard : le fichier **`.env`**. Un simple fichier texte `NOM=valeur` à la racine du projet. Au démarrage, le framework (Symfony pour `mabb-site`, Expo pour `Pirb store`, Next pour `Velito-site`) lit ce fichier et charge son contenu comme variables d'environnement. Le code demande ensuite « donne-moi `DATABASE_URL` » sans jamais connaître la valeur. Chaque machine a son propre `.env` : le tien pointe sur ta base locale, celui du serveur OVH sur la base de production. Convention Symfony à connaître : `.env` contient les valeurs par défaut non sensibles (lui peut aller sur Git), et **`.env.local`** contient TES vraies valeurs et secrets — celui-là ne quitte jamais ta machine. On verra à la leçon 10 le mécanisme (`.gitignore`) qui garantit que Git ne l'embarque pas.

Règle d'hygiène professionnelle, à réciter au jury : les secrets vivent dans des variables d'environnement, jamais dans le code ; les fichiers qui les contiennent sont exclus du versionnement ; et un secret qui a fuité se **révoque** (on le change), on ne se contente pas de l'effacer.

## À retenir

- Une variable d'environnement est une paire nom → valeur fournie aux programmes ; en PowerShell on la lit avec `$env:NOM` (bash : `$NOM`).
- `PATH` liste les dossiers où le shell cherche les programmes : c'est pour ça que taper `npm` suffit.
- Les secrets (mots de passe, clés d'API, `DATABASE_URL`) ne vont **jamais** dans le code : code sur Git = secret publié.
- Le fichier `.env` charge la configuration par machine ; en Symfony, `.env.local` contient mes vraies valeurs et ne quitte jamais ma machine.
- Un secret qui a fuité ne s'efface pas : il se révoque (on le remplace).

## Mise en pratique

Objectif : voir le PATH à l'œuvre et cartographier la configuration de tes projets. Lecture seule sur les fichiers ; la seule écriture est une variable temporaire dans ton terminal.

1. Ouvre un terminal et affiche ton identité système : `echo $env:USERNAME`, puis `echo $env:USERPROFILE`.
2. Affiche le PATH lisiblement : `$env:Path -split ";"` (une ligne par dossier). Repère au moins le dossier de Node.js (souvent `C:\Program Files\nodejs\`) et celui de PHP ou Composer.
3. Preuve que le PATH sert à ça : tape `Get-Command npm` — PowerShell te montre le chemin complet du programme trouvé via le PATH. Fais pareil avec `Get-Command php` et `Get-Command git`.
4. Crée une variable temporaire : `$env:JURY = "avril 2027"` puis `echo $env:JURY`. Ferme ce terminal, ouvres-en un nouveau, retape `echo $env:JURY` : elle a disparu — tu viens de prouver qu'elle était liée à la session du terminal.
5. Va dans le projet Symfony : `cd "C:\Users\Velito Adventure\Documents\mabb-site"`, puis liste les fichiers d'environnement : `ls .env*`. Note lesquels existent (`.env`, `.env.local`, `.env.test`…).
6. Affiche uniquement les NOMS de variables du `.env` sans exposer les valeurs : `Select-String "^[A-Z_]+" .env` et observe la structure `NOM=valeur` (APP_ENV, DATABASE_URL…). Bonne habitude : même seul devant ton écran, tu traites les valeurs comme confidentielles.
7. Vérifie le même principe côté Expo : `cd "C:\Users\Velito Adventure\Documents\Pirb store"` puis `ls .env*` (il peut ne rien y avoir : Expo utilise alors d'autres mécanismes, c'est une info en soi).

Résultat attendu : `Get-Command npm` t'a montré le vrai chemin de npm (le PATH démystifié), ta variable `JURY` est morte avec son terminal, et tu sais dire quels fichiers `.env` existent dans mabb-site et pourquoi `.env.local` ne doit jamais partir sur Git.

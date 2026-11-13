---
titre: "Lire un log : mener l'enquête avant de corriger"
parcours: "dojo-debutant"
ordre: 12
niveau: "solide"
duree: 12
date: 2026-11-13
---

## Le cours

Le 13 novembre, sur Venaball, tu touches « Envoyer les convocations » d'une réunion. Écran d'erreur : **500**. Rien d'autre. Aucune explication.

```jeu
{ "type": "devine", "question": "L'écran dit juste « erreur 500 ». Où le serveur a-t-il écrit la vraie raison ?", "indice": "Pense à la feuille de marque : tout ce qui se passe dans le match y est noté.", "reponse": "Dans son log : un fichier texte où le serveur note ce qui lui arrive, ligne après ligne. L'écran cache le détail aux visiteurs, le log le garde pour toi." }
```

### Trois numéros, trois histoires

Imagine une porte du gymnase.

- **404** : la porte n'existe pas. Mauvaise adresse.
- **403** : la porte existe, mais tu n'as pas la clé. Pas le droit.
- **500** : la porte s'ouvre, et la personne derrière s'écroule. Le code a planté.

```jeu
{ "type": "paires", "consigne": "Associe chaque code à ce qu'il raconte.", "paires": [["404", "Rien à cette adresse"], ["403", "Tu n'as pas le droit d'entrer"], ["500", "Le code a planté en travaillant"]] }
```

Devant un 500, une seule règle : **on ne corrige pas au hasard**. On lit d'abord.

### Trouver le bon carnet

Un **log** (ou journal), c'est le carnet du serveur. Premier réflexe ce jour-là : ouvrir `var/log/prod.log`. Le fichier n'existe pas.

La raison est dans `config/packages/monolog.yaml` :

```yaml
type: rotating_file
path: "%kernel.logs_dir%/prod.log"
max_files: 7
```

`rotating_file` veut dire : un carnet neuf chaque jour, avec la date dans le nom. Le vrai fichier s'appelle `var/log/prod-2026-11-13.log`. Le serveur garde les 7 derniers.

```bash
ls -lt var/log | head -5
cat var/log/prod-2026-11-13.log
```

La première commande liste les fichiers, le plus récent en haut. La seconde affiche celui du jour.

```jeu
{ "type": "trous", "consigne": "Nous sommes le 13 novembre 2026. Complète le nom du log à ouvrir.", "code": "cat var/log/___", "choix": ["prod.log", "prod-2026-11-13.log", "error.log", "prod-13-11-2026.log"], "bonne": 1, "explication": "Un fichier par jour, daté année, mois, jour. prod.log tout court n'existe pas sur le serveur." }
```

### La ligne qui compte

Chaque ligne a un **niveau**, comme la gravité d'une faute : INFO (simple note), ERROR, CRITICAL (grave). Tu cherches CRITICAL. Ce jour-là :

« Uncaught PHP Exception ... Environment variable not found: EMAIL_EXPEDITEUR »

Traduction : le code voulait l'adresse d'expéditeur des e-mails, rangée dans une variable d'environnement (leçon 11). Sur l'instance Venaball, elle manquait. Rien à voir avec le bouton lui-même.

```jeu
{ "type": "choix", "question": "Le log dit « Environment variable not found: EMAIL_EXPEDITEUR ». Où est le problème ?", "choix": ["Dans le bouton de la page", "Dans la base de données", "Dans la configuration de ce serveur", "Dans le téléphone de la coach"], "bonne": 2, "explication": "Le code était le même sur MABB et sur Venaball. Seul le réglage du serveur Venaball n'avait pas cette variable." }
```

Le correctif tient en une ligne de `config/services.yaml` : si la variable manque, on prend l'adresse `MAILER_FROM`.

Dernier détail : en production, les lignes INFO ne s'écrivent **que si une erreur arrive dans la même requête**. Un log vide n'est donc pas une panne : c'est une journée sans erreur.

```jeu
{ "type": "ordre", "consigne": "Remets l'enquête du 500 dans l'ordre.", "etapes": ["L'écran affiche une erreur 500", "On liste les fichiers de var/log", "On ouvre le log daté du jour", "On repère la ligne CRITICAL", "On corrige la cause écrite dans cette ligne", "On réessaie le bouton"], "explication": "Lire avant de corriger. Sans le log, on aurait cherché dans le code du bouton, qui n'avait rien." }
```

```jeu
{ "type": "vraifaux", "affirmation": "Si le log du jour ne contient aucune ligne INFO, c'est que la journalisation est cassée.", "vrai": false, "explication": "En production, les lignes d'information sont gardées en mémoire et ne sont écrites que si une erreur survient dans la même requête." }
```

## À retenir

- Le **log** est le carnet du serveur : la vraie cause d'un 500 y est écrite.
- 404 = mauvaise adresse, 403 = pas le droit, 500 = le code a planté.
- En production, le fichier est `var/log/prod-AAAA-MM-JJ.log`, un par jour, 7 jours gardés.
- La ligne utile est de niveau **CRITICAL** et commence par « Uncaught PHP Exception ».
- On lit l'erreur en entier **avant** de toucher au code.
- Pas de ligne INFO ne veut pas dire panne : elles ne s'écrivent qu'avec une erreur.

## Mise en pratique

Connecte-toi en SSH VELITO, va dans `~/venaball-app`, puis lance (lecture seule, rien n'est modifié) :

```bash
ls -lt var/log | head -5
grep -c CRITICAL var/log/prod-2026-11-13.log
```

Remplace la date par celle du fichier le plus récent. La seconde commande compte les lignes CRITICAL.

C'est réussi quand tu peux dire : « le log du jour s'appelle ..., il contient ... erreur(s) critique(s) », et, s'il y en a une, lire à voix haute le message qui suit « Uncaught PHP Exception ».

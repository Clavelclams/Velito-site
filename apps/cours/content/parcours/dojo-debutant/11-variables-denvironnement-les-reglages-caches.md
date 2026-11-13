---
titre: "Variables d'environnement : les réglages cachés"
parcours: "dojo-debutant"
ordre: 11
niveau: "intermediaire"
duree: 12
date: 2026-11-13
---

## Le cours

Le 13 novembre, sur Venaball, un dirigeant touche « Envoyer les convocations ». Erreur 500. Sur MABB, le même bouton marche très bien.

```jeu
{ "type": "devine", "question": "Le code est identique sur les deux serveurs. Qu'est-ce qui peut bien être différent ?", "indice": "Deux gymnases, le même règlement, mais pas le même code d'alarme.", "reponse": "Les réglages. Chaque serveur garde son propre fichier de réglages, en dehors du code. Sur Venaball, il en manquait un." }
```

### Un réglage qui vit hors du code

Venaball tourne sur deux serveurs : SSH VELITO et SSH MABB. Même code, mais pas la même base de données ni la même adresse d'expéditeur.

Ces réglages s'appellent des **variables d'environnement** : un nom en majuscules, une valeur, rangés sur le serveur. Comme le code d'alarme : chaque gymnase a le sien, et il n'est pas imprimé dans le règlement.

Sur chaque serveur, ils sont dans un fichier `.env.local`.

```jeu
{ "type": "choix", "question": "Erreur 500 sur un bouton. Quel est le bon premier réflexe ?", "choix": ["Recharger la page jusqu'à ce que ça passe", "Lire le log du serveur", "Réécrire le service d'envoi"], "bonne": 1, "explication": "Un 500 dit seulement « le code a planté ». Le log, le journal où le serveur écrit ses erreurs, dit pourquoi." }
```

### Ce que disait le log

Une ligne : `EnvNotFoundException`. En clair : variable d'environnement introuvable. Le code demandait `EMAIL_EXPEDITEUR`. Elle existait sur MABB, pas sur Venaball.

### Le correctif : une remplaçante sur le banc

Dans `config/services.yaml` :

```yaml
# [13/11/2026] default: = valeur de repli si la variable n'existe pas sur l'instance.
$expediteurEmail: '%env(default:app.email_expediteur_defaut:EMAIL_EXPEDITEUR)%'
```

À lire de droite à gauche : « prends `EMAIL_EXPEDITEUR` ; si elle n'existe pas, prends le paramètre `app.email_expediteur_defaut` ». C'est une **valeur de repli**. La titulaire est absente, la remplaçante entre, le match continue.

```jeu
{ "type": "trous", "consigne": "Complète le mot qui annonce la valeur de repli.", "code": "'%env(___:app.email_expediteur_defaut:EMAIL_EXPEDITEUR)%'", "choix": ["default", "repli", "if", "optional"], "bonne": 0, "explication": "default: suivi du nom d'un paramètre. Si la variable manque, Symfony prend ce paramètre au lieu de planter." }
```

```jeu
{ "type": "ordre", "consigne": "Remets l'enquête du 13 novembre dans l'ordre.", "etapes": ["Le bouton répond 500 sur Venaball", "On lit le log du serveur", "On trouve EnvNotFoundException : une variable manque", "On ajoute une valeur de repli dans config/services.yaml", "On déploie et on reteste le bouton"], "explication": "Constater, chercher, trouver la cause, corriger, vérifier. Comme pour le 404 de la leçon 1." }
```

### Deux règles qui ne se discutent pas

`.env.local` contient aussi des **secrets** : mots de passe, clés. Il n'est jamais commité (il est dans `.gitignore`) et un assistant ne le lit jamais. Et on n'écrit jamais un secret dans le code.

```jeu
{ "type": "vraifaux", "affirmation": "Pour aller plus vite, on aurait pu écrire l'adresse de l'expéditeur directement dans le code PHP.", "vrai": false, "explication": "Le même code tourne sur deux serveurs qui n'ont pas la même adresse. Ce qui change d'un serveur à l'autre reste hors du code." }
```

```jeu
{ "type": "paires", "consigne": "Associe chaque mot à son rôle.", "paires": [[".env.local", "Les réglages d'un serveur, jamais commités"], ["Log", "Le journal où le serveur écrit ses erreurs"], ["Valeur de repli", "Ce qu'on prend si la variable manque"], ["Secret", "Mot de passe ou clé, jamais dans le code"]] }
```

## À retenir

- Même code, plusieurs serveurs : ce qui change est rangé dans des **variables d'environnement**.
- Une variable absente fait planter : `EnvNotFoundException`, erreur 500.
- Devant un 500, on lit le **log** avant de toucher au code.
- `default:` donne une **valeur de repli** quand la variable manque.
- `.env.local` n'est jamais commité, jamais lu par un assistant ; aucun secret dans le code.

## Mise en pratique

Ouvre un terminal dans `mabb-site` et lance :

```powershell
Select-String -Path config\services.yaml -Pattern "env\("
```

Tu vois des **noms** de variables, jamais leurs valeurs. Note trois noms. Repère les deux lignes qui contiennent `default:`.

C'est réussi quand tu peux dire, pour une de ces deux lignes : « si cette variable manque sur un serveur, voilà ce que Symfony prend à la place », sans avoir ouvert `.env.local`.

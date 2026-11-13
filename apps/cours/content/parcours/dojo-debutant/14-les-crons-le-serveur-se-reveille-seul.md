---
titre: "Les crons : le serveur se réveille tout seul"
parcours: "dojo-debutant"
ordre: 14
niveau: "solide"
duree: 12
date: 2026-11-13
---

## Le cours

16 h. Une coach reçoit sur son téléphone : « U13 B, 18 h : 3 absentes prévenues, 1 retard ». Personne n'a cliqué sur rien. Personne n'était devant le site.

```jeu
{ "type": "devine", "question": "Qui a envoyé ce message, si aucun humain n'a rien lancé ?", "indice": "Chez toi, qu'est-ce qui sonne tout seul à 7 h sans que tu y touches ?", "reponse": "Le serveur lui-même. On lui a réglé un réveil : toutes les heures, il lance une commande. Ce réveil s'appelle un cron." }
```

### Un cron = un réveil sur le serveur

Jusqu'ici, le code ne tournait que si quelqu'un demandait une page. Un **cron** (ou tâche planifiée) lance un programme à heure fixe, sans visiteur.

Dans Venaball, le réveil sonne toutes les heures et lance le fichier `bin/cron-resume-absences.php`. Ce petit fichier ne fait qu'une chose : démarrer la vraie commande.

```php
'%s %s app:seances:resume-absences --no-interaction --env=prod 2>&1',
```

Pourquoi ce fichier intermédiaire ? L'écran « Tâches planifiées » d'OVH accepte un script PHP, mais **ne permet pas de lui passer d'arguments**. On écrit donc la commande complète dans un fichier, et OVH lance ce fichier.

```jeu
{ "type": "choix", "question": "Pourquoi un fichier bin/cron-resume-absences.php au lieu de régler directement la commande dans OVH ?", "choix": ["Parce que c'est plus rapide", "Parce que l'écran d'OVH ne passe pas d'arguments à un script", "Parce que la commande est secrète", "Parce que PHP l'exige"], "bonne": 1, "explication": "Le nom de la commande et ses options sont des arguments. Comme OVH ne les transmet pas, le petit fichier les contient." }
```

### Que fait la commande ?

Dans `src/Command/ResumeAbsencesCommand.php`, elle cherche les séances qui commencent **dans 2 à 3 heures** :

```php
->andWhere('s.date >= :debut')->setParameter('debut', $maintenant->modify('+2 hours'))
->andWhere('s.date < :fin')->setParameter('fin', $maintenant->modify('+3 hours'))
```

La fenêtre dure 1 heure, le réveil sonne chaque heure : chaque séance y passe une fois. Si une joueuse ou un parent a prévenu d'une absence ou d'un retard, les coachs reçoivent **un seul** résumé. Que des nombres, jamais un prénom.

```jeu
{ "type": "vraifaux", "affirmation": "Le coach reçoit une notification à chaque fois qu'une joueuse prévient de son absence.", "vrai": false, "explication": "Décision prise : un seul résumé, environ 2 heures avant la séance. Le coach sait qui manque avant de partir au gymnase, sans être dérangé dix fois." }
```

### Jamais deux fois

Avant d'envoyer, la commande note « séance déjà résumée » dans le cache (une mémoire temporaire du serveur). **Avant**, pas après. Si l'envoi échoue, tant pis : mieux vaut un résumé perdu que deux résumés identiques.

```jeu
{ "type": "ordre", "consigne": "Remets le travail de la commande dans l'ordre.", "etapes": ["Le cron sonne, la commande démarre", "Elle cherche les séances dans 2 à 3 heures", "Elle compte les absences et retards prévenus", "Elle note la séance comme déjà résumée", "Elle envoie le résumé aux coachs"], "explication": "Le marquage vient avant l'envoi : c'est ce qui garantit un seul résumé par séance." }
```

### Lire une fréquence

Un réglage de cron s'écrit en cinq cases : minute, heure, jour du mois, mois, jour de la semaine. Une étoile veut dire « tous ».

`21 3 * * *` : minute 21, heure 3, tous les jours. Donc chaque nuit à 3 h 21. C'est le réglage réel de la sauvegarde de la base sur SSH VELITO (bin/sauvegarde-bdd.sh) : tout le monde dort.

```jeu
{ "type": "trous", "consigne": "Complète pour que la tâche se lance tous les jours à 4 h 00.", "code": "0 ___ * * *", "choix": ["0", "4", "*", "40"], "bonne": 1, "explication": "Première case : la minute (0). Deuxième case : l'heure (4). Les étoiles : tous les jours, tous les mois." }
```

### Tester sans rien envoyer

Comme à la leçon 13, la commande a son tour à blanc :

```bash
php bin/console app:seances:resume-absences --dry-run
```

Elle liste les résumés, n'envoie rien, ne marque rien.

```jeu
{ "type": "paires", "consigne": "Associe chaque élément à son rôle.", "paires": [["Le cron", "Le réveil qui sonne à heure fixe"], ["bin/cron-resume-absences.php", "Le fichier que le réveil lance"], ["app:seances:resume-absences", "La commande qui fait le travail"], ["--dry-run", "Le tour à blanc, sans envoi"]] }
```

## À retenir

- Un **cron** lance un programme à heure fixe, sans visiteur.
- Sur OVH, il lance un petit fichier PHP qui contient la commande complète.
- Cinq cases : minute, heure, jour du mois, mois, jour de la semaine ; `*` = tous.
- Une tâche automatique doit se protéger des doublons : ici, marquage **avant** l'envoi.
- On teste à la main avec `--dry-run` avant de faire confiance au réveil.

## Mise en pratique

Dans `mabb-site`, ouvre le dossier `bin/` et liste les fichiers qui commencent par `cron-`. Ouvre-en deux et lis le commentaire du haut : il dit quelle commande est lancée et à quelle fréquence.

C'est réussi quand tu as rempli, pour ces deux fichiers, la phrase : « tous les ..., le serveur lance la commande ..., qui sert à ... ».

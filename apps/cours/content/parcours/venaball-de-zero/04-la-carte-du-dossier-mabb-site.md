---
titre: "La carte du dossier mabb-site : chaque tiroir et ce qu'il contient"
parcours: "venaball-de-zero"
ordre: 4
niveau: "debutant"
duree: 30
date: 2026-10-04
---

## Le cours

Quand tu ouvres `mabb-site` dans VS Code, tu vois une trentaine de dossiers et de fichiers à la racine. C'est intimidant. Mais c'est comme le local du club : une fois qu'on sait que les ballons sont dans la cage, les maillots dans l'armoire et les licences dans le classeur de la secrétaire, on ne se perd plus. Cette leçon est la carte du local. Tous les chiffres viennent d'un comptage fait le 04/10/2026 sur ton dossier.

Un mot d'abord : un **fichier**, c'est un document (comme une feuille), un **dossier**, c'est un tiroir qui contient des feuilles ou d'autres tiroirs. Symfony impose où ranger chaque sorte de fichier : c'est le "règlement de rangement" du framework.

### Vue d'ensemble

```
mabb-site/
├── bin/            les outils en ligne de commande (console, crons)
├── config/         le règlement : routes, sécurité, base, services
├── migrations/     l'historique des changements de la base (91 fichiers)
├── public/         la seule partie visible depuis Internet
├── src/            le code PHP de Venaball (361 fichiers)
├── templates/      les modèles de pages Twig (199 fichiers)
├── tests/          les tests automatiques (23 fichiers de test)
├── instruction/    la documentation du projet
├── assets/         le JavaScript et le CSS
├── vendor/         les bibliothèques des autres (ne jamais modifier)
├── var/            le cache et les journaux (fabriqués tout seuls)
├── composer.json   la liste des bibliothèques dont le projet a besoin
├── importmap.php   la liste des bibliothèques JavaScript
└── deploy.ps1      un ancien script de déploiement
```

### `src/` : le cœur, tiroir par tiroir

`src/` contient 361 fichiers PHP. C'est ton code à toi. Voici chaque sous-dossier, avec le nombre de fichiers PHP et un exemple réel.

- **`Entity/` (68 fichiers) : les fiches.** Une **entité**, c'est une classe PHP qui décrit une sorte de chose stockée en base : une équipe, une joueuse, une rencontre. Chaque entité correspond à une table. C'est la fiche cartonnée du classeur : elle dit quelles cases existent (nom, catégorie, saison). Quatre sous-tiroirs :
  - `Core/` (11) : ce qui concerne la plateforme. Exemple : `User.php` (un compte), `Club.php`, `UserClubRole.php` (le rôle d'une personne dans un club).
  - `Sport/` (51) : tout le basket. Exemple : `Equipe.php`, `Joueur.php`, `Rencontre.php`, `Convocation.php`, `ActionMatch.php` (une action saisie en Stats Live).
  - `Pirb/` (2) : l'espace joueuse. `Follow.php` (suivre une joueuse), `SeancePlayground.php` (une séance de tir ou de dribble).
  - `Vitrine/` (4) : le site public. `Article.php`, `Media.php`, `PageContenu.php`, `BlocContenu.php`.
  Le doc maître annonce 67 entités : le 68e fichier est `Core/ClubAwareInterface.php`, une interface, pas une entité.
- **`Repository/` (67) : les bénévoles qui cherchent dans le classeur.** Un repository par entité, ou presque. Exemple : `Repository/Sport/EquipeRepository.php`, utilisé en leçon 3 pour trouver les équipes d'un club.
- **`Controller/` (109) : les coachs qui donnent les consignes.** Un contrôleur reçoit une requête et renvoie une réponse. Rangés par espace : `Manager/` (47), `Api/` (28, dont `Api/Club/` pour l'app staff), `Pirb/` (16), `Admin/` (9), `Vitrine/` (7), plus deux à la racine (`SaisonController.php`, `ParentInvitationController.php`). Exemple : `Manager/EquipeController.php`. Quelques fichiers sont des classes d'aide, pas des contrôleurs (par exemple `Api/Club/ApiClubException.php`) : le doc maître compte 105 vrais contrôleurs.
- **`Service/` (55) : les spécialistes.** Un **service**, c'est une classe qui fait un travail précis et réutilisable, appelée par plusieurs contrôleurs. C'est le kiné ou le préparateur physique : on l'appelle quand on a besoin de sa compétence. Exemple : `SaisonService.php` (quelle est la saison active), `MarqueResolver.php` (quel nom afficher selon l'adresse), `ConvocationPdfGenerator.php`. Des sous-tiroirs regroupent les thèmes : `Ffbb/`, `Stats/`, `Otm/`, `Secretariat/`, `Rgpd/`... Leçon 9.
- **`Security/` (5) : le règlement des accès.** `Voter/ClubVoter.php` (qui a le droit de faire quoi dans un club), `Tenant/TenantResolver.php` (quel est le club actif), `ApiTokenHandler.php` (vérifier le jeton des apps). Leçon 11.
- **`Form/` (9) : les formulaires papier.** Une classe de formulaire décrit les champs à remplir et leurs règles. Exemple : `Form/Manager/EquipeType.php` (le formulaire "Nouvelle équipe").
- **`Command/` (26) : les tâches lancées à la main ou par un cron.** Une **commande**, c'est un programme qu'on lance dans un terminal, sans navigateur. Exemple : `DemoClubCommand.php`, qui commence ainsi :

```php
#[AsCommand(
    name: 'app:demo:club',
    description: 'Crée un club de démonstration complet (2 équipes, 10 joueuses, créneaux, 2 rencontres) sans données réelles.',
)]
```

  Ligne 1 : l'attribut qui transforme la classe en commande. Ligne 2 : son nom, qu'on tape après `php bin/console`. Ligne 3 : la description affichée dans la liste des commandes.
- **`EventListener/` (5) : les arbitres qui surveillent.** Un **écouteur d'événement** se déclenche tout seul à un moment précis (à chaque requête, à chaque connexion). Exemple : `SaisonQueryListener.php` mémorise la saison choisie dès qu'une adresse contient `?saison=`. `LoginLogListener.php` note chaque connexion.
- **`Twig/` (7) : les petits outils ajoutés aux modèles de pages.** Exemple : `SaisonExtension.php` ajoute à Twig la fonction `saison_active()`.
- **`Gamification/` (4) : les badges et les niveaux.** `BadgeCatalog.php`, `BadgeChecker.php`, `NiveauCatalog.php`, `XpCalculator.php`.
- **`DataFixtures/` (4) : les fausses données de démonstration.** Des **fixtures**, ce sont des données inventées qu'on charge dans une base de test. Exemple : `SportFixtures.php`.
- **`Feed/` (1) : `FeedItem.php`**, la forme d'un élément du fil "Pour toi" du tableau de bord.
- **`Kernel.php`** : le noyau vu en leçon 3.

### Les autres tiroirs de la racine

- **`templates/` (199 fichiers Twig) : les modèles de pages.** Rangés comme les contrôleurs : `manager/`, `pirb/`, `vitrine/`, `admin/`, `emails/`. Exemple : `manager/equipe/index.html.twig`. C'est la mise en page de la feuille de match : la forme, pas les données.
- **`migrations/` (91 fichiers) : le registre des travaux.** Une **migration**, c'est un petit fichier qui dit "ajoute telle colonne à telle table" et comment l'annuler. Rangées par date dans leur nom : la dernière est `Version20261002120000.php` (02/10/2026). Leçon 7.
- **`config/` : le règlement intérieur.** Pas de code métier, des réglages. `routes.yaml` et `routes/` (quelle adresse va où), `packages/security.yaml` (connexion, pare-feu, droits), `packages/doctrine.yaml` (connexion à la base), `services.yaml`. Attention : `config/credentials/` contient des clés secrètes, on ne l'ouvre jamais.
- **`public/` : la vitrine du local, la seule porte ouverte sur la rue.** `index.php` (l'entrée unique), `.htaccess` (les consignes pour Apache), `playground/` (les cinq fichiers des jeux tir et dribble chargés par l'app), `uploads/` (les fichiers déposés : photos, PDF). Tout le reste du dossier est invisible depuis Internet, c'est voulu.
- **`assets/` : le JavaScript et le CSS** de l'interface, par exemple `styles/app.css` et `controllers/` (de petits scripts Stimulus).
- **`importmap.php` : la liste des bibliothèques JavaScript.** Il déclare par exemple `@hotwired/stimulus` en version 3.2.2 et `@hotwired/turbo` en 7.3.0. Ça évite d'avoir un outil de compilation JavaScript lourd.
- **`composer.json` : la liste de courses PHP.** Composer est l'outil qui télécharge les bibliothèques. Ce fichier dit lesquelles et en quelle version (Symfony 7.4, Doctrine, dompdf pour les PDF, phpspreadsheet pour Excel, google/cloud-vision pour lire les PDF FFBB). `composer.lock` fige les versions exactes.
- **`vendor/` : les bibliothèques téléchargées.** Le code des autres. On n'y touche jamais.
- **`bin/` : les outils de terminal.** `console` (le point d'entrée de toutes les commandes `php bin/console ...`), `phpunit` (les tests), et les scripts de cron `cron-otm-cloturer.php`, `cron-otm-rappel.php`, `cron-ffbb-ocr.php`, plus `sauvegarde-bdd.sh`.
- **`tests/` : les contrôles automatiques.** `Unit/` (on teste une classe seule, par exemple `Unit/Security/Voter/ClubVoterTest.php`) et `Functional/` (on simule une vraie requête, par exemple `Functional/Pirb/PirbShotChartIdorTest.php`). 23 fichiers de test. Leçon 16.
- **`var/` : le cache et les journaux**, fabriqués par Symfony. On peut le vider sans risque.
- **`instruction/` : la documentation du projet** (43 éléments dont les sous-dossiers `archive/`, `CDC/`, `bg/`). Le plus important : `00_ECOSYSTEME.md`, le document maître. Aussi `08_ADR.md` (les décisions d'architecture) et `arborescence.md`.
- **Plus petits :** `shemas/dictionnaire_db.md` (le dictionnaire de la base), `puml/` (un diagramme), `scripts/` (un script SQL ponctuel), `translations/` (vide), `.github/workflows/` (une automatisation GitHub pour lire les PDF de tirs FFBB), `compose.yaml` (configuration Docker générée par Symfony, usage non vérifié), `phpunit.dist.xml` (réglages des tests).

### `deploy.ps1` : à manier avec méfiance

`deploy.ps1` est un script PowerShell qui fait tout d'un coup : il lance `git add -A`, commit, pousse, puis se connecte au serveur MABB et lance `git pull`, l'installation des bibliothèques et les migrations. Problème : le doc maître (§2.6) dit l'inverse aujourd'hui. Sur le serveur, on fait `git fetch` puis `git reset --hard origin/main`, **jamais** `git pull`, et on ne fait jamais `git add` en aveugle sur ce dépôt. Ce script date de juin et n'a pas suivi. Ne l'utilise pas tel quel ; c'est une bonne question à te poser avant le jury : le garder corrigé, ou le supprimer.

### Les fichiers parasites à la racine

Soyons honnêtes : la racine contient des fichiers qui n'ont rien à y faire.

- `_check.png`, `_pg2_check.png`, `_pg3_check.png` : des captures de vérification d'un PDF, suivies par git.
- `Feuille_de_route_Venaball_2026-07-13.pdf` : un document de travail, suivi par git.
- `backup_.sql` et `backup_avant_sprint_b1-b20_.sql` : deux fichiers vides (0 octet), suivis par git alors que `.gitignore` exclut les `.sql` de la racine. Ils ont dû être ajoutés avant la règle.
- `tir_ffbb_complet.sql`, `tir_ffbb_cheminots.sql`, `tir_ffbb_tergnier.sql` : des exports SQL de tirs FFBB. Ils sont bien ignorés par git, mais traînent sur ton PC.
- `instructions/` (avec un s) à côté de `instruction/` : deux PDF de cahier des charges dans un second dossier au nom presque identique.
- Les fichiers `.env`, `.env.local`, `.env.dev`... contiennent les réglages et des secrets de chaque environnement. Ils ne sont pas parasites, mais on ne les ouvre pas et on ne les partage jamais.

Ce rangement est un vrai sujet de jury : un dépôt propre montre que tu maîtrises ce que tu livres.

### Ce que tu dis au jury

"Mon dépôt suit l'organisation standard de Symfony, ce qui permet à n'importe quel développeur Symfony de s'y retrouver. Le code métier est dans `src/`, rangé par responsabilité : les entités décrivent les données, les repositories les cherchent, les contrôleurs reçoivent les requêtes, les services portent la logique réutilisable, et `Security/` porte les règles d'accès. À l'intérieur, je range encore par espace ou par domaine, par exemple `Entity/Core`, `Sport`, `Pirb` et `Vitrine`. Seul `public/` est exposé sur Internet. Je sais aussi ce qui n'est pas propre : quelques fichiers de travail à la racine et un ancien script `deploy.ps1` qui ne suit plus ma procédure de déploiement."

## À retenir

- `src/` est ton code (361 fichiers PHP), rangé par responsabilité : Entity, Repository, Controller, Service, Security...
- Les entités sont rangées par domaine : `Core` (plateforme), `Sport` (basket), `Pirb` (joueuse), `Vitrine` (site public).
- `config/` règle, `templates/` met en page, `migrations/` garde l'historique de la base, `public/` est la seule porte vers Internet.
- `vendor/` et `var/` sont fabriqués automatiquement : on n'y écrit jamais.
- La racine contient des fichiers parasites et un `deploy.ps1` qui contredit la procédure actuelle : il faut savoir le dire.

## Mise en pratique

1. Ouvre `mabb-site` dans VS Code. Sans regarder la leçon, écris sur une feuille le rôle de chaque dossier de la racine que tu vois. Puis corrige avec la leçon.
2. Dans `src/`, ouvre un fichier réel dans chacun de ces tiroirs : `Entity/Sport/Equipe.php`, `Repository/Sport/EquipeRepository.php`, `Controller/Manager/EquipeController.php`, `Service/SaisonService.php`, `Security/Voter/ClubVoter.php`. Pour chacun, lis seulement le commentaire du haut et dis à voix haute, en une phrase, ce qu'il fait.
3. Ouvre `deploy.ps1` et `instruction/00_ECOSYSTEME.md` (§2.6). Note les deux différences principales entre les deux procédures de déploiement.
4. Fais la liste des fichiers parasites de la racine et, pour chacun, décide (sur papier) : supprimer, déplacer, ou garder. Ne supprime rien maintenant : c'est une décision à prendre à tête reposée, et un commit à faire toi-même.

C'est réussi quand tu peux faire le tour du dossier `mabb-site` à voix haute en trois minutes, en donnant pour chaque tiroir son rôle et un fichier réel qu'il contient.

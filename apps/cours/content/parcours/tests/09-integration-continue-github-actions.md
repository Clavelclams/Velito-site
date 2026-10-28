---
titre: "Intégration continue : l'arbitre qui rejoue tes tests à chaque push"
parcours: "tests"
ordre: 9
niveau: "intermediaire"
duree: 30
date: 2026-10-04
---

## Le cours

Tu as 153 méthodes de test dans `mabb-site/tests/` (unitaires dans `tests/Unit/`, fonctionnels dans `tests/Functional/`). C'est un vrai capital. Mais pose-toi une question honnête : quand as-tu lancé `php bin/phpunit` pour la dernière fois avant de déployer ? Un test qu'on oublie de lancer ne protège rien. L'intégration continue sert exactement à ça : ne plus dépendre de ta mémoire.

### C'est quoi, l'intégration continue

L'**intégration continue** (en anglais *Continuous Integration*, abrégé **CI**) est une machine qui, à chaque fois que tu pousses du code sur GitHub, récupère ce code sur un ordinateur neuf, installe tout, et lance tous les tests. Elle affiche ensuite un verdict : vert (tout passe) ou rouge (au moins un test échoue).

Pense à un match de basket. Tu peux jurer que ton tir était bon, c'est l'arbitre qui décide, et il regarde chaque action sans se fatiguer. La CI, c'est l'arbitre : il rejoue toute la suite à chaque push, avant que le code parte en production, et il ne fait pas d'exception parce que tu es pressé un vendredi soir.

Le mot « continue » veut dire : à chaque petit changement, pas une fois par mois. Plus le test tourne tôt après l'erreur, plus elle est facile à retrouver, parce que tu sais encore ce que tu viens de toucher.

### Ce qui existe dans tes projets aujourd'hui

Constat vérifié dans le dépôt :

- `mabb-site` n'a **aucune CI de tests**. Son seul fichier dans `.github/workflows/` est `parse-positions-ffbb.yml`, une tâche planifiée (chaque lundi à 5 h UTC) qui lit les PDF de positions de tirs FFBB par OCR (reconnaissance de texte dans une image). Elle n'exécute aucun test.
- `Velito-site` (le monorepo Next.js, celui-là même qui héberge ce site de cours) n'a **pas de dossier `.github/` du tout**. Vercel construit le site à chaque push, mais construire n'est pas tester : un build qui réussit prouve que le code compile, pas qu'il calcule juste.

Tu ne l'as donc pas encore fait dans tes projets. Voici ce que c'est et comment l'essayer.

### Le vocabulaire de GitHub Actions

**GitHub Actions** est le service de CI intégré à GitHub. Tu n'installes rien : tu ajoutes un fichier YAML dans `.github/workflows/` et GitHub le lit. Cinq mots à connaître :

- **Workflow** : un fichier YAML, donc un scénario complet. `parse-positions-ffbb.yml` en est un. Ton futur `ci.yml` en sera un autre.
- **Déclencheur** (`on:`) : l'événement qui lance le workflow. `on: push` = à chaque push. `on: pull_request` = à chaque demande de fusion. `on: schedule` = à heure fixe, comme un cron (c'est ce qu'utilise ton workflow FFBB, avec `workflow_dispatch` en plus pour le lancer à la main).
- **Job** : un bloc de travail qui tourne sur une machine. Un workflow peut avoir plusieurs jobs en parallèle (par exemple « tests PHP » et « tests JS »).
- **Step** (étape) : une commande ou une action dans un job, exécutée dans l'ordre. Si une étape échoue, les suivantes ne tournent pas et le job est rouge.
- **Runner** : la machine qui exécute le job. `runs-on: ubuntu-latest` demande une machine Linux neuve, fournie par GitHub, détruite à la fin. Neuve à chaque fois : c'est ce qui rend le verdict fiable, il n'y a pas de « ça marche sur mon PC ».

Une étape peut faire `run:` (une commande shell) ou `uses:` (une **action** toute faite, publiée par quelqu'un d'autre, par exemple `actions/checkout@v4` qui récupère ton code).

### Ce que tes tests attendent pour tourner

Avant d'écrire le fichier, il faut savoir ce que la suite exige. J'ai lu la configuration sans ouvrir les fichiers `.env*` :

- `phpunit.dist.xml` force `APP_ENV=test` et fait échouer la suite sur la moindre dépréciation, notice ou warning (`failOnDeprecation`, `failOnNotice`, `failOnWarning`). Une CI y sera aussi stricte que toi.
- `tests/bootstrap.php` charge `.env` avec `Dotenv::bootEnv()`. Le fichier `.env` est bien suivi par Git, donc la CI l'aura.
- En revanche, `.env.test` est **ignoré par Git** (ligne `/.env.test` du `.gitignore`). La CI ne l'aura pas. Il faudra donc donner les variables de test directement dans le workflow. Bonne nouvelle : avec `bootEnv()`, une vraie variable d'environnement passe toujours avant les fichiers `.env`.
- `config/packages/doctrine.yaml`, bloc `when@test`, ajoute le suffixe `_test` au nom de la base (`dbname_suffix: '_test...'`). Si `DATABASE_URL` pointe vers `app`, la base réellement utilisée sera `app_test`.

**Les tests fonctionnels ont-ils besoin d'une base ? Oui.** `PirbSeancesIdorTest` et `PirbIdorTestCase` ouvrent une transaction sur la connexion Doctrine dans `setUp()` et l'annulent dans `tearDown()` : sans base, ils plantent. Le commentaire de `PirbSeancesIdorTest.php` donne même les prérequis : `doctrine:database:create` puis `doctrine:schema:create` en environnement test. Les tests de `tests/Unit/`, eux, n'ont besoin de rien.

Pourquoi pas SQLite (une base contenue dans un simple fichier, sans serveur) ? Ce serait plus léger, mais ta production tourne sur MySQL 8.4 et MariaDB 10.4, et tes migrations sont écrites à la main en syntaxe MySQL. Tester sur un autre moteur, c'est risquer un vert en CI et un rouge en prod. On prend donc un **service** MySQL : un conteneur MySQL que GitHub démarre à côté du runner, le temps du job.

### Le fichier `ci.yml` proposé pour mabb-site

C'est une proposition à relire avec toi, pas un fichier que j'ai testé : je n'ai pas lancé la suite dans GitHub.

```yaml
# .github/workflows/ci.yml
name: Tests

on:
  push:
    branches: [main]          # à chaque push sur main
  pull_request:                # et à chaque demande de fusion

jobs:
  phpunit:
    runs-on: ubuntu-latest     # machine Linux neuve, jetée après

    services:
      mysql:
        image: mysql:8.4       # même moteur que l'instance Venaball
        env:
          MYSQL_ALLOW_EMPTY_PASSWORD: "yes"   # conteneur jetable, aucune donnée réelle
          MYSQL_DATABASE: app_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping -h 127.0.0.1"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    env:                        # remplace le .env.test absent du dépôt
      APP_ENV: test
      KERNEL_CLASS: 'App\Kernel'
      APP_SECRET: ci-valeur-jetable
      DATABASE_URL: "mysql://root@127.0.0.1:3306/app?serverVersion=8.4&charset=utf8mb4"

    steps:
      - uses: actions/checkout@v4            # récupère le code

      - uses: shivammathur/setup-php@v2      # installe PHP
        with:
          php-version: '8.3'
          extensions: ctype, iconv, pdo_mysql, mbstring
          coverage: none

      - name: Dépendances
        run: composer install --no-interaction --no-progress --prefer-dist

      - name: Base de test
        run: |
          php bin/console doctrine:database:create --env=test --if-not-exists
          php bin/console doctrine:schema:create --env=test

      - name: PHPUnit
        run: php bin/phpunit --testdox
```

Lecture ligne par ligne des passages importants :

- `services: mysql:` démarre MySQL à côté. Les `options` de santé (`--health-cmd`) font attendre GitHub jusqu'à ce que MySQL réponde, sinon la première commande Doctrine arriverait trop tôt.
- `MYSQL_ALLOW_EMPTY_PASSWORD` : pas de mot de passe, parce que ce conteneur ne vit que quelques minutes, ne contient que des données de test, et n'est joignable que depuis le runner. Tes vrais secrets n'ont rien à faire ici. Ton workflow FFBB montre la bonne façon pour ceux qui en ont besoin : `${{ secrets.NOM }}`, des valeurs stockées dans les réglages du dépôt, jamais dans le fichier.
- `KERNEL_CLASS` : `WebTestCase` a besoin de savoir quelle classe démarre Symfony. Habituellement cette ligne est dans `.env.test` ; comme il n'est pas dans Git, on la met ici.
- `shivammathur/setup-php@v2` : l'action la plus utilisée pour installer une version précise de PHP avec ses extensions. `pdo_mysql` est indispensable pour parler à MySQL.
- `composer install` (avec les dépendances de dev cette fois, puisque PHPUnit en fait partie). Il lit `composer.lock`, donc exactement les versions de ta prod.
- `doctrine:schema:create` construit les tables à partir des entités, comme l'indique le commentaire de ton test IDOR. Plus tard, tu pourras le remplacer par `doctrine:migrations:migrate --env=test` pour vérifier aussi que tes migrations passent.
- `php bin/phpunit --testdox` : si un seul test échoue, la commande renvoie un code d'erreur, l'étape devient rouge, le job aussi.

Il est probable que le premier passage soit rouge pour une raison d'environnement (une extension manquante, une variable oubliée). C'est normal : tu ouvres l'onglet **Actions** du dépôt, tu cliques sur le job, tu lis le journal de l'étape rouge, tu corriges.

### Le badge et la règle du rouge

Une fois le workflow en place, chaque commit sur GitHub porte une petite coche verte ou une croix rouge. Tu peux aussi afficher un **badge** dans le `README.md` : une image dont l'adresse se termine par `/actions/workflows/ci.yml/badge.svg`, qui affiche « passing » en vert ou « failing » en rouge. Ton dépôt étant privé depuis le 06/09, seules les personnes qui y ont accès le verront.

La règle qui donne tout son sens à la CI : **on ne déploie pas sur rouge.** Si la croix est rouge, tu ne lances pas les commandes SSH. Sur un dépôt payant, GitHub peut bloquer techniquement une fusion tant que la CI n'est pas verte (protection de branche) ; en dépôt privé gratuit cette option n'est en général pas disponible, à vérifier dans tes réglages. Chez toi, la règle sera donc une discipline : regarder la coche avant de taper `git reset --hard origin/main` sur le serveur.

Côté coût : les dépôts privés ont un quota mensuel gratuit de minutes Actions. Une suite de 153 tests avec MySQL prend quelques minutes ; tu es très loin de la limite.

### Et Velito-site

Le même principe s'applique au monorepo : un job Node qui fait `npm ci` puis lance les tests Vitest (ceux d'ARENA vus en leçon 2). La commande exacte dépend de ce que `turbo.json` déclare comme tâche `test`, à vérifier avant d'écrire le workflow. C'est un deuxième chantier ; commence par mabb-site, ton projet de jury.

## À retenir

- La CI rejoue tous les tests sur une machine neuve à chaque push : un verdict vert ou rouge qui ne dépend pas de ta mémoire.
- GitHub Actions : un **workflow** (fichier YAML) déclenché par `on:`, composé de **jobs** qui tournent sur un **runner**, chacun fait de **steps**.
- Ni mabb-site ni Velito-site n'ont de CI de tests aujourd'hui ; le seul workflow de mabb-site est la tâche planifiée OCR FFBB.
- Les tests fonctionnels de mabb-site ont besoin d'une vraie base : un service MySQL dans le job, pas SQLite, pour tester sur le moteur de la prod.
- `.env.test` n'est pas dans Git : les variables de test (`APP_ENV`, `KERNEL_CLASS`, `DATABASE_URL`) se donnent dans le workflow, jamais un vrai secret en clair.
- On ne déploie pas sur rouge.

## Mise en pratique

Objectif : faire tourner tes 153 tests dans GitHub Actions et obtenir une première coche verte sur mabb-site (environ 45 minutes).

1. En local, `cd "C:\Users\Velito Adventure\Documents\mabb-site"` puis `php bin/phpunit --testdox`. Note combien passent. Si ta base de test locale n'existe pas, les tests fonctionnels échouent : c'est la preuve qu'ils ont besoin d'une base.
2. Crée `.github/workflows/ci.yml` avec le contenu de la leçon. Relis chaque ligne et écris en commentaire, avec tes mots, ce qu'elle fait.
3. Commit ce seul fichier (`git add .github/workflows/ci.yml`, pas `git add -A`) et pousse.
4. Sur GitHub, onglet **Actions** : regarde le job démarrer. S'il est rouge, ouvre l'étape en échec, lis le message en entier, corrige (extension PHP, variable manquante), repousse.
5. Fais exprès de casser un test unitaire (change une valeur attendue dans `tests/Unit/Entity/Core/UserTest.php`), pousse-la sur une branche à part et ouvre une pull request (le workflow se déclenche sur `pull_request`, pas sur les push d'autres branches que `main`). Constate la croix rouge sur la pull request, puis ferme-la sans fusionner.
6. Ajoute le badge en haut du `README.md` du dépôt.

C'est réussi quand le dernier commit de `main` porte une coche verte, que tu as vu une croix rouge provoquée volontairement, et que tu sais expliquer à voix haute à quoi sert chacune des cinq notions : workflow, déclencheur, job, step, runner.

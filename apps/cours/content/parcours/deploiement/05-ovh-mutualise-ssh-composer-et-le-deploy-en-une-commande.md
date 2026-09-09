---
titre: "OVH mutualisé : SSH, Composer, et ce que fait vraiment deploy.ps1"
parcours: "deploiement"
ordre: 5
niveau: "intermediaire"
duree: 25
date: 2026-09-09
---

## Le cours

`.\deploy.ps1 "message"` et c'est en ligne. Cette leçon ouvre le script pour que tu saches ce qu'il fait — et donc quoi faire à la main quand il ne marche pas.

**L'hébergement mutualisé.** Une machine OVH partagée entre des centaines de clients. Tu as un dossier (`www/`), un accès SSH et SFTP, PHP en mode FPM, Apache, une base MySQL/MariaDB sur un serveur séparé, et un cron. Tu n'as **pas** : root, le choix de la version d'Apache, l'installation de paquets système, un processus qui tourne en permanence à toi (pas de `node server.js` persistant). C'est suffisant pour Symfony, et c'est pourquoi Venaball y est.

Deux instances, deux clusters : MABB sur `cluster102` (MariaDB 10.4), Venaball sur `cluster100` (MySQL 8.4). Même code, deux moteurs de base légèrement différents — d'où la convention « syntaxe commune » dans les migrations.

**SSH : un terminal sur le serveur.** `ssh <login>@<cluster>.hosting.ovh.net`. Tu es dans ton dossier, avec `bash`, `git`, `php`, `composer`. Tout ce que tu fais ici se fait **sur le serveur**, en direct, en production. Pas de filet.

**Ce que fait `deploy.ps1`, étape par étape.**

1. `git rev-parse --abbrev-ref HEAD` ≠ `main` → refus. On ne déploie que `main`.
2. `git status --short` : ce qui va partir.
3. `git add -A` + `git commit` + `git push origin main`. Note : `add -A` prend **tout**, y compris ce que tu n'avais pas l'intention de commiter. La convention du 9 septembre dit « jamais `git add .` sur mabb-site » — le script le fait pourtant. Contradiction à résoudre : soit le script passe à `git add -p` (interactif), soit tu commites à la main avant de lancer le script sans message.
4. SSH, une seule connexion, et sur le serveur :
   - `git pull` : le serveur récupère ce que tu viens de pousser. Si un fichier a été modifié à la main sur le serveur, le pull échoue (conflit) — c'est le risque du serveur mutable.
   - `composer install --no-dev --optimize-autoloader` (si le script le fait ; sinon à faire quand `composer.lock` a changé) : installe les dépendances PHP **sans** les outils de dev (PHPUnit…), avec un autoloader optimisé.
   - `php bin/console cache:clear --env=prod` : vide et reconstruit le cache Symfony. **Obligatoire** après tout changement de config, template, route, ou `.env.local`. Sans lui, l'ancien code compilé reste.
   - `php bin/console doctrine:migrations:migrate --no-interaction` : applique les migrations non encore passées. `--no-interaction` répond « oui » à la question de confirmation — attention, une migration destructive passe sans demander.
   - `php bin/console asset-map:compile` : compile les assets (CSS, JS) pour AssetMapper dans `public/assets/`.

Si une étape échoue, `$ErrorActionPreference = "Stop"` arrête le script : pas de déploiement à moitié. C'est la propriété la plus importante du script.

**Ce que le script ne fait pas.** Il ne sauvegarde pas la base avant une migration (le cron nocturne le fait, mais pas juste avant). Il ne vérifie pas que les tests passent. Il ne déploie que sur **une** instance — il faut le lancer deux fois (ou le paramétrer) pour MABB et Venaball. Il ne fait pas de rollback : si le déploiement casse, tu reviens en arrière à la main (`git reset --hard <commit-précédent>` sur le serveur + `cache:clear`).

**Composer, en deux mots.** `composer.json` liste les dépendances et leurs contraintes de version ; `composer.lock` fige les versions exactes installées. `composer install` lit le **lock** et installe précisément ça — reproductible. `composer update` recalcule le lock (à ne faire qu'en local, en connaissance de cause). Sur le serveur, toujours `install`, jamais `update`. Le `--no-dev` retire PHPUnit et les outils de dev : moins de code en prod, moins de surface.

**Le cron OVH.** Manager → Hébergement → Tâches planifiées. Une commande à une heure donnée. C'est là que tourne `bin/sauvegarde-bdd.sh` à 4 h — et c'est là que devrait être déclaré `app:sorties:purger-rgpd`, qui ne l'est pas (blocage ouvert depuis juillet). Un cron OVH n'est **pas versionné** : il vit dans le manager, et personne ne sait qu'il existe en lisant le dépôt. Documente-le dans `instruction/`.

**Le déploiement à la main, quand le script échoue.**

```bash
ssh <login>@<cluster>.hosting.ovh.net
cd www
git status                      # propre ? sinon : git stash ou git checkout .
git pull
composer install --no-dev --optimize-autoloader
php bin/console cache:clear --env=prod
php bin/console doctrine:migrations:status   # regarde AVANT d'appliquer
php bin/console doctrine:migrations:migrate --no-interaction
php bin/console asset-map:compile
```

Sache le faire sans le script. C'est ce que tu feras le jour où le script ne marche plus.

## À retenir

- Mutualisé = dossier + SSH + PHP-FPM + Apache + base séparée + cron. Pas de root, pas de processus persistant.
- `deploy.ps1` : vérifie `main`, commit, push, puis SSH : pull, composer install, cache:clear, migrate, asset-map:compile. S'arrête à la première erreur.
- `cache:clear` après tout changement. `composer install` (jamais `update`) sur le serveur.
- Le script ne sauvegarde pas avant migration, ne teste pas, ne rollback pas, ne déploie qu'une instance.
- Le cron OVH n'est pas versionné : documente-le.

## Mise en pratique

Objectif : déployer à la main une fois, corriger le `git add -A`, et documenter le cron.

1. Fais un changement d'une ligne dans un template Venaball. Commit et push **à la main** (pas le script), avec `git add <fichier>` précis.
2. SSH sur l'instance MABB. Déroule les sept commandes du déploiement à la main, une par une, en lisant chaque sortie. À `doctrine:migrations:status`, note le nombre de migrations disponibles vs exécutées. Vérifie le changement en ligne.
3. Refais sur l'instance Venaball. Même résultat ? Les deux instances sont-elles au même commit (`git log -1` sur chacune) ?
4. Corrige `deploy.ps1` : remplace `git add -A` par un `git status --short` suivi d'une question `Read-Host "Commiter tout ce qui est listé ? (o/n)"` — ou retire complètement l'étape commit et exige que le commit soit fait avant. Commit `chore(deploy): plus de git add -A`.
5. Ajoute au script une **sauvegarde avant migration** : sur le serveur, avant `migrations:migrate`, lance `bash bin/sauvegarde-bdd.sh`. Si la sauvegarde échoue, le script s'arrête avant la migration.
6. Documente le cron : crée `instruction/45_CRON_OVH.md` listant chaque tâche planifiée des deux instances (commande, heure, ce qu'elle fait, depuis quand). Vérifie dans le manager si `app:sorties:purger-rgpd` y est. Si non, ajoute-la (hebdomadaire, dimanche 5 h) et documente.

Résultat attendu : tu as déployé sans le script, le script ne fait plus `add -A` et sauvegarde avant de migrer, et tes crons sont documentés.

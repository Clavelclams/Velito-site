---
titre: "Déployer sans casser : l'ordre, les migrations et le retour arrière"
parcours: "deploiement"
ordre: 9
niveau: "intermediaire"
duree: 35
date: 2026-10-04
---

## Le cours

La leçon 5 t'a montré ce que fait `deploy.ps1`. Celle-ci pose la question suivante : dans quel ordre faut-il faire les choses pour que, le jour où ça casse, tu puisses revenir en arrière en cinq minutes ? Un déploiement réussi ne se juge pas quand tout va bien. Il se juge le soir où une migration plante à moitié.

### Relire `deploy.ps1` avec des yeux de pompier

Le script vit à la racine de `mabb-site`. Côté PC, il vérifie que tu es sur `main`, affiche `git status --short`, puis enchaîne :

```powershell
git add -A
git commit -m $Message
git push origin main
```

`git add -A` ajoute **tout** ce qui a changé dans le dossier, y compris un fichier de test oublié, un export CSV de licenciées, un dump. Le script ne te demande pas de confirmer. Or `instruction/00_ECOSYSTEME.md` §2.6 dit en toutes lettres : « Jamais `git add .` sur ce dépôt (données de mineures dans l'historique) ». Le script fait exactement ce que la règle interdit. Un fichier poussé par erreur reste dans l'historique Git même si tu le supprimes ensuite : c'est pour ça que l'ajout doit être un geste conscient, fichier par fichier.

Ensuite le script ouvre une connexion SSH vers le serveur MABB (et seulement celui-là : le serveur Venaball n'est pas couvert) et lance une chaîne de commandes reliées par `&&`, qui veut dire « continue seulement si la précédente a réussi ». Après un bloc qui gère un ancien conflit sur le fichier `.env`, voici l'ordre :

1. `git pull`
2. `composer install --no-dev --optimize-autoloader`
3. `cache:clear --env=prod --no-warmup`
4. `doctrine:migrations:migrate --no-interaction --env=prod --allow-no-migration`
5. `asset-map:compile`

Trois problèmes dans cet ordre :

- **Le cache est vidé avant les migrations.** Entre l'étape 3 et la fin de l'étape 4, le nouveau code est actif mais la base a encore l'ancien schéma. Une page qui lit une colonne pas encore créée plante. Et si la migration échoue, le site tourne avec du code qui attend un schéma qui n'existe pas. (Détail : `composer install` déclenche lui-même un `cache:clear` via les `auto-scripts` de `composer.json`, donc le nouveau code est même actif dès l'étape 2.)
- **Aucune sauvegarde juste avant de migrer.** Le cron fait un dump chaque nuit, mais si tu déploies à 18 h, tout ce qui a été saisi depuis 4 h du matin n'est dans aucun dump.
- **Aucun retour arrière prévu.** Le script ne note même pas sur quel commit tournait le serveur avant.

Enfin, le commentaire d'en-tête du script dit qu'il fait « git pull + cache:clear + asset-map:compile ». Il fait plus que ça : la documentation d'un script peut mentir, seul le code fait foi.

### Deux procédures qui se contredisent

Ton projet a une deuxième procédure, écrite dans `mabb-site/CLAUDE.md` §3 et dans `00_ECOSYSTEME.md` §2.6 :

```bash
git fetch origin
git reset --hard origin/main
php bin/console doctrine:migrations:migrate --no-interaction --env=prod
rm -rf var/cache/prod
php bin/console cache:clear --env=prod
```

Elle contredit `deploy.ps1` sur deux points :

- **`git pull` contre `git fetch` + `git reset --hard`.** La doc explique pourquoi : « jamais `git pull` : `reference.php` est modifié en local ». Un `git pull` refuse d'avancer si un fichier suivi par Git a été modifié sur le serveur. `git fetch` télécharge les commits sans rien toucher, puis `git reset --hard origin/main` aligne de force les fichiers suivis sur GitHub. Les fichiers non suivis (`.env.local`, `public/uploads/`, `var/`) ne sont pas touchés. Le serveur devient une copie exacte de `main`, sans discussion.
- **L'ordre.** Ici la migration passe **avant** le cache. C'est le bon sens.

Mais cette procédure officielle a son propre trou : elle n'a **pas de `composer install`**. Le jour où tu ajoutes une dépendance (par exemple `symfony/rate-limiter`, leçon 11 du parcours sécurité), le code arrivera sans sa bibliothèque et le cache plantera. Aucune des deux procédures n'a non plus de sauvegarde avant migration. Deux procédures pour une même opération, c'est une de trop : il faut en garder une seule, juste, et aligner le script dessus.

### L'ordre sûr, et pourquoi

Pense à une rencontre à domicile. Tu ne changes pas le parquet pendant le match : tu photographies l'état de la salle, tu fais les travaux, tu vérifies, et seulement ensuite tu ouvres les portes. Pour un déploiement :

1. **Sauvegarde** de la base. C'est ton point de retour pour les données.
2. **Code** : `git fetch` + `git reset --hard origin/main`, en notant d'abord le commit actuel. C'est ton point de retour pour le code.
3. **Dépendances** : `composer install`, parce que le code a besoin de ses bibliothèques avant tout le reste.
4. **Migrations** : la base rejoint le nouveau code.
5. **Cache** : on reconstruit une fois que code et base sont alignés.
6. **Vérification** : quelqu'un regarde que ça marche avant de dire « fini ».

### Les migrations : la seule étape qui touche aux données

Une **migration** est une classe PHP du dossier `migrations/` qui modifie le schéma de la base. Elle a deux méthodes : `up()` (appliquer) et `down()` (défaire). Exemple réel, `Version20261002120000.php` :

```php
public function up(Schema $schema): void
{
    $this->addSql("CREATE TABLE fbi_licencie (...)");
    $this->addSql("ALTER TABLE joueur ADD licence_qualifiee_le DATE DEFAULT NULL ...");
}

public function down(Schema $schema): void
{
    $this->addSql('DROP TABLE fbi_licencie');
    $this->addSql('ALTER TABLE joueur DROP licence_qualifiee_le');
}
```

`up()` crée une table et ajoute une colonne. `down()` fait l'inverse, dans l'ordre. C'est ce qu'on appelle une **migration réversible** : on peut revenir à la version précédente avec `php bin/console doctrine:migrations:migrate prev --env=prod`.

Attention à ce que « réversible » veut dire : `down()` rétablit le **schéma**, pas les **données**. Si des licences ont été importées dans `fbi_licencie` entre-temps, `DROP TABLE` les efface. Seul le dump fait avant la migration les retrouve. C'est pour ça que la sauvegarde passe en premier, même avec un `down()` parfait.

Autre piège propre à MySQL et MariaDB : une instruction de structure (`CREATE`, `ALTER`, `DROP`) est validée immédiatement, sans transaction possible. Si une migration a trois `addSql` et que le deuxième plante, le premier est déjà appliqué. La base est à moitié migrée. C'est la raison de la règle de ton `CLAUDE.md` : une migration petite, avec un `down()` écrit.

Et regarde avant d'appliquer : `doctrine:migrations:status` te dit combien de migrations attendent. Si tu en attendais une et qu'il en annonce quatre, tu t'arrêtes.

### Le retour arrière

Le **retour arrière** (en anglais *rollback*) consiste à remettre le site dans l'état d'avant le déploiement. Il a deux moitiés :

- **Le code** : `git reset --hard <commit-précédent>` sur le serveur, puis `rm -rf var/cache/prod` et `cache:clear`. C'est rapide, à condition d'avoir noté le commit avant (`git rev-parse HEAD`).
- **Les données** : soit `migrations:migrate <version-précédente>` si le `down()` suffit et qu'aucune donnée importante n'a été écrite, soit la restauration du dump de l'étape 1 (leçon 7). Restaurer un dump efface tout ce qui a été saisi depuis : c'est le dernier recours.

Un retour arrière qu'on n'a jamais répété est une hypothèse, exactement comme une sauvegarde jamais restaurée.

### Le mode maintenance

Pendant les migrations, un utilisateur peut tomber sur une page à moitié cassée. Le **mode maintenance** affiche à la place une page fixe « Le site revient dans quelques minutes ». Sur Apache, la méthode classique est une règle dans `public/.htaccess` qui sert `maintenance.html` si ce fichier existe : tu le crées au début, tu le supprimes à la fin. Ton projet n'en a pas aujourd'hui (je n'ai trouvé aucune règle de ce type). Pour des migrations de quelques secondes, c'est acceptable ; pour une grosse migration un samedi de match, prévois-le.

### Vérifier après : le test de fumée

Le **test de fumée** (*smoke test*) vient de l'électronique : on branche l'appareil, on regarde s'il fume. En déploiement, ce sont trois vérifications de deux minutes : la page de connexion répond, une page connectée s'affiche, le journal `var/log/prod.log` n'a pas de nouvelle erreur. Ton script se contente d'écrire « fais Ctrl+F5 » : c'est un début, pas une vérification.

### Une proposition d'ordre corrigé

Ce qui suit est une **proposition à valider par toi**, pas un fichier à copier tel quel. Les chemins et le nom du dossier sont à adapter sur chaque serveur, et rien n'a été testé en production.

```bash
# --- Sur ton PC, avant tout ---
# php bin/phpunit            -> vert, sinon on s'arrête (et la CI aussi, si tu l'as)
# git add <fichiers précis>  -> jamais add -A
# git commit, git push       -> puis vérifier la coche verte sur GitHub

# --- Sur le serveur MABB, puis sur le serveur Venaball ---
cd <dossier du projet>
git rev-parse HEAD > var/deploy-precedent.txt   # point de retour du code
bash bin/sauvegarde-bdd.sh                       # point de retour des données ; s'il échoue, STOP
git fetch origin
git reset --hard origin/main
php composer.phar install --no-dev --optimize-autoloader --no-interaction
php bin/console doctrine:migrations:status --env=prod   # lire avant d'appliquer
php bin/console doctrine:migrations:migrate --no-interaction --env=prod
rm -rf var/cache/prod
php bin/console cache:clear --env=prod
php bin/console asset-map:compile --env=prod     # si des assets ont changé
tail -n 20 var/log/prod.log                      # test de fumée côté serveur
# puis dans le navigateur : page de connexion, une page connectée

# --- En cas de casse ---
# git reset --hard $(cat var/deploy-precedent.txt)
# rm -rf var/cache/prod ; php bin/console cache:clear --env=prod
# puis, si les données sont touchées : down() ou restauration du dump
```

Le script `bin/sauvegarde-bdd.sh` nomme ses fichiers avec la date, l'heure et la minute, donc un dump avant déploiement n'écrase pas celui de la nuit. Il faudra quand même vérifier qu'il tourne bien lancé à la main, depuis le bon dossier.

## À retenir

- `deploy.ps1` fait `git add -A` sans confirmation, vide le cache avant de migrer, ne sauvegarde pas et ne prévoit pas de retour arrière.
- La procédure de `CLAUDE.md` §3 et `00_ECOSYSTEME.md` §2.6 (fetch + reset --hard, migration avant cache) contredit le script, et oublie `composer install`. Il faut une seule procédure.
- Ordre sûr : sauvegarde, code, dépendances, migrations, cache, vérification.
- Un `down()` rétablit le schéma, pas les données. MySQL valide les changements de structure un par un : une migration ratée peut rester à moitié appliquée.
- Retour arrière = commit précédent noté + dump ou `down()`. On le répète avant d'en avoir besoin.

## Mise en pratique

Objectif : écrire ta procédure unique de déploiement et répéter un retour arrière, sans toucher à la production (environ 50 minutes).

1. Ouvre `deploy.ps1` et `00_ECOSYSTEME.md` §2.6 côte à côte. Dresse un tableau à trois colonnes : étape, ce que fait le script, ce que dit la doc. Surligne chaque différence.
2. Choisis la dernière migration de `migrations/`. Lis son `down()` : défait-il bien tout ce que fait `up()`, dans l'ordre inverse ? Quelles données seraient perdues en le lançant ?
3. En local, sur ta base de développement : `php bin/console doctrine:migrations:migrate prev`, vérifie que la table ou la colonne a disparu, puis `php bin/console doctrine:migrations:migrate` pour la remettre.
4. En local toujours, avec un `git status` vide (sinon `reset --hard` effacerait ton travail en cours) : note `git rev-parse HEAD`, fais un commit bidon, puis reviens au commit noté avec `git reset --hard <commit>`. Tu viens de répéter la moitié « code » d'un retour arrière.
5. Rédige ta procédure unique, dans l'ordre sûr, en partant de la proposition de la leçon. Ne modifie pas `deploy.ps1` tout de suite : montre d'abord ta procédure pour validation.

C'est réussi quand tu as un tableau des différences, que tu as fait un `migrate prev` puis un retour au commit précédent en local, et que tu peux réciter l'ordre sûr en expliquant pourquoi la sauvegarde passe avant tout.

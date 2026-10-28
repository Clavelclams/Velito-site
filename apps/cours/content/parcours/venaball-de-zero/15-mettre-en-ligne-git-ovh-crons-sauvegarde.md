---
titre: "Mettre en ligne : Git, OVH, crons et sauvegarde"
parcours: "venaball-de-zero"
ordre: 15
niveau: "debutant"
duree: 45
date: 2026-10-04
---

## Le cours

Jusqu'ici, tu as vu comment Venaball fonctionne sur ton PC. Mais une coach à Amiens n'ouvre pas ton PC : elle ouvre `club.venaball.fr`. Cette leçon raconte le trajet du code entre ton ordinateur et le serveur, puis ce qui tourne tout seul la nuit, et enfin ce qui protège les données du club si tout brûle.

### Git : l'historique du classeur

**Git** est un logiciel qui garde l'historique de tous tes fichiers. Imagine le classeur des feuilles de match du club : à chaque match, on ajoute une feuille datée, on ne jette jamais l'ancienne. Git fait pareil avec ton code.

Un **commit** est une photo datée de tes fichiers, avec une phrase qui explique ce qui a changé. Par exemple `test(pirb): tests fonctionnels IDOR (séances + stats/match)` est un vrai commit de mabb-site du 07/07/2026. Si un jour tout casse, tu peux revenir à une photo précédente.

**GitHub** est un site qui garde une copie de ton classeur en ligne : le coffre du club. On y **pousse** (`git push`) les commits depuis ton PC, et le serveur vient les **récupérer**.

Pourquoi le dépôt doit être **privé** ? Parce que Git garde TOUT, y compris ce que tu as supprimé. Si un jour un mot de passe ou un fichier de joueuses a été commité, il reste dans l'historique même après suppression. Le document `instruction/00_ECOSYSTEME.md` (§2.6) le dit sans détour : « données de mineures dans l'historique, dépôt privé depuis le 06/09 ». Le dépôt a donc été public avant. C'est une leçon que tu dois savoir raconter (voir leçon 17).

### OVH et SSH : le gymnase loué et la télécommande

**OVH** est l'hébergeur : la société qui loue l'ordinateur allumé jour et nuit sur lequel tourne Venaball. Tu as un hébergement **mutualisé**, c'est-à-dire que tu partages la machine avec d'autres clients, comme un créneau dans un gymnase municipal : tu as ta salle, mais pas les clés de la chaufferie. Tu ne peux pas installer n'importe quel logiciel.

Il y a deux serveurs : **le serveur MABB** (l'instance historique, hébergement qui ferme le 22/10/2026) et **le serveur Venaball** (l'instance multi-club).

**SSH** est la télécommande du serveur : un programme qui ouvre, depuis ton PC, une fenêtre de commandes qui s'exécutent *sur* le serveur. Tout ce que tu tapes dans cette fenêtre se passe chez OVH, pas chez toi.

### `deploy.ps1` lu ligne à ligne

À la racine de mabb-site, il y a `deploy.ps1`, un script PowerShell qui fait le déploiement en une commande. Côté PC, il vérifie que tu es sur la branche `main`, fait `git add -A`, `git commit`, `git push origin main`. Puis il se connecte en SSH et envoie ce bloc au serveur (extrait réel, l'adresse du serveur est retirée) :

```bash
git pull && \
echo '=== COMPOSER INSTALL ===' && \
( [ -f composer.phar ] || ( echo 'Telechargement composer.phar...' && curl -sS https://getcomposer.org/installer | php ) ) && \
php composer.phar install --no-dev --optimize-autoloader --no-interaction --ignore-platform-req=ext-redis && \
php bin/console cache:clear --env=prod --no-warmup && \
echo '=== MIGRATIONS DOCTRINE ===' && \
php bin/console doctrine:migrations:migrate --no-interaction --env=prod --allow-no-migration && \
php bin/console asset-map:compile && \
echo 'OK deploiement OVH termine'
```

Ligne par ligne :

- `git pull` : le serveur récupère les nouveaux commits depuis GitHub.
- `&& \` : « si la ligne d'avant a marché, continue ». Si une étape échoue, tout s'arrête.
- La ligne avec `composer.phar` : si l'outil **Composer** n'est pas là, on le télécharge. Composer est le gestionnaire des bibliothèques PHP (Symfony, Doctrine...). La liste est dans `composer.json`.
- `composer install --no-dev` : installe exactement les versions notées dans `composer.lock`, sans les outils de développement (PHPUnit, par exemple). `--optimize-autoloader` accélère le chargement des classes.
- `cache:clear --env=prod` : vide le cache, c'est-à-dire les fichiers que Symfony prépare à l'avance pour aller plus vite.
- `doctrine:migrations:migrate` : applique les migrations (leçon 7), donc modifie la structure de la base.
- `asset-map:compile` : prépare les fichiers CSS et JavaScript publics.

### Les trois défauts de ce script

Sois franc avec toi-même, le jury le sera.

1. **Le cache est vidé avant les migrations.** Pendant quelques secondes, le nouveau code tourne sur une base pas encore modifiée. Si le code attend une colonne qui n'existe pas encore, le site renvoie une erreur 500. L'audit `instruction/44_AUDIT_GLOBAL_2026-09-21.md` (§1.8) le note : « `cache:clear` avant `migrate` dans `deploy.ps1` ».
2. **Aucune sauvegarde avant migration.** Une migration peut supprimer une colonne. Si elle est fausse, la donnée est perdue et rien ne permet de revenir en arrière.
3. **Pas de retour arrière.** Si le déploiement casse le site, il n'y a pas de commande prévue pour revenir à la version d'avant.

Un quatrième point, plus subtil : le commentaire en haut du script annonce « git pull + cache:clear + asset-map:compile », alors que le script fait aussi Composer et les migrations. Et `00_ECOSYSTEME.md` (§2.6) décrit une autre séquence officielle : `git fetch origin` puis `git reset --hard origin/main` (« jamais `git pull` »), migrations, `rm -rf var/cache/prod`, `cache:clear`. Autrement dit, la procédure réelle a évolué et le script est en retard sur elle. Au jury, dis-le : « j'ai deux procédures, je dois n'en garder qu'une ».

### Les variables d'environnement : les secrets restent sur le serveur

Une **variable d'environnement** est un réglage donné à l'application de l'extérieur, au lieu d'être écrit dans le code : l'adresse de la base, son mot de passe, la clé secrète de Symfony. Sur le serveur, ces valeurs vivent dans `.env.local`. Le fichier `.gitignore` (la liste des fichiers que Git doit ignorer) contient bien `/.env.local` : ce fichier ne part jamais sur GitHub. C'est comme le code du cadenas du local à ballons : chacun le connaît sur place, on ne l'écrit pas sur le panneau d'affichage.

### Les crons : le réveil automatique

Un **cron** est une tâche planifiée : le serveur lance un programme tout seul, à heure fixe, comme un réveil. L'interface OVH ne permet pas de passer des options à une commande, alors le projet a de petits fichiers qui fixent la commande. Extrait réel de `bin/cron-otm-cloturer.php` :

```php
$racine = dirname(__DIR__);
$php = PHP_BINARY !== '' ? PHP_BINARY : 'php';

$commande = sprintf(
    '%s %s app:otm:cloturer --execute --no-interaction --env=prod 2>&1',
    escapeshellarg($php),
    escapeshellarg($racine . '/bin/console')
);

$code = 0;
passthru($commande, $code);
exit($code);
```

- `$racine` : le dossier du projet (le parent de `bin/`).
- `$php` : le chemin du programme PHP qui tourne en ce moment.
- `sprintf(...)` : fabrique la phrase de commande, ici « lance `app:otm:cloturer` en vrai (`--execute`), sans poser de question, en production ».
- `escapeshellarg` : met des guillemets de sécurité autour des chemins.
- `passthru` : exécute la commande et affiche ce qu'elle dit.
- `exit($code)` : renvoie le code de réussite ou d'échec, pour qu'OVH sache si ça a marché.

Il y a trois fichiers de ce type : `cron-otm-cloturer.php` (2h30), `cron-otm-rappel.php` (18h) et `cron-ffbb-ocr.php` (8h et 18h). Le §9.1 du doc maître liste encore « crons OVH créés sur MABB et Velito » dans ce qui reste à faire : je n'ai pas pu vérifier qu'ils sont posés.

### La sauvegarde : `bin/sauvegarde-bdd.sh`

Toutes les données du club (joueuses, stats, convocations, cotisations) sont dans la base. Le script de sauvegarde, extrait réel :

```bash
MYSQL_PWD="$DB_PASS" mysqldump \
  --single-transaction \
  --routines \
  --no-tablespaces \
  -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  "$DB_NAME" | gzip > "$FICHIER"

TAILLE=$(wc -c < "$FICHIER")
if [ "$TAILLE" -lt 10240 ]; then
  echo "ALERTE : dump suspicieusement petit ($TAILLE octets) — à vérifier !" >&2
  exit 2
fi

find "$OUT" -name 'bdd_*.sql.gz' -mtime +14 -delete
```

- `MYSQL_PWD="$DB_PASS"` : le mot de passe passe par l'environnement, pas sur la ligne de commande où d'autres clients du serveur mutualisé pourraient le voir. Il est lu plus haut dans `.env.local`, jamais écrit en dur.
- `mysqldump` : l'outil qui recopie toute la base dans un fichier texte de commandes SQL (un **dump**).
- `--single-transaction` : prend une photo cohérente sans bloquer le site.
- `| gzip > "$FICHIER"` : compresse le résultat dans un fichier daté de `var/backups/`.
- Le bloc `TAILLE` : si le fichier fait moins de 10 Ko, c'est sûrement un échec silencieux, le script crie.
- `find ... -mtime +14 -delete` : efface les sauvegardes de plus de 14 jours.

Le script est bien écrit. Le problème est ailleurs. Le doc `instruction/33_SAUVEGARDE_BDD.md` dit lui-même : « Un backup jamais restauré est une prière, pas une sauvegarde. » Retiens la version courte : **une sauvegarde jamais restaurée n'est pas une sauvegarde.** Or le doc maître (§9, point 2) indique encore à faire : « Backup de la base MABB, exécuté et restauré une fois, avec `public/uploads` et `var/decharges` ». Trois trous donc : pas de preuve que le cron est posé, pas de restauration testée, et les fichiers déposés (photos, PDF) ne sont pas dans le dump. Petit piège en plus : le doc 33 indique un chemin en `~/www`, alors que les fichiers cron disent « jamais ~/www ». Vérifie le vrai dossier avant de poser le cron.

### Ce que serait une CI

La **CI** (intégration continue) est un robot qui, à chaque `git push`, lance automatiquement les tests et refuse le déploiement si un test casse. C'est l'arbitre qui contrôle la feuille de match avant qu'elle parte à la fédération. Sur mabb-site, le seul fichier de `.github/workflows/` est `parse-positions-ffbb.yml`, une tâche planifiée qui lit des PDF de tirs. Aucun robot ne lance PHPUnit. Ce n'a jamais été fait sur ce projet.

### Ce que tu dis au jury

« Mon code est versionné avec Git sur un dépôt GitHub privé, et je déploie sur un hébergement mutualisé OVH par SSH : récupération du code, Composer, migrations, cache. Les secrets sont dans `.env.local` sur le serveur, exclus de Git par le `.gitignore`. Les tâches récurrentes passent par des crons OVH qui appellent des commandes Symfony via de petits scripts dans `bin/`. Mon script de déploiement a des défauts connus : il vide le cache avant les migrations, ne sauvegarde pas avant et n'a pas de retour arrière, et je sais comment les corriger. Ma sauvegarde quotidienne existe, mais tant que je n'ai pas fait une restauration réelle, je la considère comme non prouvée. »

## À retenir

- Git garde l'historique de tout, même ce que tu supprimes : un secret commité une fois reste dans l'historique, d'où le dépôt privé.
- SSH est la télécommande du serveur ; `deploy.ps1` pousse le code puis lance sur OVH `git pull`, `composer install`, `cache:clear`, migrations et `asset-map:compile`.
- Défauts connus du déploiement : cache vidé avant les migrations, aucune sauvegarde avant migration, aucun retour arrière, et une procédure officielle différente dans `00_ECOSYSTEME.md`.
- Les secrets sont dans `.env.local` sur le serveur, ignoré par Git ; les crons passent par `bin/cron-*.php`.
- `bin/sauvegarde-bdd.sh` est solide, mais une sauvegarde jamais restaurée n'est pas une sauvegarde, et les uploads n'y sont pas.
- Aucune CI ne lance les tests sur ce projet.

## Mise en pratique

Exercice de 45 minutes, sur ton PC, sans rien déployer.

1. Ouvre `deploy.ps1` et `instruction/00_ECOSYSTEME.md` §2.6. Écris sur une feuille les deux séquences côte à côte, et entoure les différences.
2. Réécris sur papier la séquence serveur dans le bon ordre selon toi : sauvegarde de la base, récupération du code, Composer, migrations, cache. Justifie chaque place en une phrase.
3. Lance `git --no-optional-locks log --oneline -5` dans mabb-site et lis les cinq derniers messages de commit : sont-ils compréhensibles par quelqu'un qui ne connaît pas le projet ?
4. Ouvre `instruction/33_SAUVEGARDE_BDD.md` §3 et écris la liste des étapes que tu ferais pour une restauration test sur ta base locale Laragon, sans les exécuter sur le serveur.

C'est réussi quand tu peux expliquer à voix haute, sans notes, pourquoi `cache:clear` avant `migrate` est risqué et ce que serait une restauration test, en moins de deux minutes.

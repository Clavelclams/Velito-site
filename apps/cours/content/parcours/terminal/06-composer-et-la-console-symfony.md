---
titre: "Composer et php bin/console : le monde PHP décodé"
parcours: "terminal"
ordre: 6
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Bonne nouvelle : si tu as compris la leçon 5, tu as déjà compris 80 % de celle-ci. Le monde PHP a exactement les mêmes concepts que le monde Node, avec d'autres noms. Tableau de correspondance mental : **Composer** = npm, **`composer.json`** = `package.json`, **`vendor`** = `node_modules`, **`composer.lock`** = `package-lock.json`.

Donc quand tu tapes `composer install` dans `mabb-site`, il lit `composer.json`, télécharge les paquets PHP (Symfony, Doctrine, PHPUnit…) depuis le registre Packagist, résout les dépendances en cascade, et remplit le dossier `vendor`. Comme `node_modules`, `vendor` ne se partage jamais : il se reconstruit. Et `composer.lock` fige les versions exactes pour que ton serveur OVH installe la même chose que ta machine.

Passons à la commande que tu tapes sans la décomposer : `php bin/console make:entity`. Trois morceaux :

1. `php` : le programme qui exécute du code PHP (comme `node` exécute du JS) ;
2. `bin/console` : un **fichier PHP de ton projet** (va le voir, il existe vraiment !) fourni par Symfony — c'est le centre de commande de ton application ;
3. `make:entity` : l'argument qui dit à la console *quelle* commande interne lancer.

Donc tu demandes à PHP d'exécuter le script `console`, en lui passant le nom d'une sous-commande. La convention `domaine:action` organise les centaines de commandes disponibles : `make:` fabrique du code, `doctrine:` parle à la base de données, `cache:` gère le cache.

Décodons tes trois commandes quotidiennes :

```powershell
# Génère ou modifie une classe entité (une table de ta BDD côté PHP)
php bin/console make:entity

# Applique à la base de données les migrations pas encore exécutées.
# Une migration = un fichier qui décrit UN changement de schéma (ajouter
# une colonne, créer une table). Doctrine tient un registre de ce qui est
# déjà passé, et n'applique que le reste, dans l'ordre.
php bin/console doctrine:migrations:migrate

# Vide le cache : Symfony pré-calcule config et routes pour aller vite ;
# après certains changements, on jette ces calculs pour forcer leur régénération.
php bin/console cache:clear
```

Deux commandes de lecture très utiles à ajouter à ta panoplie : `php bin/console list` affiche toutes les commandes disponibles (tu verras les familles `make:`, `doctrine:`, `cache:`…), et `php bin/console doctrine:migrations:status` te dit combien de migrations sont appliquées ou en attente — parfait pour vérifier l'état avant de migrer.

Et tes tests : `php bin/phpunit` demande à PHP d'exécuter le script `bin/phpunit`, qui lance ta suite de tests. Même schéma que `bin/console` : programme + script du projet.

Point syntaxe important pour le jury : tu remarques que ces commandes s'écrivent avec un `/` (`bin/console`) et fonctionnent quand même sur Windows — PHP accepte les deux séparateurs. Résultat : `composer install` et `php bin/console` s'écrivent **exactement pareil** sur ta machine Windows et sur un serveur Linux OVH. C'est voulu : les tutos, les scripts de déploiement et ta machine parlent la même langue.

En résumé : tu connais désormais deux écosystèmes parallèles. Devant le jury, savoir dire « Composer est à PHP ce que npm est à Node : un gestionnaire de dépendances avec un fichier manifeste, un fichier lock et un dossier de paquets reconstructible » est une phrase en or.

## À retenir

- Composer = npm du monde PHP : `composer.json` (liste), `composer.lock` (versions exactes), `vendor` (paquets, jamais partagé).
- `php bin/console xxx` = le programme PHP exécute le script `bin/console` de mon projet, qui lance la sous-commande `xxx`.
- Convention `domaine:action` : `make:` génère du code, `doctrine:` parle à la BDD, `cache:` gère le cache.
- Une migration décrit un changement de schéma ; `doctrine:migrations:migrate` n'applique que celles pas encore passées, dans l'ordre.
- `php bin/console list` affiche toutes les commandes : mon aide-mémoire intégré.

## Mise en pratique

Objectif : disséquer ton projet Symfony en lecture seule (aucune migration, aucune génération de code aujourd'hui).

1. Va dans le projet : `cd "C:\Users\Velito Adventure\Documents\mabb-site"`.
2. Vérifie la correspondance avec le monde npm : `ls` et repère `composer.json`, `composer.lock` et le dossier `vendor`. Affiche la liste de courses PHP : `cat composer.json -Head 30`.
3. Regarde le fameux fichier console de tes propres yeux : `cat bin\console`. C'est un petit script PHP d'une vingtaine de lignes — plus de magie.
4. Affiche le catalogue complet : `php bin/console list`. Fais défiler et repère les familles `make:`, `doctrine:` et `cache:` que tu utilises déjà.
5. Demande l'aide d'une commande que tu tapes souvent : `php bin/console doctrine:migrations:migrate --help`. Lis la description : tu reconnais maintenant chaque terme.
6. Vérifie l'état des migrations SANS rien appliquer : `php bin/console doctrine:migrations:status`. Note le nombre de migrations exécutées et en attente ("new").
7. Jette un œil au dossier des migrations : `ls migrations`, puis affiche la plus récente avec `cat migrations\Version....php` (utilise Tab pour compléter le nom). Repère la requête SQL qu'elle contient : voilà ce que `migrate` exécute réellement.
8. Termine par `composer install` : comme pour npm, il constate que tout est déjà là et ne casse rien.

Résultat attendu : tu as vu que `bin/console` est un vrai fichier de ton projet, tu connais le nombre exact de migrations appliquées dans mabb-site, et tu peux réciter la correspondance complète npm ↔ Composer sans hésiter.

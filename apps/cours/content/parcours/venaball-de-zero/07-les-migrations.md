---
titre: "Les migrations : changer la base sans rien casser"
parcours: "venaball-de-zero"
ordre: 7
niveau: "debutant"
duree: 35
date: 2026-10-04
---

## Le cours

Le 30 septembre 2026, il fallait ajouter une case sur la fiche de chaque équipe : la « clé FFBB », qui permet d'importer tous les matchs du club en un clic. Dans la leçon 6, tu as vu la propriété `$cleFfbb` dans `Equipe.php`. Mais ajouter une propriété dans le PHP ne crée pas la colonne dans MySQL. Il faut aussi modifier la base, et la modifier **pareil** sur ton PC, sur le serveur MABB et sur le serveur Venaball. C'est le rôle des **migrations**.

### Pourquoi on ne touche pas la base à la main

Imagine trois secrétaires dans trois gymnases, chacune avec son armoire. Un jour, on décide d'ajouter une case « clé FFBB » sur toutes les fiches Équipes. Si chacune modifie ses fiches de mémoire, l'une écrira « clé FFBB », l'autre « code fédé », la troisième oubliera. Trois mois plus tard, plus personne ne sait quelle armoire ressemble à quoi.

La solution : une **note de service numérotée**, la même pour tout le monde. « Note n°47 : ajouter la case clé FFBB, 160 caractères, facultative. » Chaque secrétaire applique les notes dans l'ordre et coche celles qu'elle a faites.

Une **migration**, c'est cette note de service. Un petit fichier PHP rangé dans `mabb-site/migrations/` qui contient l'ordre SQL à exécuter pour faire évoluer la base. Le projet en compte 91 aujourd'hui. Et la règle est écrite dans `instruction/PROMPT_DEV_COLLABORATEUR.md` : « Jamais d'édition manuelle de la base. »

### Une vraie migration lue ligne à ligne

Voici `migrations/Version20260930150000.php`, celle de la clé FFBB, en entier (seul le commentaire d'en-tête est raccourci) :

```php
<?php

declare(strict_types=1);

namespace DoctrineMigrations;

use Doctrine\DBAL\Schema\Schema;
use Doctrine\Migrations\AbstractMigration;

final class Version20260930150000 extends AbstractMigration
{
    public function getDescription(): string
    {
        return 'equipe.cle_ffbb : cle d import FFBB (division|etiquette) pour l import club entier';
    }

    public function up(Schema $schema): void
    {
        $this->addSql('ALTER TABLE equipe ADD cle_ffbb VARCHAR(160) DEFAULT NULL');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('ALTER TABLE equipe DROP cle_ffbb');
    }
}
```

Ligne par ligne :
- `declare(strict_types=1);` : PHP devient strict sur les types, il refuse par exemple un nombre là où on attend du texte.
- `namespace DoctrineMigrations;` : le rangement réservé aux migrations (réglé dans `config/packages/doctrine_migrations.yaml`).
- `final class Version20260930150000` : le nom **est** la date et l'heure, `2026-09-30 15:00:00`. C'est ce qui donne l'ordre d'exécution : la plus ancienne d'abord. `final` interdit qu'une autre classe en hérite.
- `extends AbstractMigration` : notre classe reprend tout le savoir-faire d'une migration Doctrine. On n'a plus qu'à remplir trois méthodes.
- `getDescription()` : une phrase lisible qui dit ce que fait la note. Elle s'affiche dans les commandes de suivi.
- `up()` : ce qu'on fait pour **avancer**. `addSql(...)` ajoute un ordre SQL à la liste. Ici : « modifie la table `equipe`, ajoute la colonne `cle_ffbb`, texte de 160 caractères maximum, vide par défaut ». `DEFAULT NULL` est important : les équipes qui existent déjà reçoivent une case vide, rien ne casse.
- `down()` : ce qu'on fait pour **reculer**, l'inverse exact de `up()`. Ici : supprimer la colonne. Si la nouveauté pose problème, on peut revenir en arrière proprement.

Compare avec la leçon 6 : la propriété `$cleFfbb` de `Equipe.php` porte `#[ORM\Column(length: 160, nullable: true)]`. 160 et `nullable` d'un côté, `VARCHAR(160) DEFAULT NULL` de l'autre. L'entité et la migration doivent dire la même chose. Si elles divergent, Doctrine croit qu'une colonne existe alors qu'elle n'existe pas, et la page plante.

### La commande qui applique, et la feuille de pointage

Sur chaque serveur, après avoir récupéré le code, on lance :

```bash
php bin/console doctrine:migrations:migrate --no-interaction --env=prod
```

- `php bin/console` : la console de Symfony, une boîte à outils en ligne de commande.
- `doctrine:migrations:migrate` : « applique toutes les migrations pas encore faites ».
- `--no-interaction` : ne pose pas de question « tu es sûr ? ».
- `--env=prod` : utilise la configuration de production.

Comment Doctrine sait-il lesquelles sont « déjà faites » ? Il tient une feuille de pointage **dans la base elle-même** : une table de versions. Le fichier `config/packages/doctrine_migrations.yaml` du projet ne change pas son nom, donc c'est le nom par défaut de Doctrine, `doctrine_migration_versions`. Chaque migration jouée y laisse une ligne avec son nom et sa date. Au prochain `migrate`, Doctrine compare la liste des fichiers avec la feuille, et ne joue que la différence. C'est pour ça qu'on peut lancer la commande à chaque déploiement sans risque : si rien n'est nouveau, rien ne se passe. La commande `doctrine:migrations:status` affiche cet état.

Cette ligne est dans la séquence de déploiement de `instruction/00_ECOSYSTEME.md` et de `mabb-site/CLAUDE.md`. Tu la reverras en leçon 15.

### Les règles du projet

Venaball tourne sur deux bases différentes : MABB (MariaDB 10.4, avec les vraies données du club) et Venaball (MySQL 8.4, partie de zéro). Les règles, écrites dans `instruction/PROMPT_DEV_COLLABORATEUR.md`, `00_ECOSYSTEME.md` et `CLAUDE.md`, en découlent.

**1. Écrites à la main, petites.** Doctrine sait générer une migration tout seul (`doctrine:migrations:diff`, qui compare les entités et la base). Mais le doc est clair : « La base de dev locale a dérivé de la prod. Donc : ne jamais faire confiance à `doctrine:migrations:diff`. » Une migration par changement logique, courte, lisible.

**2. Réversibles.** Un `down()` toujours écrit.

**3. Syntaxe commune aux deux bases.** Par exemple pas de `ADD COLUMN IF NOT EXISTS`, qui n'existe que sur MariaDB.

**4. Gardées par slug.** Quand une migration ajoute des **données** (et pas seulement des colonnes), elle ne doit jamais supposer qu'un club existe. Exemple réel, `migrations/Version20260710123000.php`, qui crée les trois secteurs du MABB :

```php
"INSERT INTO sport_secteur (nom, ordre, club_id)
 SELECT '{$nomSql}', {$ordre}, c.id FROM club c
 WHERE c.slug = 'mabb'
   AND NOT EXISTS (
       SELECT 1 FROM sport_secteur s
       WHERE s.club_id = c.id AND s.nom = '{$nomSql}'
   )"
```

- `INSERT INTO ... SELECT ... FROM club c` : on insère autant de lignes que la recherche dans `club` en trouve.
- `WHERE c.slug = 'mabb'` : on cherche le club par son **slug**, son petit nom unique. Sur l'instance Venaball, aucun club ne s'appelle `mabb` : la recherche trouve zéro ligne, donc zéro insertion, et surtout zéro erreur.
- `AND NOT EXISTS (...)` : et seulement si le secteur n'existe pas déjà. Rejouée deux fois, la migration ne crée pas de doublon.

Pourquoi le slug et pas l'id ? Le doc le dit : « l'id 2 sera un autre club sur une autre instance ».

**5. Testées en production seulement.** C'est la règle la moins confortable, et il faut la présenter honnêtement. `CLAUDE.md` l'écrit : « Pas de base MySQL locale fiable : les migrations ne se testent qu'en prod. » C'est pour compenser ce risque que les migrations doivent être petites et réversibles. Avoir une copie locale fidèle de la base pour tester avant reste une amélioration à faire.

### Une histoire vraie : le 3 octobre 2026, une panne de quelques minutes

Le soir du 2 au 3 octobre, il fallait permettre au dirigeant de saisir le **code e-Marque** d'un match, la clé que la fédération envoie trois jours avant pour ouvrir la feuille de match électronique.

À 00h55, le commit `5f29799` est créé, puis déployé. Il ajoute dans `Rencontre.php` une propriété `$codeEmarque`, ses méthodes `getCodeEmarque()` et `setCodeEmarque()`, et cette migration :

```php
public function up(Schema $schema): void
{
    $this->addSql('ALTER TABLE rencontre ADD code_emarque VARCHAR(40) DEFAULT NULL');
}
```

Sur le papier, propre : petite, réversible. Sauf qu'un champ `codeEMarque` (avec un M majuscule) existait déjà depuis juin, ajouté pour l'import FFBB, avec ses méthodes `getCodeEMarque()` et `setCodeEMarque()`.

Problème : en PHP, les noms de **propriétés** distinguent majuscules et minuscules, mais les noms de **méthodes**, non. Pour PHP, `getCodeEmarque` et `getCodeEMarque` sont la même méthode déclarée deux fois. Il refuse de charger la classe `Rencontre`. Et comme `Rencontre` est utilisée presque partout, c'est une erreur 500 (« le serveur a planté ») sur tout le site.

À 01h02, sept minutes après, le commit `2fa7cbc` corrige. Le journal de `00_ECOSYSTEME.md` parle d'une erreur 500 « pendant quelques minutes » ; la durée exacte côté serveur n'est pas vérifiée. `git --no-optional-locks show 2fa7cbc --stat` montre quatre fichiers : la migration `Version20261003090000.php` **supprimée**, le doublon retiré de `Rencontre.php`, et deux ajustements (la longueur passe de 40 à 30, celle du champ existant). La saisie réutilise désormais le champ d'origine.

En lisant les migrations, on voit un détail de plus : `Version20260610140000.php` crée déjà une colonne `code_emarque` sur `rencontre`. La nouvelle migration aurait donc échoué elle aussi, puisque la colonne existait. Je n'ai pas pu vérifier si elle a été lancée sur un serveur avant d'être retirée.

La leçon est entrée dans `CLAUDE.md` et dans le journal de `00_ECOSYSTEME.md` : avant d'ajouter un champ, une méthode ou une route, chercher le nom sans tenir compte des majuscules (`grep -ri`) dans `src/`, `templates/` et `migrations/`. Dix secondes de recherche auraient évité la panne.

### Ce que tu dis au jury

« Je ne modifie jamais la base à la main : chaque changement de structure passe par une migration Doctrine, versionnée dans Git, avec une méthode `up` et une méthode `down`. Les migrations sont écrites à la main, petites, compatibles MySQL et MariaDB, et celles qui insèrent des données se protègent en ciblant le club par son slug. Doctrine tient une table de versions, donc la même commande peut être lancée à chaque déploiement sur les deux serveurs. Le 3 octobre, j'ai créé par erreur un doublon d'un champ existant à la casse près, ce qui a provoqué une erreur 500 pendant quelques minutes ; depuis, je cherche systématiquement un nom avant de l'ajouter. »

## À retenir

- Une migration est une note de service numérotée par sa date : elle modifie la structure de la base de façon identique sur tous les serveurs.
- `up()` avance, `down()` recule ; les deux sont toujours écrits.
- `doctrine:migrations:migrate` ne joue que les migrations absentes de la table de versions (`doctrine_migration_versions` par défaut).
- Règles Venaball : écrites à la main (jamais `diff`), petites, syntaxe commune MySQL 8.4 et MariaDB 10.4, données gardées par `slug`, testées en production faute de base locale fiable.
- Incident du 03/10 : `codeEmarque` contre `codeEMarque`, deux méthodes identiques pour PHP, 500 sur tout le site ; réflexe depuis : `grep -ri` avant d'ajouter un nom.

## Mise en pratique

Mène l'enquête sur l'incident du 3 octobre avec Git, en lecture seule.

1. Dans un terminal, va dans `mabb-site` et lance `git --no-optional-locks show 5f29799 --stat`, puis `git --no-optional-locks show 2fa7cbc --stat`. Note l'heure des deux commits et les fichiers touchés.
2. Lance `git --no-optional-locks show 2fa7cbc -- migrations/` et lis la migration supprimée : repère `up()` et `down()`.
3. Cherche `code_emarque` dans le dossier `migrations/` avec la recherche de ton éditeur. Trouve la migration de juin qui avait déjà créé la colonne.
4. Ouvre la migration la plus récente du dossier et explique-la ligne par ligne, comme dans cette leçon.

C'est réussi quand tu sais raconter l'incident en une minute (l'heure, la cause exacte, la correction, la règle qui en est sortie) et que tu sais dire, pour la migration la plus récente, ce que font `up()` et `down()` sans relire tes notes.

---
titre: "codeEmarque contre codeEMarque : une majuscule qui a mis tout le site en erreur 500"
projet: "venaball"
bloc: 2
themes: ["architecture", "base-de-donnees", "deploiement"]
source: "src/Entity/Sport/Rencontre.php (commits 5f29799 et 2fa7cbc, 03/10/2026)"
date: 2026-10-10
---

## Le concept

Le 03/10 à 00h55, je pousse le commit `5f29799` : le dirigeant ou le responsable OTM doit pouvoir saisir à la main le code e-Marque d'un match (la FFBB l'envoie trois jours avant). J'ajoute donc dans `src/Entity/Sport/Rencontre.php` une propriété, ses accesseurs et une migration :

```php
// ajouté par 5f29799, retiré par 2fa7cbc
#[ORM\Column(length: 40, nullable: true)]
private ?string $codeEmarque = null;

public function getCodeEmarque(): ?string { return $this->codeEmarque; }
public function setCodeEmarque(?string $c): static { /* ... */ }
```

Sauf que l'entité avait déjà, depuis juin (lot B19, import FFBB) :

```php
#[ORM\Column(length: 30, nullable: true)]
private ?string $codeEMarque = null;
// ...
public function getCodeEMarque(): ?string { return $this->codeEMarque; }
public function setCodeEMarque(?string $c): self { $this->codeEMarque = $c; return $this; }
```

**Le mécanisme.** En PHP, les noms de **variables et de propriétés** sont sensibles à la casse : `$codeEmarque` et `$codeEMarque` peuvent cohabiter. Mais les noms de **fonctions, de méthodes et de classes** ne le sont pas : pour PHP, `getCodeEmarque()` et `getCodeEMarque()` sont la même méthode déclarée deux fois. C'est une erreur fatale à la compilation de la classe (« Cannot redeclare »), pas une erreur à l'appel. Or `Rencontre` est chargée par Doctrine, par le tableau de bord, par l'import FFBB : tout le site répondait 500, d'après le journal `instruction/00_ECOSYSTEME.md` §10.2 (ligne 20) « pendant quelques minutes ».

**Le deuxième piège, côté base.** Le projet utilise `naming_strategy: doctrine.orm.naming_strategy.underscore_number_aware` (`config/packages/doctrine.yaml`), qui place un `_` seulement devant une majuscule précédée d'une minuscule ou d'un chiffre. `codeEMarque` et `codeEmarque` donnent donc tous les deux la colonne `code_emarque`, et cette colonne existait déjà (`migrations/Version20260610140000.php`). La nouvelle migration `ALTER TABLE rencontre ADD code_emarque` aurait elle aussi échoué.

**La correction** (`2fa7cbc`, sept minutes plus tard) : supprimer le doublon et la migration, réutiliser le champ existant, et ne modifier que son setter pour nettoyer la saisie (`trim`, vide devient `null`) et ramener la limite à 30 caractères comme la colonne. Détail qui montre bien la règle : `RencontreController` et `ImportRencontresService` appellent toujours `setCodeEmarque(...)` avec un `m` minuscule, et ça marche, parce que PHP retrouve `setCodeEMarque()` sans tenir compte de la casse.

**La leçon devenue règle**, écrite dans `CLAUDE.md` de `mabb-site` (§1) : avant d'ajouter un champ, une méthode ou une route, `grep -ri` le nom dans `src/`, `templates/` et `migrations/`. Le `-i` est l'essentiel : un `grep` sensible à la casse n'aurait pas trouvé `codeEMarque` en cherchant `codeEmarque`.

## Comment je l'explique au jury

Le 3 octobre, j'ai ajouté un champ `codeEmarque` à mon entité `Rencontre` alors qu'un champ `codeEMarque` existait déjà depuis juin. En PHP les propriétés sont sensibles à la casse mais pas les méthodes : mes deux getters étaient pour PHP la même méthode déclarée deux fois, une erreur fatale au chargement de la classe, donc une 500 sur tout le site. J'ai corrigé en sept minutes en supprimant le doublon et sa migration, et en réutilisant le champ existant. J'ai aussi compris que la base aurait refusé la migration, parce que la stratégie de nommage de Doctrine transforme les deux noms en `code_emarque`. J'en ai tiré une règle de méthode : chercher le nom sans tenir compte de la casse dans le code, les templates et les migrations avant d'ajouter quoi que ce soit.

## La question vicieuse du jury

**« Comment une erreur fatale aussi grossière arrive-t-elle en production ? Tu n'as pas de tests ni de vérification avant de déployer ? »**

Non, et c'est exactement le problème. Le commit est parti en prod sans qu'aucun outil ne charge la classe avant : pas de CI qui lance PHPUnit (le seul workflow GitHub du dépôt, `parse-positions-ffbb.yml`, ne lance pas les tests) et un déploiement par `git reset --hard` puis `cache:clear` directement sur le serveur. La règle du `CLAUDE.md` §4 demande pourtant `php -l` sur chaque fichier modifié puis `php bin/console lint:container` et `cache:clear` en local ; je ne peux pas prouver qu'ils ont été lancés ce soir-là, et je pense que le `cache:clear` local aurait suffi à voir l'erreur, puisqu'il charge les entités. Je ne suis pas sûr que `php -l` seul la détecte : je n'ai pas vérifié ce cas. La vraie protection, c'est une CI qui lance au minimum `cache:clear` et la suite PHPUnit à chaque push, et un déploiement qui n'avance que si elle est verte. Je l'ai en tête de mes prochaines étapes, elle n'existe pas encore.

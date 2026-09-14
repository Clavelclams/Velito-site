---
titre: "WHERE id = 2 : la migration qui marchait parce qu'il n'y avait qu'un club"
projet: "venaball"
bloc: 2
themes: ["base-de-donnees", "multi-tenant", "deploiement"]
source: "migrations/Version20260629120000.php (garde du 09/09/2026)"
date: 2026-09-09
---

## Le concept

Une migration de juin faisait ceci :

```php
// Pré-remplissage : Amiens Métropole Basket-Ball → MABB
$this->addSql("UPDATE club SET sigle = 'MABB' WHERE id = 2");
```

Sur la base du MABB, le club a l'id 2. Ça marche. Le 9 septembre, une **seconde instance** est montée sur une base vierge pour Venaball, et les 22 migrations sont rejouées dans l'ordre. Le club qui aura l'id 2 sur cette base ne sera pas le MABB — ce sera le premier club client venu. Il aurait hérité du sigle « MABB ».

C'est une classe de bug qu'on ne voit pas tant qu'on n'a qu'une base : **une migration qui porte des données** (du DML — `UPDATE`, `INSERT`) et non seulement de la structure (du DDL — `ALTER TABLE`) fait des hypothèses sur le contenu. Et le contenu diffère d'une instance à l'autre.

La garde :

```php
$this->addSql("UPDATE club SET sigle = 'MABB' WHERE id = 2 AND slug = 'mabb'");
```

Sur l'instance MABB, la condition est vraie, même comportement qu'avant. Sur toute autre instance, elle est fausse, la ligne ne touche rien. La migration devient **portable** : elle produit le résultat voulu partout, y compris là où le résultat voulu est « ne rien faire ».

De là, une **convention** écrite dans le document de conventions du projet :

- un club s'identifie par son **slug**, jamais par son id — l'id est un accident de l'ordre d'insertion, le slug est une identité choisie ;
- tout DML dans une migration est **gardé** par une condition qui vérifie qu'il s'applique aux bonnes lignes ;
- syntaxe commune MySQL 8.4 / MariaDB 10.4, parce que les deux hébergements n'ont pas le même moteur ;
- **plus jamais de données nominatives** dans une migration — une migration est du code versionné, publié, lu par tout développeur qui rejoint.

L'entité est aussi gardée d'un autre côté : `Club::valider()` est **idempotent** — revalider ne change pas la date d'origine. Rejouer une commande ne réécrit pas l'histoire.

## Comment je l'explique au jury

« Une migration de juin mettait à jour le club d'id 2 pour lui donner le sigle MABB. Ça marchait parce qu'il n'y avait qu'une base. Quand j'ai monté une seconde instance sur une base vierge, le club d'id 2 aurait été un club client, et il aurait hérité du sigle du MABB. J'ai gardé la requête avec `AND slug = 'mabb'` : elle fait la même chose chez le MABB et ne fait rien ailleurs. J'en ai tiré une convention : un club s'identifie par slug, jamais par id, et toute migration qui touche des données est gardée par une condition sur ce qu'elle est censée toucher. Une migration de structure est portable par nature ; une migration de données ne l'est que si on l'a rendue telle. »

## La question vicieuse du jury

**« Vous avez modifié une migration déjà exécutée. Vous m'avez dit ailleurs que ça ne se faisait jamais. »**

C'est vrai, et la contradiction mérite d'être regardée en face plutôt qu'esquivée. La règle « on ne modifie pas une migration exécutée » protège contre deux choses : qu'une base déjà migrée ne corresponde plus au fichier, et qu'un rejeu produise un résultat différent. Ici, sur la base MABB, la version gardée produit **exactement le même résultat** que l'originale — le club d'id 2 *a* le slug `mabb`, la condition ajoutée est vraie. La base migrée et le fichier sont donc cohérents. Ce que j'ai changé, c'est le comportement sur une base **qui n'existait pas encore** quand la migration a tourné. L'alternative orthodoxe aurait été une nouvelle migration `Version20260909…` qui *annule* le sigle sur les instances où il n'a pas lieu d'être — mais le mal serait déjà fait au moment où elle s'exécute, après la 20260629 dans l'ordre. Une migration corrective ne peut pas empêcher une migration antérieure de mal se comporter sur une base neuve. Donc j'ai réécrit, en le documentant dans le fichier avec la date et la raison. La règle reste la bonne règle ; ce cas est l'exception qui montre ce qu'elle protège vraiment.

---
titre: "findOneBy interroge la base, pas ce que je viens de créer"
projet: "venaball"
bloc: 2
themes: ["base-de-donnees", "orm", "tests"]
source: "src/Command/PassageSaisonCommand.php (bugfix 19/08/2026)"
date: 2026-09-04
---

## Le concept

Le passage de saison est un traitement de masse : il reconduit les joueuses dans leurs nouvelles équipes, recalcule les catégories, reconduit les coachs. Le 19 août, en production, il a planté en fin d'exécution sur une violation de contrainte unique — le doublon `79-14-2026-2027`.

Le code de garde ressemblait pourtant à ça :

```php
$existante = $repo->findOneBy(['joueur' => $j, 'equipe' => $equipe, 'saison' => $saison]);
if ($existante) { return; }        // déjà affectée → on ne fait rien
$em->persist(new JoueurEquipe(...));
```

Le raisonnement est faux, et la raison est au cœur de Doctrine : **`findOneBy` exécute un SELECT en base**. Il ne voit donc que ce qui y est **déjà écrit**. Les entités que je viens de `persist()` sont dans l'*Unit of Work* — la mémoire de travail de Doctrine — et n'atteindront la base qu'au `flush()`.

Le scénario réel : une joueuse est reconduite en équipe principale vers l'équipe X, et son doublage part d'une équipe source qui aboutit **aussi** à X. Deux `persist()` dans la même exécution, deux fois `findOneBy` qui répond « rien en base » — parce qu'effectivement, rien n'y est encore. Au `flush()`, MySQL refuse : contrainte unique `(joueur, equipe, saison)` violée, et **tout le passage de saison échoue**.

Le correctif tient dans un registre en mémoire, tenu pendant l'exécution :

```php
/** @var array<string, true> */
private array $affectationsFaites = [];

$cle = $j->getId() . '|' . ($equipe->getId() ?? spl_object_id($equipe)) . '|' . $saison;
if (isset($this->affectationsFaites[$cle])) {
    return;                      // doublon dans CETTE exécution
}
```

Le détail qui montre le problème dans le problème : `$equipe->getId() ?? spl_object_id($equipe)`. Une équipe créée pendant l'exécution n'a **pas encore d'identifiant** — il est attribué par la base au `flush()`. On se rabat donc sur l'identité de l'objet en mémoire. Tant que rien n'est écrit, il n'y a pas d'identifiant à utiliser comme clé.

Et le registre est remis à zéro au début de `execute()`, pour qu'une deuxième exécution dans le même processus ne parte pas avec les données de la première.

## Comment je l'explique au jury

« J'ai eu un plantage en production sur une violation de contrainte unique, alors que mon code vérifiait l'existence avant d'insérer. La cause : `findOneBy` fait un SELECT en base, donc il ne voit pas les entités que je viens de persister — elles sont dans l'Unit of Work de Doctrine et n'atteindront la base qu'au `flush`. Une joueuse pouvait être affectée deux fois à la même équipe dans la même exécution, par deux chemins différents. J'ai ajouté un registre en mémoire des paires déjà traitées pendant l'exécution. Le détail révélateur : pour une équipe créée dans la même exécution, je n'ai pas encore d'identifiant, donc j'utilise l'identité de l'objet PHP — l'identifiant est attribué par la base au flush. »

## La question vicieuse du jury

**« Vous avez corrigé le symptôme. Pourquoi deux chemins produisent-ils la même affectation ? »**

C'est la bonne question, et j'ai fait les deux : le registre empêche l'échec, mais le chemin qui produit le doublon est légitime. Une joueuse a une équipe principale et peut « doubler » dans une autre — et une règle de reconduction peut faire aboutir les deux vers la même équipe cible, typiquement quand deux équipes de la saison précédente fusionnent. Ce n'est pas une anomalie de données, c'est un cas métier réel. La question devient donc « que veut dire être affectée deux fois à la même équipe ? » — et la réponse est : rien, c'est une seule affectation. Le registre implémente exactement ça, avec la règle « la première gagne ». Ce qui rend la correction acceptable plutôt que cosmétique, c'est que la contrainte unique en base **reste** : elle a fait son travail, elle a arrêté l'écriture incohérente au lieu de la laisser passer. Sans elle, j'aurais eu deux lignes en double en production sans jamais le savoir. Un plantage bruyant vaut mieux qu'une corruption silencieuse — et c'est précisément ce que j'attends d'une contrainte.

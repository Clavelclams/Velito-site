---
titre: "Composer, namespaces et autoloading"
parcours: "php-symfony"
ordre: 5
niveau: "intermediaire"
duree: 20
date: 2026-07-25
---

## Le cours

Comment PHP sait-il où trouver la classe `ApiToken` quand `ApiAuthController` l'utilise ? Et comment Symfony est-il arrivé dans ton projet ? Réponse aux deux questions : **Composer**. C'est l'équivalent PHP de npm, et son fichier de configuration est le `composer.json` à la racine de Venaball.

**Les dépendances.** La section `"require"` liste tout ce dont ton projet a besoin en production : `"symfony/framework-bundle": "7.4.*"`, `"doctrine/orm": "^3.6.7"`, `"dompdf/dompdf"` pour tes PDF… La notation des versions est un contrat : `7.4.*` accepte 7.4.1, 7.4.9, mais jamais 7.5 ; `^3.6.7` accepte tout jusqu'à 4.0 exclu (le chapeau `^` = « pas de version majeure supérieure », car un changement majeur peut casser le code). La section `"require-dev"` liste les outils qui ne partent JAMAIS en production : `phpunit`, le `maker-bundle`, le profiler. Distinction à savoir justifier : la prod n'a pas besoin des outils de test, et moins de code déployé = moins de surface d'attaque.

`composer install` télécharge tout dans le dossier `vendor/` (le `node_modules` de PHP — jamais commité, reconstructible à l'identique grâce au fichier `composer.lock` qui fige les versions exactes). `composer update` met à jour dans les limites autorisées par les contraintes.

**Les namespaces.** Avec des centaines de classes (les tiennes + celles de Symfony et Doctrine), deux classes finiraient par porter le même nom. Le namespace est l'« adresse postale » d'une classe :

```php
namespace App\Entity\Core;    // en-tête du fichier : voici où j'habite

class ApiToken { /* ... */ }  // nom complet : App\Entity\Core\ApiToken
```

Pour utiliser une classe d'un autre namespace, on l'importe avec `use` :

```php
use App\Entity\Core\ApiToken;                       // ta classe
use Symfony\Component\HttpFoundation\JsonResponse;  // classe de Symfony

$token = new ApiToken();       // grâce au use, le nom court suffit
```

C'est l'équivalent de l'`import` de JavaScript, à une différence près : on n'importe pas un fichier, on importe un NOM.

**L'autoloading, la magie expliquée.** Tu as remarqué qu'aucun fichier PHP de ton projet ne fait de `require 'ApiToken.php'` ? C'est l'autoloader de Composer qui charge les fichiers à la demande, selon la convention **PSR-4** déclarée dans ton `composer.json` :

```json
"autoload": {
    "psr-4": { "App\\": "src/" }
}
```

Traduction : « tout ce qui commence par `App\` se trouve dans `src/`, et le reste du namespace reproduit les dossiers ». Le calcul est mécanique :

```
App\Entity\Core\ApiToken      → src/Entity/Core/ApiToken.php
App\Security\Voter\ClubVoter  → src/Security/Voter/ClubVoter.php
App\Gamification\XpCalculator → src/Gamification/XpCalculator.php
```

Quand PHP rencontre une classe inconnue, l'autoloader applique cette règle, trouve le fichier, le charge. Une classe = un fichier = un chemin prévisible. C'est aussi pour ça que tes tests ont leur propre règle dans `"autoload-dev"` : `App\Tests\` → `tests/` — même logique, mais chargée uniquement en développement.

Conséquence pratique que tu as déjà vécue : si le namespace en tête d'un fichier ne correspond pas à son chemin (fichier déplacé sans corriger le namespace), PHP lance un « Class not found » — désormais tu sauras exactement pourquoi.

## À retenir

- `composer.json` déclare les dépendances (`require` = production, `require-dev` = outils de dev jamais déployés) ; `vendor/` est le node_modules de PHP.
- `7.4.*` et `^3.6` sont des contraintes de version : jamais de saut de version majeure automatique, car majeur = risque de casse.
- Un namespace est l'adresse d'une classe ; `use` importe un nom (pas un fichier), comme l'`import` de JS.
- PSR-4 : `App\` correspond à `src/`, donc `App\Entity\Core\ApiToken` = `src/Entity/Core/ApiToken.php` — le chemin se déduit du nom, et inversement.

## Mise en pratique

1. Ouvre `composer.json` à la racine de ton projet.
2. Dans `"require"`, trouve trois choses et explique-les à voix haute : la version de PHP exigée, la contrainte `7.4.*` des paquets Symfony, et un paquet métier que TU utilises (ex. `dompdf/dompdf` pour tes exports PDF).
3. Trouve le bloc `"autoload"` → `"psr-4"`. Puis, sans regarder l'arborescence, déduis sur papier le chemin de fichier de : `App\Security\ApiTokenHandler`, `App\Service\Rgpd\RgpdExporter`, `App\Tests\Unit\Security\Voter\ClubVoterTest`. Vérifie ensuite dans ton IDE.
4. Ouvre `src/Controller/Api/ApiAuthController.php` et lis le bloc de `use` en tête : classe par classe, dis si elle vient de TON code (`App\...`) ou d'une dépendance (`Symfony\...`, `Doctrine\...`).

Résultat attendu : les trois chemins déduits sont exacts (dont `tests/Unit/Security/Voter/ClubVoterTest.php` via `autoload-dev`), et tu sais expliquer au jury pourquoi `vendor/` n'est pas dans Git.

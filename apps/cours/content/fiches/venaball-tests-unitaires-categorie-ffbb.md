---
titre: "Le test unitaire qui encode une règle FFBB : les catégories d'âge par date de naissance"
projet: "venaball"
bloc: 3
themes: ["tests-unitaires", "logique-metier"]
source: "src/Service/Sport/CategorieCalculator.php"
date: 2026-07-25
---

## Le concept

Un **test unitaire** vérifie une classe isolée, sans base de données ni serveur. Le meilleur candidat, c'est de la logique métier pure — et Venaball en a une parfaite : la règle FFBB des catégories d'âge. `src/Service/Sport/CategorieCalculator.php` calcule la catégorie d'une joueuse depuis sa date de naissance :

```php
// RÈGLE FFBB : âge de référence = année de FIN de saison − année de naissance
// Ex : née en 2013, saison 2026-2027 → 2027 − 2013 = 14 → U15
private const TRANCHES = [7, 9, 11, 13, 15, 18];
```

C'est la brique du passage de saison automatique : plus besoin de re-saisir les catégories à la main chaque année. Le test (`tests/Unit/Service/Sport/CategorieCalculatorTest.php`) utilise un **DataProvider** PHPUnit pour balayer les cas, surtout les **bornes** — c'est là que sont les bugs :

```php
yield 'U11 → passe U13 la saison suivante (borne)' => ['2016-03-01', '2026-2027', 'U11'];
yield 'même joueuse saison suivante'               => ['2016-03-01', '2027-2028', 'U13'];
yield 'U18 (âge 18, borne haute)' => ['2009-06-15', '2026-2027', 'U18'];
yield 'Senior (âge 19)'           => ['2008-06-15', '2026-2027', 'Senior'];
```

Les tests documentent aussi les règles de surclassement (jouer au-dessus de son âge = autorisé, en dessous = non) et un choix produit assumé : sans date de naissance connue, on ne bloque jamais — `testSansDateDeNaissanceOnNeBloqueJamais`, « l'incertitude ne bloque pas, le coach tranche ».

## Comment je l'explique au jury

J'ai isolé la règle FFBB des catégories d'âge dans un service pur, sans aucune dépendance : il prend une date de naissance et une saison, il rend une catégorie. Ça le rend testable en millisecondes, hors ligne, sans base. Mon test utilise un DataProvider pour couvrir chaque tranche et surtout chaque borne — une joueuse de 15 ans est U15, à 16 elle bascule U18, à 19 elle est Senior — parce que les bugs de classification vivent toujours aux frontières. Le cas central est celui qui a motivé la fonctionnalité : la même joueuse née en 2016 est U11 en 2026-2027 et U13 la saison suivante, c'est le passage de saison automatique. Mes tests vérifient aussi les décisions produit, pas seulement les maths : le surclassement vers le haut est compatible, jouer en dessous de son âge ne l'est pas, et une date de naissance inconnue ne bloque jamais — c'est le coach qui décide, l'outil informe.

## La question vicieuse du jury

**« Votre test vérifie du code que vous avez écrit vous-même. S'il encode une règle FFBB fausse, le test passe quand même. Il sert à quoi ? »**

C'est vrai, et c'est une limite de tout test : il vérifie la conformité à une spécification, pas la vérité de la spécification. Ma parade est triple. D'abord, la règle est écrite en clair dans la docblock du service avec des exemples chiffrés vérifiables contre les textes fédéraux — n'importe qui peut contrôler que « née en 2013, saison 2026-2027 → 14 → U15 » est la vraie règle du surclassement d'âge FFBB. Ensuite, les noms de mes cas de test sont en français métier (« U11 passe U13 la saison suivante ») : la secrétaire du club peut les relire — le test sert de spécification exécutable. Enfin, ce que le test protège vraiment, ce n'est pas la règle du premier jour, c'est la **non-régression** : le jour où je refactore le calcul ou touche aux bornes, une erreur d'un an sur une tranche fait échouer huit assertions immédiatement. Sans le test, elle partirait silencieusement en prod et une U15 se retrouverait engagée en U13.

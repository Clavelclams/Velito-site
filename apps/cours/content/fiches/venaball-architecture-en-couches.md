---
titre: "L'architecture en couches : un contrôleur mince, un service qui sait, un repository qui cherche"
projet: "venaball"
bloc: 2
themes: ["architecture", "couches"]
source: "src/Service/SaisonService.php"
date: 2026-07-25
---

## Le concept

Venaball sépare le code en couches à responsabilité unique : **Controller** (reçoit la requête HTTP, appelle, répond) → **Service** (la logique métier) → **Repository** (les requêtes base) → **Entity** (les données et leurs règles). Le tout rangé par domaines (`Core`, `Sport`, `Pirb`, `Vitrine`) dans un monolithe modulaire (ADR-0001).

L'exemple le plus parlant est `src/Service/SaisonService.php`, **source de vérité unique** de la saison sportive. Avant, la saison était codée en dur à plusieurs endroits ; maintenant elle est calculée :

```php
public function getSaisonCourante(): string
{
    $mois  = (int) date('n');
    $annee = (int) date('Y');
    if ($mois >= self::MOIS_BASCULE) {   // 7 = 1er juillet, début administratif FFBB
        return $annee . '-' . ($annee + 1);
    }
    return ($annee - 1) . '-' . $annee;
}
```

Résultat : le passage de saison est automatique sur le Manager, l'espace joueuse ET l'API mobile, sans déploiement — parce que tout le monolithe injecte le même service. On voit la même logique dans `src/Controller/Api/PirbApiController.php` : le contrôleur reste mince, il injecte `JoueurStatsAggregator`, `ShotChartCalculator`, `XpCalculator`, `SaisonService`... et se contente d'orchestrer et de sérialiser en JSON. La logique de calcul, elle, vit dans les services — donc elle est testable sans HTTP et réutilisable par le web comme par l'API.

## Comment je l'explique au jury

Mon principe, c'est : un contrôleur ne calcule rien. Il reçoit la requête, vérifie les droits via le Voter, appelle un service et rend une réponse. Toute la logique métier vit dans des services injectés par le conteneur Symfony — `SaisonService` pour la saison, `CategorieCalculator` pour les catégories d'âge, `XpCalculator` pour la gamification. Le bénéfice, je l'ai vécu concrètement : quand j'ai construit l'API mobile, je n'ai réécrit aucune logique — mes contrôleurs API injectent exactement les mêmes services que mes pages web, c'était le point structurant de mon ADR-0007, une seule source de vérité métier. Autre bénéfice : les tests. `CategorieCalculator` se teste en pur PHPUnit, sans base ni serveur, parce qu'il ne dépend de rien d'autre que ses entrées. Et l'exemple de `SaisonService` montre ce que la centralisation rapporte : la bascule de saison au 1er juillet est calculée à un seul endroit, donc elle est automatique partout.

## La question vicieuse du jury

**« Un monolithe avec 88 contrôleurs et 67 entités... pourquoi pas des microservices, puisque vous avez quatre domaines bien séparés ? »**

C'est une décision documentée (ADR-0001) et je la referais. Les microservices résolvent des problèmes que je n'ai pas — des équipes multiples qui se marchent dessus, des besoins de scalabilité différenciés — et coûtent très cher en ce que j'ai de plus rare : du temps de dev seul et de l'infra simple (un mutualisé OVH). Mon découpage en domaines me donne la modularité utile sans le coût réseau : les entités `Core` (User, Club) sont partagées nativement, un seul déploiement, une seule base de migrations. Et la séparation des espaces est quand même réelle, mais au bon niveau : sous-domaines et firewalls distincts (ADR-0002), pas des services distincts. Si un jour Venaball devient un vrai SaaS multi-clubs avec de la charge, la frontière naturelle de découpe existera déjà — ce sont mes namespaces de domaines.

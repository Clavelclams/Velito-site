---
titre: "Services et injection de dépendances"
parcours: "php-symfony"
ordre: 8
niveau: "intermediaire"
duree: 25
date: 2026-07-25
---

## Le cours

Où mettre la logique métier si les contrôleurs doivent rester minces (leçon 6) et les entités se limiter aux données (leçon 7) ? Dans les **services** : des classes qui font UNE chose et la font bien. `SaisonService` calcule les saisons, `XpCalculator` calcule l'XP, `CategorieCalculator` applique la règle FFBB, `ExpoPushService` envoie les notifications. C'est la philosophie du principe de responsabilité unique (le S de SOLID) : un fichier = un métier.

Le problème que résout l'**injection de dépendances (DI)** : un service a besoin d'autres briques pour travailler. `XpCalculator` a besoin de deux repositories. Le réflexe naïf serait de les fabriquer lui-même :

```php
// ❌ Le réflexe naïf
class XpCalculator
{
    public function xpTotal(Joueur $joueur): int
    {
        $repo = new PresenceRepository(/* ...quoi mettre ici ?? */);
    }
}
```

Trois problèmes : le calculateur devrait connaître la recette de fabrication d'un repository (connexion base incluse !) ; impossible de le tester sans vraie base de données ; et chaque appel recréerait tout. La solution : le service **déclare** ce dont il a besoin dans son constructeur, et quelqu'un d'autre le lui **fournit** :

```php
// ✅ Ton vrai code (src/Gamification/XpCalculator.php)
class XpCalculator
{
    public function __construct(
        private readonly PresenceRepository $presenceRepository,
        private readonly MissionRepository $missionRepository,
    ) {}
}
```

C'est l'**inversion de contrôle** : le service ne va plus chercher ses outils, on les lui apporte. Analogie : le coach n'achète pas les ballons ni ne construit le gymnase — le club les met à disposition ; lui se concentre sur l'entraînement.

Qui est ce « quelqu'un d'autre » ? Le **conteneur de services** de Symfony. Au démarrage, il scanne `src/`, enregistre chaque classe comme service, et grâce à l'**autowiring** lit les TYPES des paramètres de constructeur pour savoir quoi injecter : « un paramètre `PresenceRepository` ? Je fournis l'instance de `PresenceRepository` ». Aucune configuration à écrire dans le cas standard — le typage (leçon 2) sert de bon de commande. Le conteneur ne crée qu'UNE instance de chaque service et la réutilise partout (c'est de fait un singleton géré pour toi).

L'injection se propage en cascade, et ton code le montre bien : `ClubVoter` reçoit `TenantResolver`, qui reçoit lui-même `RequestStack`, `ClubRepository` et `Security`. Tu n'écris jamais AUCUN `new` pour tout ce monde — cherche `new SaisonService` dans tout ton projet : zéro résultat, alors que dix contrôleurs l'utilisent.

Les contrôleurs profitent du même mécanisme, avec un bonus : l'injection directement dans les paramètres de méthode. Ton `login()` reçoit `UserPasswordHasherInterface $hasher` et `EntityManagerInterface $em` sans constructeur. Remarque : on demande des **interfaces** (leçon 4) — « quelque chose qui sait hasher » — pas une classe concrète : le jour où l'implémentation change, ton code ne bouge pas.

Alors, quand garder `new` ? Pour les **objets-valeurs et entités** : `new ApiToken()`, `new \DateTimeImmutable()`, `new JsonResponse([...])`. La frontière à énoncer au jury : un *service* (sans état, réutilisable, avec des dépendances) est géré par le conteneur ; une *donnée* (un jeton précis, une date précise) se crée avec `new` au moment voulu. Et le lien avec les tests, que tu verras en leçon 10 : puisque `XpCalculator` reçoit ses repositories, un test peut lui injecter des faux (mocks) et vérifier le barème XP sans base de données. DI = testabilité.

## À retenir

- Un service = une responsabilité métier unique (`SaisonService`, `XpCalculator`) ; la logique vit là, pas dans les contrôleurs ni les entités.
- Injection de dépendances : le service déclare ses besoins dans son constructeur, le conteneur Symfony les fournit (autowiring par le type). Jamais de `new` pour un service.
- On injecte des interfaces quand c'est possible (`EntityManagerInterface`, `UserPasswordHasherInterface`) : on dépend du contrat, pas de l'implémentation.
- `new` reste correct pour les données : entités (`new ApiToken()`), dates, réponses. Service = géré par le conteneur ; donnée = créée à la demande.
- Argument jury : la DI rend chaque brique testable isolément en remplaçant les dépendances par des mocks.

## Mise en pratique

1. Ouvre `src/Gamification/XpCalculator.php` : lis le constructeur et nomme ses deux dépendances injectées.
2. Ouvre `src/Controller/Api/PirbApiController.php` : compte les services injectés dans son constructeur (il y en a huit, dont `XpCalculator` et `SaisonService`). Constate qu'aucun `new` ne les crée nulle part.
3. Fais une recherche globale dans ton projet (Ctrl+Shift+F) sur `new SaisonService` puis sur `new XpCalculator` : résultat attendu, zéro occurrence hors éventuels tests — preuve que seul le conteneur les instancie.
4. Explique à voix haute la chaîne d'injection : `PirbApiController` → `XpCalculator` → `PresenceRepository`. Puis réponds à la question jury : « pourquoi ne faites-vous pas simplement new XpCalculator() dans le contrôleur ? » (couplage, duplication, et surtout : impossible à tester sans base).

Résultat attendu : tu sais justifier « pas de new pour les services » avec trois arguments — découplage, instance unique gérée par le conteneur, testabilité par mocks.

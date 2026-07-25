---
titre: "Tests PHPUnit : unitaires vs fonctionnels"
parcours: "php-symfony"
ordre: 10
niveau: "solide"
duree: 30
date: 2026-07-25
---

## Le cours

Un test automatisé est un morceau de code qui vérifie que TON code fait ce qu'il promet — et qui le revérifiera à chaque modification future. Pour le jury CDA, les tests ne sont pas un bonus : ils sont la preuve que tu maîtrises ton application. Venaball utilise **PHPUnit** (déclaré dans `require-dev`, configuré par `phpunit.dist.xml`), avec deux familles de tests bien séparées dans `tests/Unit/` et `tests/Functional/` — et tu dois savoir expliquer la différence.

**Le test unitaire** isole UNE classe et vérifie sa logique pure, sans base de données, sans HTTP, sans Symfony. Ton `CategorieCalculatorTest` est un modèle du genre :

```php
final class CategorieCalculatorTest extends TestCase   // TestCase = PHPUnit nu, sans Symfony
{
    protected function setUp(): void                   // exécuté avant CHAQUE test
    {
        $this->calculator = new CategorieCalculator(); // pas de conteneur : new direct, la classe n'a aucune dépendance
    }

    public function testAgeReferenceUtiliseAnneeDeFinDeSaison(): void
    {
        $j = $this->joueuseNee('2013-05-10');                            // ARRANGE : préparer
        self::assertSame(14, $this->calculator->ageReference($j, '2026-2027')); // ACT + ASSERT
    }
}
```

Chaque méthode `testXxx()` suit le rythme **Arrange-Act-Assert** : préparer les données, exécuter, vérifier. `assertSame` exige l'égalité stricte (le `===` des tests). Remarque le `#[DataProvider('provideCategories')]` dans ce même fichier : UNE méthode de test, alimentée par une liste de cas nommés (`yield 'U15 (âge 14)' => [...]`) — huit vérifications de la règle FFBB pour le prix d'une. Et remarque surtout que les tests couvrent les **cas limites** : bornes de tranches d'âge, date de naissance inconnue. C'est là que vivent les bugs.

**Le test fonctionnel** vérifie le comportement de bout en bout : une vraie requête HTTP traverse routing, firewall, contrôleur, Voter, base de données. Ton `PirbSeancesIdorTest` étend `WebTestCase`, qui démarre un vrai noyau Symfony et fournit un navigateur simulé :

```php
$this->client->loginUser($userA, 'pirb');       // authentifie sans formulaire : on teste l'AUTORISATION, pas le login
$this->get('/seances/' . $seanceB->getId());    // la joueuse A force l'URL d'une séance de l'équipe B
self::assertResponseStatusCodeSame(403);        // le serveur DOIT refuser → preuve anti-IDOR
```

Ce test est littéralement ta démonstration de sécurité de la leçon 9, transformée en preuve rejouable. Deux techniques du fichier à savoir défendre : chaque test s'exécute dans une **transaction annulée** en `tearDown()` (`rollBack()`), donc la base de test reste vierge entre les tests — l'isolation est totale ; et les *helpers de seed* (`creerClub()`, `creerEquipe()`…) fabriquent un mini-monde contrôlé pour chaque scénario.

**Quand choisir quoi ?** Le test unitaire est rapide (millisecondes) et chirurgical : parfait pour les règles de calcul (`CategorieCalculator`, `XpCalculator`) et la logique d'autorisation (tes `ClubVoterTest` et `TenantResolverTest` dans `tests/Unit/Security/`). Le test fonctionnel est plus lent mais prouve que TOUT le câblage tient ensemble : firewalls, routes, Voters branchés. La stratégie de Venaball — beaucoup d'unitaires ciblés + quelques fonctionnels sur les points critiques de sécurité — s'appelle la pyramide de tests, et c'est exactement la réponse attendue à « comment avez-vous testé votre application ? ».

Pour lancer les tests : `php bin/phpunit` (toute la suite), ou un seul fichier : `php bin/phpunit tests/Unit/Service/Sport/CategorieCalculatorTest.php`. Ton `phpunit.dist.xml` force `APP_ENV=test` et — détail qui claque en jury — `failOnDeprecation="true"` : une dépréciation fait ÉCHOUER la suite, le projet s'interdit de vieillir en silence.

## À retenir

- Test unitaire (`TestCase`) : une classe isolée, logique pure, pas de base — rapide et chirurgical. Test fonctionnel (`WebTestCase`) : vraie requête HTTP de bout en bout — prouve le câblage complet.
- Structure d'un test : Arrange (préparer), Act (exécuter), Assert (vérifier) ; `assertSame` = comparaison stricte.
- `PirbSeancesIdorTest` transforme l'argument sécurité anti-IDOR en preuve rejouable : accès à sa séance → 200, séance d'une autre équipe → 403.
- Isolation : chaque test fonctionnel tourne dans une transaction annulée (`rollBack` en `tearDown`) — aucune trace entre tests.
- Les tests couvrent d'abord les cas limites (bornes d'âge, valeurs null) et les points critiques (sécurité) : c'est la pyramide de tests.

## Mise en pratique

1. Ouvre `tests/Unit/Service/Sport/CategorieCalculatorTest.php` : choisis un cas du DataProvider (ex. `'Senior (âge 19)'`) et refais le calcul à la main (année de fin de saison − année de naissance → tranche).
2. Ouvre `tests/Functional/Pirb/PirbSeancesIdorTest.php` : dans `testJoueuseNeVoitPasLaSeanceDuneAutreEquipe()`, identifie les trois phases Arrange (seed du club, des deux équipes, de la séance B), Act (`loginUser` + `get`) et Assert (403).
3. Dans un terminal à la racine du projet, lance : `php bin/phpunit tests/Unit/Service/Sport/CategorieCalculatorTest.php` — puis, si ta base de test est créée (commandes en commentaire d'en-tête du test fonctionnel), lance la suite complète avec `php bin/phpunit`.
4. Exercice sans risque pour SENTIR l'utilité des tests : dans `src/Service/Sport/CategorieCalculator.php`, change temporairement la constante `TRANCHES` (ex. remplace 15 par 14), relance le test unitaire, observe les échecs précis, puis REMETS la valeur d'origine et vérifie que tout repasse au vert.

Résultat attendu : suite verte avant et après l'expérience, et tu as vu de tes yeux le filet de sécurité se déclencher — c'est exactement l'histoire à raconter au jury sur l'intérêt des tests.

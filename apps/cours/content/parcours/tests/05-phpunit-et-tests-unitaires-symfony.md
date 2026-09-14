---
titre: "PHPUnit sur Venaball : tester une entité sans Doctrine"
parcours: "tests"
ordre: 5
niveau: "intermediaire"
duree: 20
date: 2026-09-09
---

## Le cours

Venaball est ton projet de jury. Ses tests sont ceux qu'on te demandera de montrer. PHPUnit est l'équivalent de Vitest pour PHP : mêmes idées, syntaxe différente.

**La structure.**

```php
namespace App\Tests\Unit\Entity\Core;

use App\Entity\Core\User;
use PHPUnit\Framework\TestCase;

class UserTest extends TestCase
{
    public function testSetRolesMembreRemovesBenevoleWhenEmployePresent(): void
    {
        $user = new User();
        $user->setRolesMembre(['employe', 'coach']);

        $this->assertNotContains('benevole', $user->getRolesMembre(),
            'Bénévole doit être automatiquement retiré quand Employé est présent.');
    }
}
```

- Une classe qui étend `TestCase`, dans `tests/`, suffixée `Test`.
- Chaque méthode publique commençant par `test` est un cas. Le nom en camelCase raconte le comportement : `testSetRolesMembreRemovesBenevoleWhenEmployePresent`.
- `$this->assertX(attendu, réel, message)`. Le troisième argument — le message — s'affiche à l'échec. Venaball l'utilise systématiquement : c'est une bonne habitude que tes tests ARENA n'ont pas.

**Pourquoi ce test est unitaire.** `new User()` — pas de Doctrine, pas de noyau Symfony, pas de base. La règle « employé et bénévole sont exclusifs » vit **dans l'entité**, dans `setRolesMembre()`. C'est un choix d'architecture (une entité riche, pas une table PHP) qui rend le test possible en trois lignes. Si la règle était dans un contrôleur, il faudrait monter tout Symfony pour la vérifier.

Le commentaire de classe dit d'où vient la règle : « demande Willy — afficher la charge salariale du club ». Un test qui sait **pourquoi** il existe est un test qu'on ne supprimera pas par erreur en refactorant.

**Les assertions PHPUnit courantes.**

- `assertSame($a, $b)` — `===`. Préfère-le à `assertEquals` (`==`, qui dit que `"1"` égale `1`).
- `assertEquals` — pour les objets et tableaux, comparaison en profondeur.
- `assertTrue`, `assertFalse`, `assertNull`, `assertNotNull`.
- `assertContains($x, $tableau)`, `assertCount($n, $tableau)`, `assertEmpty`.
- `assertInstanceOf(Club::class, $obj)`.
- Pour les exceptions : `$this->expectException(\InvalidArgumentException::class); $this->expectExceptionMessage('…');` **avant** l'appel qui lève.

**`phpunit.dist.xml` : trois réglages qui comptent.** `failOnDeprecation="true"`, `failOnNotice="true"`, `failOnWarning="true"` — un avertissement PHP fait échouer la suite. C'est strict, et c'est bien : une dépréciation ignorée aujourd'hui est une panne à la prochaine mise à jour de Symfony. `APP_ENV=test` force l'environnement de test, avec sa propre base (`.env.test`).

**Les data providers : un test, dix cas.** Quand la même vérification s'applique à plusieurs entrées :

```php
#[\PHPUnit\Framework\Attributes\DataProvider('rolesInvalides')]
public function testSetRoleRejetteUnRoleInconnu(string $role): void
{
    $this->expectException(\InvalidArgumentException::class);
    (new UserClubRole())->setRole($role);
}

public static function rolesInvalides(): array
{
    return [['ADMIN'], ['coach '], [''], ['président']];
}
```

Quatre cas, une méthode. À l'échec, PHPUnit dit lequel (`with data set #2`). C'est l'outil pour la check-list des bords de la leçon 4.

**Ce qui manque dans `tests/README.md`, et qui est écrit noir sur blanc.** « À étendre ensuite : tests fonctionnels sur les contrôleurs admin, tests d'anti-fuite multi-tenant, tests des Voters. » Les deux derniers ont été faits depuis (leçon 6). Le premier reste. Un README de tests qui liste ses propres trous est plus crédible devant un jury qu'un README qui prétend tout couvrir.

**Lancer.** `php bin/phpunit` : tout. `php bin/phpunit tests/Unit` : les unitaires seuls (rapides, sans base). `php bin/phpunit --filter testSetRolesMembre` : par nom. `php bin/phpunit --testdox` : affiche les noms de tests comme des phrases — utile pour présenter au jury ce que la suite prouve.

## À retenir

- Classe `XxxTest extends TestCase`, méthodes `testXxx`, `$this->assertXxx($attendu, $réel, $message)`.
- Un test d'entité sans Doctrine est possible parce que la règle est **dans** l'entité. C'est de l'architecture.
- `assertSame` (strict) plutôt qu'`assertEquals`. `expectException` avant l'appel.
- Data providers pour dérouler les bords sans dupliquer.
- `--testdox` pour lire la suite comme une spécification.

## Mise en pratique

Objectif : ajouter un test unitaire à Venaball sur une règle qui n'en a pas, avec data provider et message.

1. `cd "C:\Users\Velito Adventure\Documents\mabb-site"`, `php bin/phpunit tests/Unit --testdox`. Lis la sortie comme une liste de phrases. Note celles qui te paraissent floues — un nom de test flou est à renommer.
2. Ouvre `src/Entity/Core/Club.php`, méthode `valider(?User $par)`. Elle est idempotente (revalider ne change pas la date). Aucun test ne le vérifie. Crée `tests/Unit/Entity/Core/ClubTest.php`.
3. Trois tests : `testUnClubNeufNestPasValide` (`assertFalse($club->isValide())`, `assertNull(getValideAt())`), `testValiderPoseLaDateEtLAuteur`, `testRevaliderNeChangePasLaDateDOrigine` (valide, note la date, valide encore avec un autre user, `assertSame` sur la date et l'auteur d'origine). Messages d'assertion sur chacun.
4. Un data provider sur `Club::setSlug()` si elle valide le format (sinon sur une autre méthode avec validation) : trois valeurs invalides qui doivent lever.
5. `php bin/phpunit tests/Unit/Entity/Core/ClubTest.php` : vert. Casse `valider()` (retire le `if ($this->valideAt === null)`) : le test d'idempotence passe au rouge. Remets.
6. Mets à jour `tests/README.md` : ajoute la ligne `Club::valider()` dans le tableau de couverture. Commit `test(club): validation idempotente + slug`.

Résultat attendu : un test unitaire PHPUnit à toi sur ton projet de jury, avec data provider, et le README qui le mentionne.

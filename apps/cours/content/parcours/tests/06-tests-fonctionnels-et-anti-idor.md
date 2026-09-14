---
titre: "Tests fonctionnels : monter Symfony, taper en base, et prouver un refus"
parcours: "tests"
ordre: 6
niveau: "solide"
duree: 30
date: 2026-09-09
---

## Le cours

Un test unitaire prouve qu'une fonction calcule juste. Il ne prouve pas que ton contrôleur appelle le bon Voter, que le Voter lit la bonne table, et que la réponse HTTP est un 403. Pour ça, il faut brancher les briques ensemble : c'est le **test fonctionnel**, et Venaball en a une famille qui vaut de l'or au jury — les tests **anti-IDOR**.

**Ce que fait `WebTestCase`.** Il démarre un vrai noyau Symfony en environnement `test`, avec un client HTTP simulé :

```php
abstract class PirbIdorTestCase extends WebTestCase
{
    protected function setUp(): void
    {
        $this->client = static::createClient();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $this->em->getConnection()->beginTransaction();
    }

    protected function tearDown(): void
    {
        if ($this->em->getConnection()->isTransactionActive()) {
            $this->em->getConnection()->rollBack();
        }
        parent::tearDown();
    }
}
```

Trois choses dans ces quinze lignes :

1. **`createClient()`** — un navigateur en mémoire. `$this->client->request('GET', '/seances/42')` traverse tout : routeur, firewall, contrôleur, Voter, Doctrine, Twig. La réponse est celle qu'un vrai navigateur aurait reçue.
2. **`getContainer()->get(EntityManagerInterface::class)`** — accès au conteneur de services pour préparer des données.
3. **La transaction annulée** — `beginTransaction()` avant, `rollBack()` après. Tout ce que le test écrit en base est effacé à la fin. Chaque test part d'une base propre, sans avoir à la recréer. C'est le motif standard, et il est rapide.

**Les helpers de seed.** `creerClub('a')`, `creerEquipe($club, 'U15')`, `creerJoueur(…)` : des fonctions qui fabriquent les données minimales d'un scénario. Elles sont dans la classe de base pour que chaque test concret « n'ajoute que le seed spécifique à son entité et ses assertions ». C'est de la factorisation de tests — aussi importante que celle du code.

**Le test anti-IDOR : prouver un refus.**

```php
public function testJoueuseNeVoitPasLaSeanceDuneAutreEquipe(): void
{
    // Arrange : deux clubs, deux équipes, une séance dans l'équipe B
    $clubA = $this->creerClub('a'); $clubB = $this->creerClub('b');
    $joueuseA = $this->creerJoueuseAvecCompte($clubA);
    $seanceB = $this->creerSeance($this->creerEquipe($clubB, 'U15'));
    $this->em->flush();

    // Act : la joueuse A demande la séance B en devinant son id
    $this->client->loginUser($joueuseA->getUser());
    $this->client->request('GET', '/seances/' . $seanceB->getId(), server: ['HTTP_HOST' => self::HOST]);

    // Assert : refus
    $this->assertResponseStatusCodeSame(403);
}
```

Ce test vérifie **ce que l'utilisateur ne peut pas faire**. C'est une inversion par rapport aux tests habituels, et c'est la plus précieuse : un test de succès prouve qu'une fonctionnalité existe ; un test de refus prouve qu'une **frontière** tient. Sur une application multi-tenant, les frontières sont tout.

Le nom du test est une phrase de spécification : « une joueuse ne voit pas la séance d'une autre équipe ». Le jury peut le lire sans PHP.

**`loginUser()` et `HTTP_HOST`.** `loginUser($user)` connecte le client de test sans passer par le formulaire — on teste l'autorisation, pas l'authentification. `HTTP_HOST => 'pirb.localhost'` : Venaball route par host (firewall PIRB vs Manager), donc le test doit se présenter sur le bon. Sans ça, le firewall ne serait pas le bon et le test prouverait autre chose que ce qu'il croit.

**Ce qu'un test fonctionnel coûte.** Quelques dizaines de millisecondes à quelques secondes chacun (noyau + base). Ton `php bin/phpunit` complet est plus lent que `vitest run` pour cette raison. On les réserve donc aux **chemins critiques** — sécurité, argent, données personnelles — et on garde le reste en unitaire. La pyramide, appliquée.

**La base de test.** `.env.test` définit une `DATABASE_URL` séparée. Avant la première exécution : `php bin/console doctrine:database:create --env=test` puis `doctrine:migrations:migrate --env=test`. Le schéma de test doit suivre les migrations, comme la prod. Une CI (GitHub Actions) ferait ça à chaque push — c'est l'étape suivante, non faite.

**Le pendant côté Next.** Il n'y a pas de `WebTestCase` pour Next. Le test d'intégration d'une Server Action ou d'une route se fait soit en appelant la fonction directement avec un client Supabase de test, soit en E2E. Aujourd'hui ARENA n'a aucun test de ce niveau — les invariants sont dans la base (triggers), ce qui est une réponse partielle, pas complète.

## À retenir

- `WebTestCase` = vrai noyau + client HTTP simulé. Le test traverse routeur, firewall, contrôleur, Voter, base.
- Transaction annulée en `tearDown` : base propre à chaque test, sans la recréer.
- Un test anti-IDOR prouve un **refus** (403). C'est la preuve qu'une frontière tient.
- `loginUser` pour tester l'autorisation sans l'authentification. Le bon `HTTP_HOST` pour le bon firewall.
- Coûteux → réservé aux chemins critiques. Sécurité, argent, données perso.

## Mise en pratique

Objectif : écrire un nouveau test anti-IDOR sur une entité de Venaball qui n'en a pas.

1. `php bin/phpunit tests/Functional --testdox`. Lis la liste : quelles entités PIRB ont un test IDOR ? Séances, shot-chart, stats, saisons. Laquelle n'en a pas ? (Documents ? Convocations ? Le nouveau `api-club` ?)
2. Choisis-en une avec un `{id}` dans l'URL et un Voter. Crée `tests/Functional/Pirb/PirbXxxIdorTest.php extends PirbIdorTestCase`.
3. Un premier test : le **cas autorisé** — la joueuse accède à sa propre ressource → 200. Il est nécessaire : sans lui, un 403 pourrait venir d'une route cassée, pas d'un Voter qui fonctionne.
4. Le test IDOR : deux clubs, ressource dans le club B, joueuse du club A, `loginUser`, `request` sur l'id de B, `assertResponseStatusCodeSame(403)`. Si tu obtiens 404 au lieu de 403, lis le Voter : certains choisissent 404 pour ne pas révéler l'existence — c'est un choix, documente-le dans le test.
5. Si le test IDOR est **rouge** avec un 200 : tu viens de trouver une faille dans ton projet de jury. Corrige le contrôleur ou le Voter, refais tourner, commit `fix(secu): isolation club sur Xxx` puis `test(secu): IDOR Xxx`.
6. Un test sur `api-club` : le renfort en cascade ou la convocation. `ConvocationManager` refuse une joueuse hors effectif — écris le test qui poste un id de joueuse d'un autre club et vérifie qu'elle n'est **pas** convoquée (assertion sur la base après l'appel, pas seulement sur le code HTTP).
7. Mets à jour `tests/README.md`.

Résultat attendu : un test fonctionnel anti-IDOR de plus sur Venaball, et peut-être une faille trouvée avant le jury plutôt que pendant.

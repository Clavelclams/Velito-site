---
titre: "Les tests : ce qui est prouvé et ce qui ne l'est pas"
parcours: "venaball-de-zero"
ordre: 16
niveau: "debutant"
duree: 40
date: 2026-10-04
---

## Le cours

Quand tu dis au jury « une joueuse ne peut pas voir les données d'une autre équipe », il va te demander : « Comment le sais-tu ? ». Tu peux répondre « j'ai essayé une fois dans mon navigateur ». Ou tu peux répondre « un test automatique le vérifie, voici le fichier ». La deuxième réponse vaut beaucoup plus. Cette leçon t'explique ce que tes tests prouvent vraiment, et ce qu'ils ne prouvent pas.

### Un test automatique, c'est l'arbitre

Un **test automatique** est un petit programme qui appelle ton code avec une situation précise et vérifie que le résultat est celui attendu. S'il ne l'est pas, le test devient rouge.

Pense à l'arbitre d'un match. La règle des 24 secondes ne dépend pas de la bonne humeur de l'équipe : l'arbitre la vérifie à chaque possession, sans se fatiguer. Un test, c'est pareil : tu écris la règle une fois, et la machine la contrôle à chaque fois que tu le lui demandes, même dans six mois, même après une modification faite par une IA.

### Unitaire ou fonctionnel

- Un **test unitaire** vérifie une seule pièce, isolée : une classe, une méthode. Pas de base de données, pas de serveur web. C'est comme vérifier qu'un ballon rebondit bien, seul, avant le match.
- Un **test fonctionnel** vérifie un vrai parcours : une requête HTTP part, traverse la sécurité, le contrôleur, la base, et revient avec une réponse. C'est comme jouer une action complète à cinq contre cinq.

Dans mabb-site, le dossier `tests/` contient les deux, rangés dans `tests/Unit/` et `tests/Functional/`. J'ai compté les méthodes `public function test...` : 18 fichiers unitaires pour 140 tests, et 5 fichiers fonctionnels pour 13 tests, soit 153 au total. Les plus gros sont `tests/Unit/Security/Voter/ClubVoterTest.php` (17 tests) et `tests/Unit/Security/Tenant/TenantResolverTest.php` (14 tests) : la sécurité multi-club est la partie la mieux couverte.

### Un vrai test unitaire, ligne par ligne

`tests/Unit/Service/Sport/CategorieCalculatorTest.php` vérifie le calcul de la catégorie FFBB (U11, U13, U15...) à partir de la date de naissance. Extrait réel :

```php
final class CategorieCalculatorTest extends TestCase
{
    private CategorieCalculator $calculator;

    protected function setUp(): void
    {
        $this->calculator = new CategorieCalculator();
    }

    public function testAgeReferenceUtiliseAnneeDeFinDeSaison(): void
    {
        $j = $this->joueuseNee('2013-05-10');
        // Saison 2026-2027 → fin 2027 → 2027 − 2013 = 14
        self::assertSame(14, $this->calculator->ageReference($j, '2026-2027'));
    }
```

- `final class CategorieCalculatorTest extends TestCase` : une classe de test. `extends TestCase` veut dire qu'elle hérite des outils de **PHPUnit**, la bibliothèque de tests de PHP.
- `private CategorieCalculator $calculator;` : une case pour ranger l'objet qu'on va tester.
- `setUp()` : méthode lancée automatiquement avant chaque test. Ici, on fabrique un calculateur tout neuf, pour qu'un test ne pollue pas le suivant.
- `testAgeReference...` : le nom commence par `test`, c'est comme ça que PHPUnit le reconnaît. Le nom raconte la règle : l'âge de référence utilise l'année de fin de saison.
- `$this->joueuseNee('2013-05-10')` : une petite fonction d'aide, définie plus bas dans le fichier, qui crée une `Joueur` née à cette date. Pas de base de données : l'objet existe seulement en mémoire.
- Le commentaire donne le calcul attendu, pour que le lecteur comprenne sans ouvrir le service.
- `self::assertSame(14, ...)` : l'assertion, le coup de sifflet. « Je veux exactement 14. » Si le calculateur renvoie 13 ou "14" en texte, le test échoue.

Le même fichier utilise un **DataProvider** : une liste de cas (`'U15 (âge 14)'`, `'U18 (âge 18, borne haute)'`...) qui fait tourner le même test plusieurs fois avec des données différentes. Remarque les mots « borne haute » : un bon test vise les limites, là où les bugs se cachent. Et un test documente aussi un choix métier : `testSansDateDeNaissanceOnNeBloqueJamais` dit noir sur blanc « l'incertitude ne bloque pas, le coach tranche ».

### Un test anti-IDOR, expliqué

Rappel : une faille **IDOR** consiste à changer un numéro dans l'adresse (par exemple l'identifiant d'une séance) pour voir ce qui appartient à quelqu'un d'autre. Le fichier `tests/Functional/Pirb/PirbSeancesIdorTest.php` vérifie que c'est impossible sur l'espace joueuse. Extrait réel :

```php
public function testJoueuseNeVoitPasLaSeanceDuneAutreEquipe(): void
{
    $club = $this->creerClub('club-a');
    $equipeA = $this->creerEquipe($club, 'U15 A');
    $equipeB = $this->creerEquipe($club, 'U18 B');

    $userA = $this->creerUser('joueuse.a@test.fr');
    $this->creerJoueur($club, $equipeA, $userA, 'Alice');

    $seanceB = $this->creerSeance($club, $equipeB);
    $this->em->flush();

    $this->client->loginUser($userA, 'pirb');
    $this->get('/seances/' . $seanceB->getId());

    self::assertResponseStatusCodeSame(403);
}
```

- On crée un club, deux équipes (U15 A et U18 B), une utilisatrice et sa fiche joueuse Alice dans l'équipe A. Ce sont des données inventées, propres au test.
- `creerSeance($club, $equipeB)` : une séance qui appartient à l'équipe B, pas à Alice.
- `$this->em->flush()` : on écrit tout ça dans la base de test.
- `loginUser($userA, 'pirb')` : on connecte Alice directement sur le firewall `pirb`, sans passer par le formulaire. On teste le droit, pas le mot de passe.
- `$this->get('/seances/' . ...)` : Alice tape l'adresse de la séance de l'autre équipe.
- `assertResponseStatusCodeSame(403)` : on exige la réponse 403, « interdit ». Si un jour quelqu'un casse le contrôle, ce test devient rouge.

Deux détails à savoir expliquer. D'abord, le test appelle l'hôte `pirb.localhost`, parce que les firewalls sont choisis selon le nom de domaine (leçon 11). Ensuite, `setUp()` ouvre une **transaction** (un lot d'écritures qu'on peut annuler) et `tearDown()` l'annule : la base de test reste propre après chaque test. Le même fichier contient aussi le test inverse, `testJoueuseVoitSaProreSeance` : elle doit pouvoir voir SA séance. Tester seulement le refus ne suffit pas, un site qui refuse tout passerait le test.

### Lancer les tests

Dans le dossier mabb-site :

```
php bin/phpunit
```

Pour un seul fichier : `php bin/phpunit tests/Unit/Service/Sport/CategorieCalculatorTest.php`. Les tests fonctionnels demandent une base de test créée une fois (`doctrine:database:create` puis `doctrine:schema:create` en `--env=test`, indiqué en tête de `PirbSeancesIdorTest.php`). Je n'ai pas lancé la suite pour ce cours : je ne peux pas te dire si elle est verte aujourd'hui. C'est la première chose à vérifier.

### Ce qui n'est pas prouvé

Sois précis, c'est ta force devant le jury.

- **L'API de l'app Club** (`src/Controller/Api/Club/`) : aucun test. L'audit `instruction/44_AUDIT_GLOBAL_2026-09-21.md` note « zéro test sur les 14 contrôleurs club ».
- **Les imports** (calendrier FFBB, Easy Stats, trombinoscope), **la trésorerie**, **la purge RGPD**, **le passage de saison** : aucun fichier de test à leur nom dans `tests/`.
- **Les tests sont à l'arrêt.** Le dernier commit qui touche `tests/` date du 07/07/2026. Depuis, beaucoup de code a été ajouté (Stats Live, OTM, Easy Stats) sans un seul test.
- **Personne ne lance les tests automatiquement.** Il n'y a pas de CI : le seul workflow GitHub est une tâche OCR. Un test que personne ne lance protège peu.
- **La doc des tests est périmée.** `tests/README.md` dit « Tests unitaires (sans BDD ni serveur) » et liste en « À étendre » les tests de `ClubVoter`, qui existent déjà.

### Ce que le jury attend au CCP3

Le bloc CCP3 du titre CDA porte sur la préparation du déploiement d'une application sécurisée. Le jury s'attend à voir un **plan de tests** (un tableau : quoi on teste, comment, résultat attendu) et une **recette** (la vérification finale, souvent à la main, avec un cahier de scénarios, avant de livrer). Tu as la matière pour le plan : les 153 tests existants. Il te manque le document qui les organise, les scénarios de recette, et une CI.

### Ce que tu dis au jury

« J'ai 153 tests PHPUnit : 140 unitaires, surtout sur la sécurité multi-club (le voter et le résolveur de club), et 13 fonctionnels qui envoient de vraies requêtes HTTP pour prouver qu'une joueuse ne peut pas ouvrir la séance ou les stats d'une autre équipe. Chaque test fonctionnel tourne dans une transaction annulée, donc la base de test reste propre. Je sais aussi ce qui n'est pas couvert : l'API Club, les imports, la trésorerie et la purge RGPD, et aucun test n'a été ajouté depuis juillet. Ma priorité est une CI qui lance ces tests à chaque push, puis des tests sur l'API Club. »

## À retenir

- Un test automatique vérifie une règle à chaque exécution, comme un arbitre ; unitaire = une pièce isolée, fonctionnel = un parcours HTTP complet.
- mabb-site a 153 méthodes de test : 140 unitaires (18 fichiers) et 13 fonctionnelles (5 fichiers), lancées par `php bin/phpunit`.
- Le test anti-IDOR connecte une joueuse et exige un 403 sur la séance d'une autre équipe, et teste aussi qu'elle voit bien la sienne.
- Non couvert : API Club, imports, trésorerie, purge RGPD, passage de saison ; dernier commit sur `tests/` le 07/07/2026.
- Pas de CI : les tests ne tournent que si quelqu'un pense à les lancer.
- Le CCP3 attend un plan de tests et une recette documentés.

## Mise en pratique

Exercice de 50 minutes sur ton PC.

1. Dans mabb-site, lance `php bin/phpunit tests/Unit`. Note le nombre de tests passés, en échec et ignorés.
2. Ouvre `src/Service/Sport/CategorieCalculator.php`, change temporairement le calcul de l'âge (par exemple, utilise l'année de début de saison). Relance `php bin/phpunit tests/Unit/Service/Sport/CategorieCalculatorTest.php` et regarde quel test devient rouge. Puis annule ta modification à la main et relance pour revoir tout vert.
3. Crée sur papier un plan de tests d'une page avec quatre colonnes (fonction, type de test, fichier existant ou « manquant », priorité), pour 8 fonctions de Venaball dont l'API Club et la trésorerie.

C'est réussi quand tu as vu un test passer du vert au rouge à cause de ta modification, puis revenir au vert, et que ton plan de tests montre clairement trois trous prioritaires.

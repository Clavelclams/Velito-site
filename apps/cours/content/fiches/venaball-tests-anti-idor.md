---
titre: "Tester ce que l'utilisateur NE PEUT PAS faire : les tests anti-IDOR"
projet: "venaball"
bloc: 3
themes: ["tests", "securite-applicative"]
source: "tests/Functional/Pirb/PirbIdorTestCase.php"
date: 2026-07-25
---

## Le concept

Une faille **IDOR** (Insecure Direct Object Reference), c'est quand on change l'`{id}` dans une URL (`/seances/42` → `/seances/43`) et qu'on accède à une ressource qui ne nous appartient pas. C'est une des failles web les plus courantes — et j'en ai trouvé une vraie dans mon propre code lors d'un audit (SEC-0009 dans `instruction/07_REGISTRE_SECURITE_RGPD.md` : une joueuse pouvait s'inscrire bénévole sur le match d'un autre club ; corrigée depuis).

La particularité de ces tests : ils vérifient un **refus**, pas un succès. Un test classique prouve que ça marche ; un test anti-IDOR prouve que ça bloque. Dans `tests/Functional/Pirb/PirbSeancesIdorTest.php` :

```php
public function testJoueuseNeVoitPasLaSeanceDuneAutreEquipe(): void
{
    // LE test IDOR : une joueuse de l'équipe A tente d'ouvrir la séance
    // de l'équipe B en devinant son {id}. Le serveur doit refuser.
    ...
    $this->client->loginUser($userA, 'pirb');
    $this->get('/seances/' . $seanceB->getId());
    self::assertResponseStatusCodeSame(403);
}
```

Ce sont des tests **fonctionnels** (`WebTestCase`) : de vraies requêtes HTTP traversent le firewall, le routing, le contrôleur et le Voter. Trois techniques mutualisées dans la classe de base `PirbIdorTestCase` : l'appel sur l'hôte `pirb.localhost` (car le firewall PIRB est un firewall **par host**), `loginUser()` pour authentifier sans rejouer le formulaire (on teste l'autorisation, pas le login), et chaque test tourne dans une **transaction annulée** en `tearDown()` — la base de test reste propre.

## Comment je l'explique au jury

Mes tests unitaires prouvent la logique d'autorisation ; mes tests fonctionnels anti-IDOR prouvent le comportement réel de bout en bout : je lance une vraie requête HTTP avec une joueuse authentifiée qui essaie d'ouvrir la séance d'une autre équipe en manipulant l'id dans l'URL, et j'affirme que le serveur répond 403. J'ai choisi de tester le refus parce que c'est là qu'est le risque : un oubli de vérification ne fait planter aucun test « positif ». Cette démarche vient d'un vrai incident : en auditant mes routes, j'ai trouvé une inscription bénévole qui acceptait n'importe quel id de rencontre — je l'ai corrigée et j'ai posé la règle que toute nouvelle route avec un paramètre d'entité doit vérifier l'appartenance. Techniquement, chaque test s'exécute dans une transaction que j'annule à la fin, donc mes tests sont isolés et rejouables.

## La question vicieuse du jury

**« Votre test vérifie une séance. Qu'est-ce qui vous dit que les 87 autres contrôleurs ne sont pas troués ? »**

Rien ne le garantit à 100 %, et je ne prétends pas le contraire. Ma réponse est en trois temps. D'abord la conception : le `ClubVoter` + `ClubAwareInterface` fait que la protection est le chemin par défaut, pas une vérification à réécrire à chaque route ; côté API mobile, il n'y a même **pas de paramètre `{id}`** — chaque endpoint sert le porteur du jeton, l'isolation est par construction (ADR-0010). Ensuite l'audit : j'ai passé les routes PIRB une par une (doc `21_AUDIT_ISOLATION_PIRB`), c'est comme ça que j'ai trouvé la faille SEC-0009. Enfin l'outillage : `PirbIdorTestCase` est justement une classe de base mutualisée pour que chaque nouveau test IDOR ne coûte que le seed et les assertions — étendre cette couverture fait partie de mes priorités de fin de projet.

---
titre: "Tester des règles d'accès sans base de données : une interface en production, un faux en mémoire dans les tests"
projet: "venaball"
bloc: 3
themes: ["tests", "architecture", "securite-applicative"]
source: "src/Service/Annonce/AnnonceAcces.php"
date: 2026-11-18
---

## Le concept

Les annonces du club (17/11/2026) ont des règles d'accès sensibles : un coach n'écrit qu'à ses équipes, un parent lit ce que lit son enfant **mineur**, une joueuse qui quitte l'effectif ne lit plus. Ces règles doivent être testées. Problème : je n'ai pas de base MySQL de test fiable sur mon PC, donc tout ce qui dépend de Doctrine est difficile à tester.

```jeu
{ "type": "devine", "question": "Ta règle a besoin de savoir qui coache quelle équipe, et cette information est en base. Comment tester la règle sans base ?", "reponse": "On sépare la règle de la façon d'obtenir l'information. La règle pose ses questions à une interface. En production, une classe Doctrine répond ; dans le test, une classe qui lit de simples tableaux PHP répond.", "indice": "La règle n'a pas besoin de SQL, elle a besoin de réponses." }
```

La solution tient en trois fichiers. D'abord une **interface** (un contrat : une liste de méthodes sans code) qui décrit ce que les règles ont besoin de savoir :

```php
// src/Service/Annonce/AnnuaireClub.php
interface AnnuaireClub
{
    public function rolesActifs(User $user, Club $club): array;
    public function equipesCoachees(User $user, Club $club, string $saison): array;
    public function joueuses(Equipe $equipe, string $saison): array;
    public function parents(Joueur $joueuse): array;
    public function fiche(User $user): ?Joueur;
    // ...
}
```

Ensuite le service des règles, qui ne connaît que ce contrat :

```php
// src/Service/Annonce/AnnonceAcces.php
public function __construct(private readonly AnnuaireClub $annuaire) {}
```

En production, Symfony injecte `AnnuaireClubDoctrine`, qui fait les vraies requêtes. Dans `tests/Unit/Service/Annonce/AnnonceAccesTest.php`, j'injecte un `FauxAnnuaire` : la même interface, mais des tableaux publics que le test remplit à la main.

```php
$this->annuaire = new FauxAnnuaire();
$this->acces = new AnnonceAcces($this->annuaire);
// ...
public function testUneJoueuseSortieDeLEffectifNeLitPlus(): void
{
    $annonce = $this->annonce(Annonce::CIBLE_EQUIPE, $this->u15);
    self::assertTrue($this->acces->peutLire($this->joueuseMajeure, $annonce));

    $this->annuaire->effectif[15] = [$this->annuaire->fiches[4]]; // elle quitte l'équipe

    self::assertFalse($this->acces->peutLire($this->joueuseMajeure, $annonce));
}
```

Ce principe a un nom : l'**inversion de dépendance** (le D de SOLID). Le code métier ne dépend pas de la base ; il dépend d'un contrat, et la base s'y branche. Le `FauxAnnuaire` est un **fake** : une vraie implémentation, simplifiée, qui tient en mémoire.

```jeu
{ "type": "paires", "consigne": "Relie chaque fichier à son rôle.", "paires": [["AnnuaireClub", "le contrat : les questions que les règles posent"], ["AnnonceAcces", "les règles : qui écrit, qui lit"], ["AnnuaireClubDoctrine", "les réponses en production, par requêtes SQL"], ["FauxAnnuaire", "les réponses dans les tests, par tableaux PHP"]] }
```

Le test ci-dessus montre aussi un choix de conception : les droits sont **calculés à chaque lecture**, pas figés à la publication. Je ne stocke pas « la liste des destinataires de l'annonce 12 ». Je recalcule qui a le droit au moment où quelqu'un ouvre l'annonce. Conséquence voulue : perdre son rôle, c'est perdre l'accès tout de suite, sans tâche de nettoyage à écrire.

Résultat mesuré : 18 tests, verts sur mon PC le 17/11, en moins d'une seconde, sans base.

Sans cette séparation : soit pas de test du tout sur des règles qui protègent des mineures, soit des tests qui exigent une base, donc que je ne lancerais jamais.

## Comment je l'explique au jury

« Les annonces ont des règles d'accès que je ne voulais pas livrer sans test, notamment celles qui concernent les mineures. Comme je n'ai pas de base de test fiable, j'ai séparé les règles de l'accès aux données. Les règles sont dans un service qui pose ses questions à une interface, `AnnuaireClub`. En production c'est une classe Doctrine qui répond, dans les tests c'est un faux annuaire en mémoire que je remplis moi-même. J'ai dix-huit tests qui passent en moins d'une seconde, dont les cas de perte d'accès : une joueuse sortie de l'effectif, un parent dont le lien est rompu. C'est de l'inversion de dépendance, et ici elle a une utilité concrète : rendre testable ce qui ne l'était pas. »

## La question vicieuse du jury

**« Vos tests passent avec un faux annuaire. Qu'est-ce qui prouve que le vrai, celui qui interroge la base, répond la même chose ? »**

Rien, et c'est la limite exacte de cette approche. Mes tests prouvent que les **règles** sont justes à partir de réponses correctes. Ils ne prouvent pas que `AnnuaireClubDoctrine` donne des réponses correctes : une requête qui oublie de filtrer sur le club, ou qui compte un rôle désactivé, passerait à travers. Cette classe n'a aucun test.

Je l'ai d'ailleurs constaté en production : une annonce visant une équipe n'était pas vue par un compte de test. La règle était bonne. La cause probable, non confirmée, est que beaucoup de joueuses n'ont pas d'affectation d'équipe en base, donc la méthode `joueuses()` renvoie un effectif presque vide. Un test unitaire ne peut pas voir ça : c'est un problème de données.

Ce qu'il faudrait : un test d'intégration de `AnnuaireClubDoctrine` sur une base de test (SQLite ou MySQL en CI) avec quelques lignes connues, et un test fonctionnel d'une route d'annonce. Je n'ai ni l'un ni l'autre aujourd'hui, et je le dis.
